import json

import httpx
import pytest
import respx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

import wsn_ai_service.app as app_module
from wsn_ai_service.app import create_app
from wsn_ai_service.config import Settings, get_settings
from wsn_ai_service.llm import Completion, RequestedCall
from wsn_ai_service.models import DiscoveredTool, DiscoverResult


class OneAnswer:
    async def complete(self, *args: object, **kwargs: object) -> Completion:
        return Completion("Hello from Mistral.", tokens=12)


class ScriptedModel:
    def __init__(self, *completions: Completion) -> None:
        self.completions = list(completions)

    async def complete(self, *args: object, **kwargs: object) -> Completion:
        return self.completions.pop(0)


class PlanAnswer:
    async def complete(self, *args: object, **kwargs: object) -> Completion:
        plan = '{"name":"Leave Tracker","description":"d","ownerDepartmentId":"dep-hr","entities":[{"name":"Leave","label":"Leave","description":"d","fields":[]}],"pages":[]}'
        return Completion(plan, tokens=9)


def client(llm: object = None) -> TestClient:
    settings = Settings(ai_service_token=SecretStr("secret"), mcp_tool_refresh_seconds=3600)
    return TestClient(create_app(settings, llm=llm or OneAnswer()))  # type: ignore[arg-type]


RUN = {
    "runId": "run-1",
    "agent": {"id": "agent-sidekick", "name": "Sidekick", "model": "mistral-medium-latest", "maxToolCallsPerRun": 3},
    "prompt": "Hi",
    "grant": "g",
}


def test_internal_api_requires_the_service_token() -> None:
    with client() as c:
        assert c.post("/v1/runs", json=RUN).status_code == 401
        assert c.post("/v1/runs", json=RUN, headers={"Authorization": "Bearer wrong"}).status_code == 401


def test_run_answers_in_camel_case() -> None:
    with client() as c:
        r = c.post("/v1/runs", json=RUN, headers={"Authorization": "Bearer secret"})
    assert r.status_code == 200
    body = r.json()
    assert body["answer"] == "Hello from Mistral."
    assert body["status"] == "completed"
    assert "durationMs" in body


def test_health_is_open() -> None:
    with client() as c:
        assert c.get("/healthz").json() == {"status": "ok"}


@respx.mock
def test_run_streams_each_step_to_wsn_service_as_it_happens() -> None:
    internal = "http://localhost:8081"
    respx.get(f"{internal}/internal/v1/mcp/tools").mock(return_value=httpx.Response(200, json={"items": []}))
    respx.post(f"{internal}/internal/v1/tools/invoke").mock(
        return_value=httpx.Response(200, json={"outcome": "allowed", "output": {"ok": True}})
    )
    steps_route = respx.post(f"{internal}/internal/v1/runs/run-1/steps").mock(return_value=httpx.Response(204))
    llm = ScriptedModel(
        Completion("Checking stock.", [RequestedCall("c1", "get_items", {"a": 1})], tokens=5),
        Completion("All done.", tokens=3),
    )
    run = {**RUN, "tools": [{"name": "get_items", "description": "d", "inputSchema": {"type": "object"}}]}

    with client(llm) as c:
        r = c.post("/v1/runs", json=run, headers={"Authorization": "Bearer secret"})

    assert r.status_code == 200
    assert r.json()["answer"] == "All done."
    bodies = [json.loads(call.request.content) for call in steps_route.calls]
    assert bodies == [
        {"kind": "thought", "text": "Checking stock."},
        {
            "kind": "tool",
            "call": {
                "tool": "get_items",
                "input": {"a": 1},
                "outcome": "allowed",
                "output": {"ok": True},
                "reason": None,
            },
        },
    ]
    assert all(call.request.headers["Authorization"] == "Bearer secret" for call in steps_route.calls)


def test_unknown_v1_routes_answer_501_in_the_platform_error_shape() -> None:
    with client() as c:
        r = c.get("/v1/agents", headers={"Authorization": "Bearer secret"})
        assert r.status_code == 501
        assert r.json() == {"status": 501, "code": "INVALID_STATE", "message": "GET /v1/agents is not available yet"}
        assert c.get("/v1/agents").json()["code"] == "UNAUTHENTICATED"


def test_plan_returns_the_architect_plan() -> None:
    with client(PlanAnswer()) as c:
        r = c.post("/v1/plans", json={"prompt": "Track leave"}, headers={"Authorization": "Bearer secret"})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Leave Tracker"
    assert body["operations"] == [] and body["workflows"] == [] and body["permissions"] == []


def test_plan_answers_502_when_the_model_returns_garbage() -> None:
    with client() as c:  # OneAnswer answers with plain text, which is not a plan
        r = c.post("/v1/plans", json={"prompt": "x"}, headers={"Authorization": "Bearer secret"})
    assert r.status_code == 502
    assert "unusable plan" in r.json()["message"]


EDIT = {
    "prompt": "Add an approval step",
    "current": {"name": "Leave Tracker", "entities": [], "pages": []},
    "departments": ["dep-hr"],
    "existingEntities": ["Employee"],
    "problems": ["old problem"],
}


def test_plan_edit_returns_the_revised_plan() -> None:
    with client(PlanAnswer()) as c:
        r = c.post("/v1/plans/edit", json=EDIT, headers={"Authorization": "Bearer secret"})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Leave Tracker"
    assert body["prompt"] == "Add an approval step"
    assert body["operations"] == []


def test_plan_edit_answers_502_when_the_model_returns_garbage() -> None:
    with client() as c:
        r = c.post("/v1/plans/edit", json=EDIT, headers={"Authorization": "Bearer secret"})
    assert r.status_code == 502
    assert "unusable plan" in r.json()["message"]


def test_plan_edit_requires_the_service_token() -> None:
    with client(PlanAnswer()) as c:
        assert c.post("/v1/plans/edit", json=EDIT).status_code == 401


def test_discover_returns_the_external_servers_tools(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_discover(req: object) -> DiscoverResult:
        return DiscoverResult(tools=[DiscoveredTool(name="get_items", description="d")])

    monkeypatch.setattr(app_module, "discover", fake_discover)
    with client() as c:
        r = c.post(
            "/v1/mcp/discover", json={"url": "http://mcp.example/mcp"}, headers={"Authorization": "Bearer secret"}
        )
    assert r.status_code == 200
    assert r.json()["tools"] == [{"name": "get_items", "description": "d"}]


def test_discover_answers_502_when_the_server_cannot_be_listed(monkeypatch: pytest.MonkeyPatch) -> None:
    async def boom(req: object) -> DiscoverResult:
        raise RuntimeError("connection refused")

    monkeypatch.setattr(app_module, "discover", boom)
    with client() as c:
        r = c.post(
            "/v1/mcp/discover", json={"url": "http://mcp.example/mcp"}, headers={"Authorization": "Bearer secret"}
        )
    assert r.status_code == 502
    assert "Could not list tools at http://mcp.example/mcp" in r.json()["message"]


def test_get_settings_reads_the_environment() -> None:
    get_settings.cache_clear()
    assert get_settings().port == 8090


def test_main_builds_the_app_and_runs_uvicorn(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: dict[str, object] = {}
    monkeypatch.setattr(app_module.uvicorn, "run", lambda *a, **k: calls.update(app=a[0], kwargs=k))
    app_module.main()
    assert isinstance(calls["app"], FastAPI)
    assert calls["kwargs"] == {"host": "0.0.0.0", "port": 8090, "log_level": "info"}
