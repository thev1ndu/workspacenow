import asyncio
import contextlib
import hmac
import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Annotated, Any

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from .config import Settings, get_settings
from .discovery import discover
from .llm import ChatModel, MistralChat
from .mcp_server import build_server, keep_tools_in_sync
from .models import DiscoverRequest, DiscoverResult, PlanRequest, RunRequest, RunResult
from .planner import Planner
from .platform import PlatformClient
from .runtime import AgentRuntime
from .telemetry import ObserverLogHandler, OtlpExporter, Span

log = logging.getLogger("wsn_ai_service")


def create_app(
    settings: Settings | None = None,
    llm: ChatModel | None = None,
    platform: PlatformClient | None = None,
    exporter: OtlpExporter | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    platform = platform or PlatformClient(
        settings.platform_internal_url,
        settings.platform_api_url,
        settings.ai_service_token.get_secret_value(),
        timeout=settings.request_timeout_seconds,
    )
    llm = llm or MistralChat(settings)
    exporter = exporter or OtlpExporter(
        settings.observer_url,
        settings.observer_token.get_secret_value(),
        settings.observer_service_name,
    )
    runtime = AgentRuntime(llm, platform, exporter)
    planner = Planner(llm, settings.planner_model)
    mcp = build_server()
    mcp_app = mcp.http_app(path="/", stateless_http=True, json_response=True)

    @contextlib.asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        sync = asyncio.create_task(keep_tools_in_sync(mcp, platform, settings.mcp_tool_refresh_seconds))
        service_log = logging.getLogger("wsn_ai_service")
        log_handler = ObserverLogHandler(exporter)
        service_log.addHandler(log_handler)
        async with mcp_app.lifespan(mcp_app):
            yield
        service_log.removeHandler(log_handler)
        sync.cancel()
        await platform.close()
        await exporter.aclose()

    app = FastAPI(title="wsn-ai-service", lifespan=lifespan)

    def require_service_token(authorization: Annotated[str, Header()] = "") -> None:
        expected = settings.ai_service_token.get_secret_value()
        presented = authorization.removeprefix("Bearer ")
        if not expected or not hmac.compare_digest(presented, expected):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This API is for wsn-service only")

    internal = [Depends(require_service_token)]

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.middleware("http")
    async def export_request_telemetry(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # One span plus request-count and duration metrics per request, exported to wsn-observer.
        if not exporter.enabled:
            return await call_next(request)
        async with Span(
            exporter,
            f"{request.method} {request.url.path}",
            {"http.method": request.method, "http.path": request.url.path},
        ) as sp:
            response = await call_next(request)
            sp.attributes["http.status_code"] = str(response.status_code)
        await exporter.export_metric(
            "http.server.requests",
            1,
            attributes={"http.method": request.method, "http.status_code": sp.attributes["http.status_code"]},
        )
        await exporter.export_metric(
            "http.server.duration_ms",
            (time.time() - sp.start) * 1000,
            type="histogram",
            attributes={"http.method": request.method},
        )
        return response

    @app.post("/v1/runs", dependencies=internal, response_model_by_alias=True)
    async def run_agent(req: RunRequest) -> RunResult:
        return await runtime.run(req)

    @app.post("/v1/plans", dependencies=internal)
    async def plan_application(req: PlanRequest) -> dict[str, Any]:
        try:
            return await planner.plan(req)
        except ValueError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"The model returned an unusable plan: {exc}") from exc

    @app.post("/v1/mcp/discover", dependencies=internal, response_model_by_alias=True)
    async def discover_tools(req: DiscoverRequest) -> DiscoverResult:
        try:
            return await discover(req)
        except Exception as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Could not list tools at {req.url}: {exc}") from exc

    @app.exception_handler(HTTPException)
    async def error_body(_: Request, exc: HTTPException) -> JSONResponse:
        # Errors use the platform's ErrorBody shape, so wsn-service reports them like its own.
        code = ERROR_CODES.get(exc.status_code, "INVALID_STATE")
        return JSONResponse(
            {"status": exc.status_code, "code": code, "message": exc.detail}, status_code=exc.status_code
        )

    # Any /v1 route this service does not serve yet answers 501, like wsn-service's unimplemented fallback.
    @app.api_route("/v1/{rest:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], dependencies=internal)
    async def unimplemented(request: Request) -> JSONResponse:
        message = f"{request.method} {request.url.path} is not available yet"
        return JSONResponse({"status": 501, "code": "INVALID_STATE", "message": message}, status_code=501)

    app.mount("/mcp", mcp_app)
    return app


ERROR_CODES = {
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_FAILED",
}


def main() -> None:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    uvicorn.run(create_app(settings), host="0.0.0.0", port=settings.port, log_level=settings.log_level.lower())


if __name__ == "__main__":  # pragma: no cover
    main()
