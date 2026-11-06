import json
from dataclasses import dataclass, field
from typing import Any, Protocol

from mistralai.client import Mistral
from mistralai.client.models import JSONSchema, ResponseFormat

from .config import Settings

Message = dict[str, Any]


@dataclass
class RequestedCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class Completion:
    content: str
    tool_calls: list[RequestedCall] = field(default_factory=list)
    tokens: int = 0


class ChatModel(Protocol):
    async def complete(
        self,
        model: str,
        messages: list[Message],
        tools: list[dict[str, Any]] | None = None,
        json_schema: dict[str, Any] | None = None,
    ) -> Completion: ...


def _arguments(raw: Any) -> dict[str, Any]:
    # Mistral returns arguments as a JSON string or an object depending on the model.
    if isinstance(raw, dict):
        return raw
    try:
        parsed = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


class MistralChat:
    def __init__(self, settings: Settings) -> None:
        self._client = Mistral(
            api_key=settings.mistral_api_key.get_secret_value(),
            server_url=settings.mistral_server_url,
            timeout_ms=int(settings.request_timeout_seconds * 1000),
        )

    async def complete(
        self,
        model: str,
        messages: list[Message],
        tools: list[dict[str, Any]] | None = None,
        json_schema: dict[str, Any] | None = None,
    ) -> Completion:
        kwargs: dict[str, Any] = {"model": model, "messages": messages}
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        if json_schema is not None:
            kwargs["response_format"] = ResponseFormat(
                type="json_schema",
                json_schema=JSONSchema(name="response", schema_definition=json_schema, strict=True),
            )
        response = await self._client.chat.complete_async(**kwargs)
        tokens = response.usage.total_tokens if response.usage and response.usage.total_tokens else 0
        message = response.choices[0].message if response.choices else None
        if message is None:
            return Completion(content="", tokens=tokens)
        content = message.content if isinstance(message.content, str) else ""
        calls = [
            RequestedCall(id=c.id or f"call-{i}", name=c.function.name, arguments=_arguments(c.function.arguments))
            for i, c in enumerate(message.tool_calls or [])
        ]
        return Completion(content=content or "", tool_calls=calls, tokens=tokens)


def function_tool(name: str, description: str, parameters: dict[str, Any]) -> dict[str, Any]:
    return {"type": "function", "function": {"name": name, "description": description, "parameters": parameters}}
