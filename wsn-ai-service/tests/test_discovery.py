from typing import Any

import pytest

from wsn_ai_service import discovery
from wsn_ai_service.models import DiscoverRequest


class FakeClient:
    instances: list["FakeClient"] = []

    def __init__(self, url: str, auth: Any = None, timeout: Any = None) -> None:
        self.url = url
        self.auth = auth
        self.timeout = timeout
        FakeClient.instances.append(self)

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    async def list_tools(self) -> list[Any]:
        tool = type("T", (), {})
        first, second = tool(), tool()
        first.name, first.description = "get_items", None
        second.name, second.description = "approve", "Approve it"
        return [first, second]


async def test_discover_lists_tools_and_sends_the_token(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeClient.instances.clear()
    monkeypatch.setattr(discovery, "Client", FakeClient)

    result = await discovery.discover(DiscoverRequest(url="http://mcp.example/mcp", auth="api-key", token="tok"))

    assert FakeClient.instances[0].url == "http://mcp.example/mcp"
    assert FakeClient.instances[0].auth == "tok"
    assert FakeClient.instances[0].timeout == discovery.DISCOVERY_TIMEOUT_SECONDS
    assert [(t.name, t.description) for t in result.tools] == [("get_items", ""), ("approve", "Approve it")]


async def test_discover_without_auth_sends_no_token(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeClient.instances.clear()
    monkeypatch.setattr(discovery, "Client", FakeClient)

    await discovery.discover(DiscoverRequest(url="http://mcp.example/mcp"))

    assert FakeClient.instances[0].auth is None
