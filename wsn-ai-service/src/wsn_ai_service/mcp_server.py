import asyncio
import json
import logging
from typing import Any

from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_headers
from fastmcp.tools import Tool, ToolResult
from pydantic import PrivateAttr

from .platform import PlatformClient

log = logging.getLogger(__name__)


class PlatformTool(Tool):
    # One API operation exposed as an MCP tool; calls run in wsn-service as the MCP client's user.
    _platform: PlatformClient | None = PrivateAttr(default=None)

    async def run(self, arguments: dict[str, Any]) -> ToolResult:
        token = get_http_headers(include={"authorization"}).get("authorization", "")
        if not token or self._platform is None:
            return ToolResult(content="Sign in to WorkspaceNow and send its access token.", is_error=True)
        outcome = await self._platform.invoke_as_user(token, self.name, arguments)
        if outcome.outcome != "allowed":
            return ToolResult(content=outcome.reason or f"{self.name} was {outcome.outcome}", is_error=True)
        structured = outcome.output if isinstance(outcome.output, dict) else {"result": outcome.output}
        return ToolResult(content=json.dumps(outcome.output, default=str), structured_content=structured)


def platform_tool(platform: PlatformClient, spec: dict[str, Any]) -> PlatformTool:
    tool = PlatformTool(
        name=spec["name"],
        description=spec.get("description", ""),
        parameters=spec.get("inputSchema") or {"type": "object", "properties": {}},
    )
    tool._platform = platform
    return tool


def build_server() -> FastMCP:
    return FastMCP(
        name="workspacenow",
        instructions="WorkspaceNow business operations. Every call runs as you and is authorized and audited.",
    )


async def sync_tools(server: FastMCP, platform: PlatformClient) -> None:
    # Mirrors the API operations wsn-service exposes as MCP tools, adding new ones and dropping withdrawn ones.
    wanted = {t["name"]: t for t in await platform.tool_catalogue()}
    current = {t.name for t in await server.list_tools()}
    for name in current - wanted.keys():
        server.local_provider.remove_tool(name)
    for name, spec in wanted.items():
        if name not in current:
            server.add_tool(platform_tool(platform, spec))


async def keep_tools_in_sync(server: FastMCP, platform: PlatformClient, every_seconds: int) -> None:
    while True:
        try:
            await sync_tools(server, platform)
        except Exception:
            log.warning("could not refresh the MCP tool catalogue from wsn-service", exc_info=True)
        await asyncio.sleep(every_seconds)
