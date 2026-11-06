from fastapi.testclient import TestClient
from pydantic import SecretStr

from wsn_ai_service.app import create_app
from wsn_ai_service.config import Settings
from wsn_ai_service.llm import Completion


class OneAnswer:
    async def complete(self, *args: object, **kwargs: object) -> Completion:
        return Completion("Hello from Mistral.", tokens=12)


def client() -> TestClient:
    settings = Settings(ai_service_token=SecretStr("secret"), mcp_tool_refresh_seconds=3600)
    return TestClient(create_app(settings, llm=OneAnswer()))  # type: ignore[arg-type]


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


def test_unknown_v1_routes_answer_501_in_the_platform_error_shape() -> None:
    with client() as c:
        r = c.get("/v1/agents", headers={"Authorization": "Bearer secret"})
        assert r.status_code == 501
        assert r.json() == {"status": 501, "code": "INVALID_STATE", "message": "GET /v1/agents is not available yet"}
        assert c.get("/v1/agents").json()["code"] == "UNAUTHENTICATED"
