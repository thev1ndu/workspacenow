import json

import httpx
import pytest
import respx

from wsn_ai_service.platform import PlatformClient, _message

INTERNAL = "http://internal.test"


def client() -> PlatformClient:
    # The trailing slash on the API url exercises the rstrip in the constructor.
    return PlatformClient(INTERNAL, "http://api.test/", "service-token")


@respx.mock
async def test_invoke_with_grant_posts_the_grant_and_the_call() -> None:
    route = respx.post(f"{INTERNAL}/internal/v1/tools/invoke").mock(
        return_value=httpx.Response(200, json={"outcome": "allowed", "output": {"ok": True}})
    )
    c = client()
    outcome = await c.invoke_with_grant("grant-1", "get_items", {"a": 1})
    await c.close()

    assert outcome.outcome == "allowed"
    assert outcome.output == {"ok": True}
    request = route.calls.last.request
    assert request.headers["Authorization"] == "Bearer grant-1"
    assert json.loads(request.content) == {"tool": "get_items", "input": {"a": 1}}


@respx.mock
async def test_invoke_as_user_forwards_the_user_token() -> None:
    route = respx.post(f"{INTERNAL}/internal/v1/mcp/invoke").mock(
        return_value=httpx.Response(200, json={"outcome": "denied", "reason": "lacks procurement.approve"})
    )
    c = client()
    outcome = await c.invoke_as_user("Bearer user-token", "approve", {})
    await c.close()

    assert (outcome.outcome, outcome.reason) == ("denied", "lacks procurement.approve")
    headers = route.calls.last.request.headers
    assert headers["Authorization"] == "Bearer service-token"
    assert headers["X-Forwarded-Authorization"] == "Bearer user-token"


@respx.mock
async def test_error_status_uses_the_platform_error_message() -> None:
    respx.post(f"{INTERNAL}/internal/v1/tools/invoke").mock(return_value=httpx.Response(500, json={"message": "boom"}))
    outcome = await client().invoke_with_grant("g", "t", {})
    assert outcome.outcome == "error"
    assert outcome.reason == "boom"


@respx.mock
async def test_error_status_with_a_non_json_body_falls_back_to_the_text() -> None:
    respx.post(f"{INTERNAL}/internal/v1/tools/invoke").mock(return_value=httpx.Response(500, text="gateway exploded"))
    outcome = await client().invoke_with_grant("g", "t", {})
    assert outcome.reason == "gateway exploded"


@respx.mock
async def test_unreachable_platform_is_an_error_outcome_not_a_crash() -> None:
    respx.post(f"{INTERNAL}/internal/v1/tools/invoke").mock(side_effect=httpx.ConnectError("refused"))
    outcome = await client().invoke_with_grant("g", "t", {})
    assert outcome.outcome == "error"
    assert "unreachable" in (outcome.reason or "")


def test_message_with_an_empty_body_names_the_status_code() -> None:
    assert _message(httpx.Response(503, text="")) == "wsn-service answered 503"


@respx.mock
async def test_stream_run_step_posts_the_step_with_the_service_token() -> None:
    route = respx.post(f"{INTERNAL}/internal/v1/runs/run-9/steps").mock(return_value=httpx.Response(204))
    c = client()
    ok = await c.stream_run_step("run-9", {"kind": "thought", "text": "thinking"})
    await c.close()

    assert ok is True
    request = route.calls.last.request
    assert request.headers["Authorization"] == "Bearer service-token"
    assert json.loads(request.content) == {"kind": "thought", "text": "thinking"}


@respx.mock
async def test_stream_run_step_refused_by_the_platform_is_not_an_error() -> None:
    respx.post(f"{INTERNAL}/internal/v1/runs/run-9/steps").mock(
        return_value=httpx.Response(409, json={"message": "unknown run"})
    )
    ok = await client().stream_run_step("run-9", {"kind": "thought", "text": "x"})
    assert ok is False


@respx.mock
async def test_stream_run_step_with_the_platform_down_is_not_an_error() -> None:
    respx.post(f"{INTERNAL}/internal/v1/runs/run-9/steps").mock(side_effect=httpx.ConnectError("refused"))
    ok = await client().stream_run_step("run-9", {"kind": "thought", "text": "x"})
    assert ok is False


@respx.mock
async def test_tool_catalogue_keeps_only_workspacenow_tools() -> None:
    route = respx.get(f"{INTERNAL}/internal/v1/mcp/tools").mock(
        return_value=httpx.Response(
            200,
            json={
                "items": [
                    {"name": "get_items", "source": "workspacenow"},
                    {"name": "ext_tool", "source": "external"},
                ]
            },
        )
    )
    c = client()
    items = await c.tool_catalogue()
    await c.close()

    assert [t["name"] for t in items] == ["get_items"]
    assert route.calls.last.request.headers["Authorization"] == "Bearer service-token"


@respx.mock
async def test_tool_catalogue_raises_on_an_error_status() -> None:
    respx.get(f"{INTERNAL}/internal/v1/mcp/tools").mock(return_value=httpx.Response(500, text="no"))
    with pytest.raises(httpx.HTTPStatusError):
        await client().tool_catalogue()
