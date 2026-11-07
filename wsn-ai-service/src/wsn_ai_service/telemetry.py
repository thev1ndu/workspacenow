"""OTLP/HTTP JSON export to wsn-observer: request/agent spans, log records, metric points."""

import asyncio
import contextvars
import logging
import time
import uuid
from typing import Any

import httpx

log = logging.getLogger(__name__)

_current_span: contextvars.ContextVar[tuple[str, str] | None] = contextvars.ContextVar("wsn_span", default=None)

SEVERITY_NUMBERS = {"DEBUG": 5, "INFO": 9, "WARNING": 13, "WARN": 13, "ERROR": 17, "CRITICAL": 21}


def new_span_ids(trace_id: str | None = None) -> tuple[str, str]:
    return (trace_id or uuid.uuid4().hex, uuid.uuid4().hex[:16])


def _nano(ts: float) -> str:
    return str(int(ts * 1_000_000_000))


def _attrs(attributes: dict[str, Any] | None) -> list[dict[str, Any]]:
    return [{"key": k, "value": {"stringValue": str(v)}} for k, v in (attributes or {}).items()]


def _resource(service: str) -> dict[str, Any]:
    return {"attributes": [{"key": "service.name", "value": {"stringValue": service}}]}


class OtlpExporter:
    """Posts OTLP/HTTP JSON to wsn-observer; disabled when the URL is empty. Never raises."""

    def __init__(self, base_url: str, token: str, service_name: str, client: httpx.AsyncClient | None = None) -> None:
        self._base_url = base_url.rstrip("/")
        self._token = token
        self._service = service_name
        self._client = client or (httpx.AsyncClient(timeout=5.0) if self.enabled else None)

    @property
    def enabled(self) -> bool:
        return bool(self._base_url)

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()

    async def export_span(
        self,
        *,
        name: str,
        trace_id: str,
        span_id: str,
        parent_span_id: str = "",
        kind: int = 2,
        status: int = 1,
        start: float,
        end: float,
        attributes: dict[str, Any] | None = None,
    ) -> bool:
        span: dict[str, Any] = {
            "traceId": trace_id,
            "spanId": span_id,
            "name": name,
            "kind": kind,
            "startTimeUnixNano": _nano(start),
            "endTimeUnixNano": _nano(end),
            "status": {"code": status},
        }
        if parent_span_id:
            span["parentSpanId"] = parent_span_id
        attrs = _attrs(attributes)
        if attrs:
            span["attributes"] = attrs
        payload = {"resourceSpans": [{"resource": _resource(self._service), "scopeSpans": [{"spans": [span]}]}]}
        return await self._post("/v1/traces", payload)

    async def export_log(
        self,
        *,
        severity: str,
        body: str,
        trace_id: str = "",
        span_id: str = "",
        attributes: dict[str, Any] | None = None,
        ts: float | None = None,
    ) -> bool:
        record: dict[str, Any] = {
            "timeUnixNano": _nano(ts if ts is not None else time.time()),
            "severityText": severity,
            "severityNumber": SEVERITY_NUMBERS.get(severity.upper(), 9),
            "body": {"stringValue": body},
        }
        if trace_id:
            record["traceId"] = trace_id
        if span_id:
            record["spanId"] = span_id
        attrs = _attrs(attributes)
        if attrs:
            record["attributes"] = attrs
        payload = {"resourceLogs": [{"resource": _resource(self._service), "scopeLogs": [{"logRecords": [record]}]}]}
        return await self._post("/v1/logs", payload)

    async def export_metric(
        self,
        name: str,
        value: float,
        *,
        type: str = "sum",
        attributes: dict[str, Any] | None = None,
        ts: float | None = None,
    ) -> bool:
        point: dict[str, Any] = {"timeUnixNano": _nano(ts if ts is not None else time.time())}
        if float(value).is_integer():
            point["asInt"] = int(value)
        else:
            point["asDouble"] = value
        attrs = _attrs(attributes)
        if attrs:
            point["attributes"] = attrs
        metric: dict[str, Any] = {"name": name, type: {"dataPoints": [point]}}
        payload = {"resourceMetrics": [{"resource": _resource(self._service), "scopeMetrics": [{"metrics": [metric]}]}]}
        return await self._post("/v1/metrics", payload)

    async def _post(self, path: str, payload: dict[str, Any]) -> bool:
        if not self.enabled or self._client is None:
            return False
        headers = {"Authorization": f"Bearer {self._token}"} if self._token else None
        try:
            response = await self._client.post(self._base_url + path, json=payload, headers=headers)
        except httpx.HTTPError:
            log.debug("observer export to %s failed", path, exc_info=True)
            return False
        return response.status_code in (200, 202)


class Span:
    """One SERVER span; exported to the observer when the context exits, error status on exception."""

    def __init__(
        self,
        exporter: OtlpExporter,
        name: str,
        attributes: dict[str, Any] | None = None,
        trace_id: str | None = None,
    ) -> None:
        self.exporter = exporter
        self.name = name
        self.attributes = attributes if attributes is not None else {}
        self.trace_id, self.span_id = new_span_ids(trace_id)
        self.status = 1
        self.start = 0.0
        self._token: contextvars.Token[tuple[str, str] | None] | None = None

    async def __aenter__(self) -> "Span":
        self.start = time.time()
        self._token = _current_span.set((self.trace_id, self.span_id))
        return self

    async def __aexit__(self, exc_type: object, exc: object, tb: object) -> None:
        if exc_type is not None:
            self.status = 2
        if self._token is not None:
            _current_span.reset(self._token)
        await self.exporter.export_span(
            name=self.name,
            trace_id=self.trace_id,
            span_id=self.span_id,
            status=self.status,
            start=self.start,
            end=time.time(),
            attributes=self.attributes,
        )


class ObserverLogHandler(logging.Handler):
    """Ships log records to the observer as OTLP logs, linked to the active span when there is one."""

    def __init__(self, exporter: OtlpExporter) -> None:
        super().__init__()
        self._exporter = exporter

    def emit(self, record: logging.LogRecord) -> None:
        if not self._exporter.enabled:
            return
        span = _current_span.get()
        trace_id, span_id = span if span else ("", "")
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return  # no running loop (startup, sync tests): drop instead of blocking
        loop.create_task(
            self._exporter.export_log(
                severity=record.levelname,
                body=record.getMessage(),
                trace_id=trace_id,
                span_id=span_id,
                attributes={"logger": record.name},
                ts=record.created,
            )
        )
