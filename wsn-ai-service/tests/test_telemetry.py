import asyncio
import json
import logging

import httpx
import pytest
import respx
from fastapi.testclient import TestClient
from pydantic import SecretStr

from wsn_ai_service.app import create_app
from wsn_ai_service.config import Settings
from wsn_ai_service.llm import Completion
from wsn_ai_service.models import RunRequest
from wsn_ai_service.runtime import AgentRuntime
from wsn_ai_service.telemetry import ObserverLogHandler, OtlpExporter, Span, new_span_ids

OBS = "http://observer.test"


def exporter(client: httpx.AsyncClient | None = None, url: str = OBS, token: str = "tok") -> OtlpExporter:
    return OtlpExporter(url, token, "wsn-ai-service", client=client)


@respx.mock
async def test_export_span_posts_otlp_traces() -> None:
    route = respx.post(f"{OBS}/v1/traces").mock(return_value=httpx.Response(202, json={"accepted": 1}))
    exp = exporter()
    ok = await exp.export_span(
        name="GET /x",
        trace_id="t1",
        span_id="s1",
        parent_span_id="p0",
        start=1.0,
        end=2.0,
        attributes={"http.method": "GET"},
    )
    await exp.aclose()
    assert ok is True
    request = route.calls.last.request
    assert request.headers["Authorization"] == "Bearer tok"
    payload = json.loads(request.content)
    rs = payload["resourceSpans"][0]
    assert rs["resource"]["attributes"][0]["value"]["stringValue"] == "wsn-ai-service"
    span = rs["scopeSpans"][0]["spans"][0]
    assert span["traceId"] == "t1" and span["spanId"] == "s1" and span["parentSpanId"] == "p0"
    assert span["kind"] == 2 and span["status"] == {"code": 1}
    assert span["startTimeUnixNano"] == "1000000000" and span["endTimeUnixNano"] == "2000000000"
    assert span["attributes"] == [{"key": "http.method", "value": {"stringValue": "GET"}}]


@respx.mock
async def test_export_span_minimal_omits_optional_fields() -> None:
    route = respx.post(f"{OBS}/v1/traces").mock(return_value=httpx.Response(202))
    exp = exporter()
    await exp.export_span(name="n", trace_id="t", span_id="s", start=0.0, end=0.0)
    await exp.aclose()
    span = json.loads(route.calls.last.request.content)["resourceSpans"][0]["scopeSpans"][0]["spans"][0]
    assert "parentSpanId" not in span and "attributes" not in span


@respx.mock
async def test_export_log_and_metric_shapes() -> None:
    logs = respx.post(f"{OBS}/v1/logs").mock(return_value=httpx.Response(202))
    metrics = respx.post(f"{OBS}/v1/metrics").mock(return_value=httpx.Response(202))
    exp = exporter()
    log_ok = await exp.export_log(
        severity="ERROR", body="boom", trace_id="t1", span_id="s1", attributes={"logger": "x"}, ts=3.0
    )
    assert log_ok is True
    assert await exp.export_metric("requests", 2, attributes={"http.method": "GET"}, ts=4.0) is True
    assert await exp.export_metric("ratio", 2.5) is True
    await exp.aclose()

    record = json.loads(logs.calls[0].request.content)["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    assert record["severityText"] == "ERROR" and record["severityNumber"] == 17
    assert record["body"] == {"stringValue": "boom"} and record["traceId"] == "t1" and record["spanId"] == "s1"
    assert record["timeUnixNano"] == "3000000000"

    first = json.loads(metrics.calls[0].request.content)["resourceMetrics"][0]["scopeMetrics"][0]["metrics"][0]
    assert first["name"] == "requests" and first["sum"]["dataPoints"][0]["asInt"] == 2
    second = json.loads(metrics.calls[1].request.content)["resourceMetrics"][0]["scopeMetrics"][0]["metrics"][0]
    assert second["sum"]["dataPoints"][0]["asDouble"] == 2.5 and "attributes" not in second["sum"]["dataPoints"][0]


@respx.mock
async def test_export_log_without_trace_omits_ids() -> None:
    logs = respx.post(f"{OBS}/v1/logs").mock(return_value=httpx.Response(202))
    exp = exporter()
    await exp.export_log(severity="INFO", body="hi")
    await exp.aclose()
    record = json.loads(logs.calls[0].request.content)["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    assert "traceId" not in record and "spanId" not in record and "attributes" not in record


@respx.mock
async def test_export_failures_return_false_and_never_raise() -> None:
    respx.post(f"{OBS}/v1/traces").mock(return_value=httpx.Response(500))
    respx.post(f"{OBS}/v1/logs").mock(side_effect=httpx.ConnectError("down"))
    exp = exporter()
    assert await exp.export_span(name="n", trace_id="t", span_id="s", start=0.0, end=1.0) is False
    assert await exp.export_log(severity="INFO", body="b") is False
    await exp.aclose()


async def test_disabled_exporter_is_a_no_op() -> None:
    exp = OtlpExporter("", "tok", "wsn-ai-service")
    assert exp.enabled is False
    assert await exp.export_span(name="n", trace_id="t", span_id="s", start=0.0, end=1.0) is False
    assert await exp.export_log(severity="INFO", body="b") is False
    assert await exp.export_metric("m", 1) is False
    await exp.aclose()


@respx.mock
async def test_span_context_exports_on_exit_and_marks_errors() -> None:
    route = respx.post(f"{OBS}/v1/traces").mock(return_value=httpx.Response(202))
    exp = exporter()
    async with Span(exp, "op", {"k": "v"}) as sp:
        assert sp.trace_id and sp.span_id
    span = json.loads(route.calls[0].request.content)["resourceSpans"][0]["scopeSpans"][0]["spans"][0]
    assert span["name"] == "op" and span["status"] == {"code": 1} and span["traceId"] == sp.trace_id

    with pytest.raises(ValueError):
        async with Span(exp, "bad") as sp2:
            raise ValueError("x")
    await exp.aclose()
    span = json.loads(route.calls[1].request.content)["resourceSpans"][0]["scopeSpans"][0]["spans"][0]
    assert span["status"] == {"code": 2} and span["traceId"] == sp2.trace_id


@respx.mock
async def test_log_handler_ships_records_with_the_active_span() -> None:
    respx.post(f"{OBS}/v1/traces").mock(return_value=httpx.Response(202))
    route = respx.post(f"{OBS}/v1/logs").mock(return_value=httpx.Response(202))
    exp = exporter()
    handler = ObserverLogHandler(exp)
    async with Span(exp, "op") as sp:
        record = logging.LogRecord("wsn_ai_service", logging.WARNING, __file__, 1, "careful", (), None)
        handler.emit(record)
        await asyncio.sleep(0)  # let the created task run
    await exp.aclose()
    assert route.called
    body = json.loads(route.calls.last.request.content)["resourceLogs"][0]["scopeLogs"][0]["logRecords"][0]
    assert body["severityText"] == "WARNING" and body["severityNumber"] == 13
    assert body["body"] == {"stringValue": "careful"}
    assert body["traceId"] == sp.trace_id and body["spanId"] == sp.span_id


def test_log_handler_drops_without_a_running_loop() -> None:
    handler = ObserverLogHandler(exporter())
    record = logging.LogRecord("wsn_ai_service", logging.INFO, __file__, 1, "sync", (), None)
    handler.emit(record)  # no running loop here: must return, not raise


def test_log_handler_disabled() -> None:
    handler = ObserverLogHandler(OtlpExporter("", "", "wsn-ai-service"))
    record = logging.LogRecord("wsn_ai_service", logging.INFO, __file__, 1, "sync", (), None)
    handler.emit(record)


def test_new_span_ids() -> None:
    trace_id, span_id = new_span_ids()
    assert len(trace_id) == 32 and len(span_id) == 16
    assert new_span_ids("fixed")[0] == "fixed"


class OneAnswer:
    async def complete(self, *args: object, **kwargs: object) -> Completion:
        return Completion("Hello from Mistral.", tokens=12)


class NoStreamPlatform:
    async def stream_run_step(self, run_id: str, step: dict[str, object]) -> bool:
        return True


RUN = {
    "runId": "run-1",
    "agent": {"id": "agent-sidekick", "name": "Sidekick", "model": "mistral-medium-latest", "maxToolCallsPerRun": 3},
    "prompt": "Hi",
    "grant": "g",
}


@respx.mock
async def test_agent_run_is_a_span_with_a_token_metric() -> None:
    traces = respx.post(f"{OBS}/v1/traces").mock(return_value=httpx.Response(202))
    metrics = respx.post(f"{OBS}/v1/metrics").mock(return_value=httpx.Response(202))
    runtime = AgentRuntime(OneAnswer(), NoStreamPlatform(), exporter())  # type: ignore[arg-type]
    result = await runtime.run(RunRequest.model_validate(RUN))
    await runtime._exporter.aclose()  # type: ignore[union-attr]

    assert result.status == "completed" and result.tokens == 12
    span = json.loads(traces.calls.last.request.content)["resourceSpans"][0]["scopeSpans"][0]["spans"][0]
    assert span["name"] == "agent.run agent-sidekick"
    attrs = {a["key"]: a["value"]["stringValue"] for a in span["attributes"]}
    assert attrs["run.id"] == "run-1" and attrs["tokens"] == "12" and attrs["status"] == "completed"
    metric = json.loads(metrics.calls.last.request.content)["resourceMetrics"][0]["scopeMetrics"][0]["metrics"][0]
    assert metric["name"] == "agent.run.tokens" and metric["sum"]["dataPoints"][0]["asInt"] == 12


@respx.mock
async def test_agent_run_without_exporter_still_runs() -> None:
    runtime = AgentRuntime(OneAnswer(), NoStreamPlatform())  # type: ignore[arg-type]
    result = await runtime.run(RunRequest.model_validate(RUN))
    assert result.answer == "Hello from Mistral."


@respx.mock
def test_app_middleware_exports_request_telemetry() -> None:
    respx.post(f"{OBS}/v1/traces").mock(return_value=httpx.Response(202))
    respx.post(f"{OBS}/v1/metrics").mock(return_value=httpx.Response(202))
    respx.post(f"{OBS}/v1/logs").mock(return_value=httpx.Response(202))
    internal = "http://localhost:8081"
    respx.get(f"{internal}/internal/v1/mcp/tools").mock(return_value=httpx.Response(200, json={"items": []}))
    settings = Settings(
        ai_service_token=SecretStr("secret"),
        mcp_tool_refresh_seconds=3600,
        observer_url=OBS,
        observer_token=SecretStr("tok"),
    )
    with TestClient(create_app(settings, llm=OneAnswer())) as c:  # type: ignore[arg-type]
        response = c.get("/healthz")
    assert response.status_code == 200
    traces_route = respx.post(f"{OBS}/v1/traces")
    assert traces_route.called
    span = json.loads(traces_route.calls.last.request.content)["resourceSpans"][0]["scopeSpans"][0]["spans"][0]
    attrs = {a["key"]: a["value"]["stringValue"] for a in span["attributes"]}
    assert attrs["http.method"] == "GET" and attrs["http.status_code"] == "200"
    metrics_route = respx.post(f"{OBS}/v1/metrics")
    names = set()
    for call in metrics_route.calls:
        metric = json.loads(call.request.content)["resourceMetrics"][0]["scopeMetrics"][0]["metrics"][0]
        names.add(metric["name"])
    assert names == {"http.server.requests", "http.server.duration_ms"}
