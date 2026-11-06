from typing import Any

from wsn_ai_service import mcp_server
from wsn_ai_service.mcp_server import PlatformTool, build_server, platform_tool, sync_tools
from wsn_ai_service.platform import ToolOutcome


class FakePlatform:
    def __init__(self, outcomes: dict[str, ToolOutcome] | None = None, catalogue: list[dict[str, Any]] | None = None):
        self.outcomes = outcomes or {}
        self.catalogue = catalogue or []
        self.user_calls: list[tuple[str, str, dict[str, Any]]] = []

    async def invoke_as_user(self, token: str, tool: str, arguments: dict[str, Any]) -> ToolOutcome:
        self.user_calls.append((token, tool, arguments))
        return self.outcomes.get(tool, ToolOutcome("allowed", {"ok": True}))

    async def tool_catalogue(self) -> list[dict[str, Any]]:
        return self.catalogue


def _headers(monkeypatch, value: dict[str, str]) -> None:
    monkeypatch.setattr(mcp_server, "get_http_headers", lambda include=None: value)


def _text(result: Any) -> str:
    content = result.content
    return content[0].text if isinstance(content, list) else content


async def test_platform_tool_requires_a_signed_in_caller(monkeypatch) -> None:
    _headers(monkeypatch, {})
    tool = platform_tool(FakePlatform(), {"name": "get_items"})
    result = await tool.run({})
    assert result.is_error
    assert "Sign in" in _text(result)


async def test_platform_tool_without_a_platform_client_is_an_error(monkeypatch) -> None:
    _headers(monkeypatch, {"authorization": "Bearer user-1"})
    result = await PlatformTool(name="get_items", parameters={"type": "object"}).run({})
    assert result.is_error


async def test_platform_tool_allowed_returns_structured_output(monkeypatch) -> None:
    _headers(monkeypatch, {"authorization": "Bearer user-1"})
    platform = FakePlatform({"get_items": ToolOutcome("allowed", {"items": [1]})})
    tool = platform_tool(platform, {"name": "get_items", "description": "d", "inputSchema": {"type": "object"}})

    result = await tool.run({"a": 1})

    assert not result.is_error
    assert result.structured_content == {"items": [1]}
    assert platform.user_calls == [("Bearer user-1", "get_items", {"a": 1})]


async def test_platform_tool_wraps_a_non_dict_output(monkeypatch) -> None:
    _headers(monkeypatch, {"authorization": "Bearer user-1"})
    platform = FakePlatform({"count": ToolOutcome("allowed", 3)})
    tool = platform_tool(platform, {"name": "count"})

    result = await tool.run({})

    assert result.structured_content == {"result": 3}


async def test_platform_tool_denied_is_an_error_with_the_reason(monkeypatch) -> None:
    _headers(monkeypatch, {"authorization": "Bearer user-1"})
    platform = FakePlatform({"approve": ToolOutcome("denied", reason="lacks procurement.approve")})
    tool = platform_tool(platform, {"name": "approve"})

    result = await tool.run({})

    assert result.is_error
    assert _text(result) == "lacks procurement.approve"


async def test_sync_tools_adds_new_and_removes_withdrawn_tools() -> None:
    server = build_server()
    # PlatformClient.tool_catalogue already filters to source == "workspacenow" (see test_platform.py).
    platform = FakePlatform(
        catalogue=[
            {"name": "get_items", "source": "workspacenow", "description": "d", "inputSchema": {"type": "object"}}
        ]
    )
    server.add_tool(platform_tool(platform, {"name": "old_tool"}))

    await sync_tools(server, platform)

    assert {t.name for t in await server.list_tools()} == {"get_items"}
