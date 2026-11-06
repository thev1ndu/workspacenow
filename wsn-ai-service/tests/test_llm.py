from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import SecretStr

from wsn_ai_service import llm as llm_module
from wsn_ai_service.config import Settings
from wsn_ai_service.llm import Completion, MistralChat, RequestedCall, _arguments, function_tool


def test_arguments_accepts_a_dict() -> None:
    assert _arguments({"a": 1}) == {"a": 1}


def test_arguments_parses_a_json_string() -> None:
    assert _arguments('{"a": 1}') == {"a": 1}


def test_arguments_falls_back_to_empty_on_bad_or_non_object_json() -> None:
    assert _arguments("not json") == {}
    assert _arguments("[1, 2]") == {}
    assert _arguments(None) == {}


def test_function_tool_shape() -> None:
    tool = function_tool("get_items", "List items", {"type": "object"})
    assert tool == {
        "type": "function",
        "function": {"name": "get_items", "description": "List items", "parameters": {"type": "object"}},
    }


class FakeChat:
    def __init__(self, response: Any) -> None:
        self.response = response
        self.kwargs: list[dict[str, Any]] = []

    async def complete_async(self, **kwargs: Any) -> Any:
        self.kwargs.append(kwargs)
        return self.response


class FakeMistral:
    def __init__(self, response: Any) -> None:
        self.chat = FakeChat(response)


def _response(
    content: Any = "hi", calls: list[Any] | None = None, tokens: int | None = 7, empty_choices: bool = False
) -> Any:
    usage = SimpleNamespace(total_tokens=tokens) if tokens is not None else None
    if empty_choices:
        return SimpleNamespace(usage=usage, choices=[])
    message = SimpleNamespace(content=content, tool_calls=calls or [])
    return SimpleNamespace(usage=usage, choices=[SimpleNamespace(message=message)])


def _chat(monkeypatch: pytest.MonkeyPatch, response: Any) -> tuple[MistralChat, FakeChat]:
    fake = FakeMistral(response)
    monkeypatch.setattr(llm_module, "Mistral", lambda **kwargs: fake)
    settings = Settings(mistral_api_key=SecretStr("key"), request_timeout_seconds=5.0)
    return MistralChat(settings), fake.chat


async def test_complete_sends_tools_and_schema_and_parses_tool_calls(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = [
        SimpleNamespace(id=None, function=SimpleNamespace(name="get_items", arguments='{"q": 1}')),
        SimpleNamespace(id="abc", function=SimpleNamespace(name="approve", arguments={"id": "p-1"})),
    ]
    chat, fake = _chat(monkeypatch, _response(content="thinking", calls=calls, tokens=7))

    result = await chat.complete("m", [{"role": "user", "content": "hi"}], tools=[{"t": 1}], json_schema={"s": 2})

    assert fake.kwargs[0]["model"] == "m"
    assert fake.kwargs[0]["tools"] == [{"t": 1}]
    assert fake.kwargs[0]["tool_choice"] == "auto"
    assert fake.kwargs[0]["response_format"].type == "json_schema"
    assert result.content == "thinking"
    assert result.tokens == 7
    assert result.tool_calls == [
        RequestedCall(id="call-0", name="get_items", arguments={"q": 1}),
        RequestedCall(id="abc", name="approve", arguments={"id": "p-1"}),
    ]


async def test_complete_without_tools_or_schema_omits_them(monkeypatch: pytest.MonkeyPatch) -> None:
    chat, fake = _chat(monkeypatch, _response(content=[{"x": 1}], tokens=None))

    result = await chat.complete("m", [])

    assert "tools" not in fake.kwargs[0]
    assert "tool_choice" not in fake.kwargs[0]
    assert "response_format" not in fake.kwargs[0]
    assert result.content == ""  # non-string message content
    assert result.tokens == 0  # no usage reported
    assert result.tool_calls == []


async def test_complete_with_no_choices_returns_empty_content(monkeypatch: pytest.MonkeyPatch) -> None:
    chat, _ = _chat(monkeypatch, _response(empty_choices=True, tokens=3))

    result = await chat.complete("m", [])

    assert result == Completion(content="", tokens=3)
