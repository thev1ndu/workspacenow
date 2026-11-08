import logging
from dataclasses import dataclass
from typing import Any

import httpx

from .models import Outcome

log = logging.getLogger(__name__)


@dataclass
class ToolOutcome:
    outcome: Outcome
    output: Any = None
    reason: str | None = None


class PlatformClient:
    # Talks to wsn-service, which authorizes, runs and audits every tool call; this service never decides.

    def __init__(self, internal_url: str, api_url: str, service_token: str, timeout: float = 30.0) -> None:
        self._internal = httpx.AsyncClient(base_url=internal_url.rstrip("/"), timeout=timeout)
        self._api = httpx.AsyncClient(base_url=api_url.rstrip("/"), timeout=timeout)
        self._service_token = service_token

    async def close(self) -> None:
        await self._internal.aclose()
        await self._api.aclose()

    async def invoke_with_grant(self, grant: str, tool: str, arguments: dict[str, Any]) -> ToolOutcome:
        return await self._invoke(
            "/internal/v1/tools/invoke", {"Authorization": f"Bearer {grant}"}, {"tool": tool, "input": arguments}
        )

    async def invoke_as_user(self, user_token: str, tool: str, arguments: dict[str, Any]) -> ToolOutcome:
        headers = {"Authorization": f"Bearer {self._service_token}", "X-Forwarded-Authorization": user_token}
        return await self._invoke("/internal/v1/mcp/invoke", headers, {"tool": tool, "input": arguments})

    async def _invoke(self, path: str, headers: dict[str, str], body: dict[str, Any]) -> ToolOutcome:
        try:
            response = await self._internal.post(path, headers=headers, json=body)
        except httpx.HTTPError as exc:
            return ToolOutcome("error", reason=f"wsn-service is unreachable: {exc}")
        if response.status_code >= 400:
            return ToolOutcome("error", reason=_message(response))
        payload = response.json()
        return ToolOutcome(payload.get("outcome", "error"), payload.get("output"), payload.get("reason"))

    async def stream_run_step(self, run_id: str, step: dict[str, Any]) -> bool:
        # Reports one AgentRunStep to wsn-service as it happens, so it can emit the AgentRun.Step event.
        try:
            response = await self._internal.post(
                f"/internal/v1/runs/{run_id}/steps",
                headers={"Authorization": f"Bearer {self._service_token}"},
                json=step,
            )
        except httpx.HTTPError as exc:
            log.warning("could not stream a step of run %s: %s", run_id, exc)
            return False
        if response.status_code >= 400:
            log.warning(
                "wsn-service answered %s for a step of run %s: %s", response.status_code, run_id, _message(response)
            )
            return False
        return True

    async def tool_catalogue(self) -> list[dict[str, Any]]:
        response = await self._internal.get(
            "/internal/v1/mcp/tools", headers={"Authorization": f"Bearer {self._service_token}"}
        )
        response.raise_for_status()
        items: list[dict[str, Any]] = response.json().get("items", [])
        return [t for t in items if t.get("source") == "workspacenow"]


def _message(response: httpx.Response) -> str:
    try:
        return str(response.json().get("message", response.text))
    except ValueError:
        return response.text or f"wsn-service answered {response.status_code}"
