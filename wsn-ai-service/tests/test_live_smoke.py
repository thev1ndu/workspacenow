"""Live smoke test against the real Mistral API.

Opt in with MISTRAL_API_KEY (never run in the offline unit-test gate):

    MISTRAL_API_KEY=... AI_SERVICE_TOKEN=... pytest tests/test_live_smoke.py -v

CI runs this file only when the MISTRAL_API_KEY secret is configured
(.github/workflows/wsn-ai-service.yaml, job live-smoke).
"""

import os
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from wsn_ai_service.app import create_app
from wsn_ai_service.config import Settings
from wsn_ai_service.llm import MistralChat

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(not os.environ.get("MISTRAL_API_KEY"), reason="opt in with MISTRAL_API_KEY"),
]

RUN = {
    "runId": "live-smoke-1",
    "agent": {"id": "agent-smoke", "name": "Smoke", "model": "mistral-medium-latest", "maxToolCallsPerRun": 2},
    "prompt": "Reply with the single word: pong",
    "grant": "live-grant",
    "tools": [],  # no tools: the smoke test needs no wsn-service
}


class OfflinePlatform:
    # Stands in for wsn-service: the smoke agent has no tools, so nothing may be invoked or streamed.
    def __init__(self) -> None:
        self.streamed: list[dict[str, Any]] = []

    async def close(self) -> None:
        return None

    async def tool_catalogue(self) -> list[dict[str, Any]]:
        return []

    async def invoke_with_grant(self, grant: str, tool: str, arguments: dict[str, Any]) -> Any:
        raise AssertionError(f"the smoke agent has no tools, but {tool} was invoked")

    async def stream_run_step(self, run_id: str, step: dict[str, Any]) -> bool:
        self.streamed.append(step)
        return True


def test_live_run_over_http_answers_with_a_token_count() -> None:
    token = os.environ.get("AI_SERVICE_TOKEN", "live-smoke-token")
    settings = Settings(
        mistral_api_key=SecretStr(os.environ["MISTRAL_API_KEY"]),
        ai_service_token=SecretStr(token),
        mcp_tool_refresh_seconds=3600,  # the stub platform serves an empty catalogue, then sleeps
    )
    app = create_app(settings, llm=MistralChat(settings), platform=OfflinePlatform())  # type: ignore[arg-type]

    with TestClient(app) as c:
        unauthenticated = c.post("/v1/runs", json=RUN)
        r = c.post("/v1/runs", json=RUN, headers={"Authorization": f"Bearer {token}"})

    assert unauthenticated.status_code == 401
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "completed"
    assert "pong" in body["answer"].lower()
    assert body["tokens"] > 0
    assert isinstance(body["durationMs"], int)
