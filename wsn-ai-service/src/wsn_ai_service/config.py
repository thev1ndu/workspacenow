from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8090
    log_level: str = "INFO"

    # Shared secret wsn-service presents on the internal API (/v1/...).
    ai_service_token: SecretStr = Field(default=SecretStr(""))

    # wsn-service endpoints: the internal API takes tool calls, the public API serves the MCP catalogue.
    platform_internal_url: str = "http://localhost:8081"
    platform_api_url: str = "http://localhost:8080"

    mistral_api_key: SecretStr = Field(default=SecretStr(""))
    mistral_server_url: str | None = None
    default_model: str = "mistral-medium-latest"
    planner_model: str = "mistral-large-latest"
    request_timeout_seconds: float = 60.0

    mcp_tool_refresh_seconds: int = 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
