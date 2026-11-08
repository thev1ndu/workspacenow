import json
import time
from typing import Any

from .llm import ChatModel, Message, function_tool
from .models import RunRequest, RunResult, ThoughtStep, ToolCall, ToolStep
from .platform import PlatformClient
from .telemetry import OtlpExporter, Span

GUIDANCE = (
    "You act inside WorkspaceNow through the tools you are given. The platform authorizes every call: "
    "if a tool is denied, explain what was refused and why, and never pretend an action happened. "
    "Use only the tools you have, prefer reading before writing, and answer briefly in plain language."
)


def _system_prompt(req: RunRequest) -> str:
    parts = [req.agent.instructions.strip(), GUIDANCE]
    if req.application_name:
        parts.append(f"You help only with {req.application_name}; decline anything outside it.")
    return "\n\n".join(p for p in parts if p)


def _user_prompt(req: RunRequest) -> str:
    if not req.context:
        return req.prompt
    return f"{req.prompt}\n\nContext from the workflow:\n{json.dumps(req.context, default=str)}"


class AgentRuntime:
    # Runs one agent turn loop: Mistral proposes tool calls, wsn-service decides each one.

    def __init__(self, llm: ChatModel, platform: PlatformClient, exporter: OtlpExporter | None = None) -> None:
        self._llm = llm
        self._platform = platform
        self._exporter = exporter

    async def run(self, req: RunRequest) -> RunResult:
        # With the observer configured, the run is one span with its token metric exported at the end.
        if self._exporter is None or not self._exporter.enabled:
            return await self._run(req)
        async with Span(
            self._exporter,
            f"agent.run {req.agent.id}",
            {"run.id": req.run_id, "agent.id": req.agent.id, "model": req.agent.model},
        ) as sp:
            result = await self._run(req)
            sp.attributes["status"] = result.status
            sp.attributes["tokens"] = str(result.tokens)
            sp.attributes["steps"] = str(len(result.steps))
            await self._exporter.export_metric("agent.run.tokens", result.tokens, attributes={"model": req.agent.model})
            return result

    async def _stream_step(self, run_id: str, step: ThoughtStep | ToolStep) -> None:
        # Sends the step to wsn-service the moment it happens (camelCase on the wire, like the run result);
        await self._platform.stream_run_step(run_id, step.model_dump(by_alias=True, mode="json"))

    async def _run(self, req: RunRequest) -> RunResult:
        started = time.monotonic()
        tools = [function_tool(t.name, t.description, t.input_schema) for t in req.tools]
        messages: list[Message] = [
            {"role": "system", "content": _system_prompt(req)},
            {"role": "user", "content": _user_prompt(req)},
        ]
        steps: list[ThoughtStep | ToolStep] = []
        tokens = 0
        calls_made = 0
        answer = ""
        limit = max(req.agent.max_tool_calls_per_run, 0)

        # Each round may request several calls; the cap on rounds stops a model that never answers.
        for _ in range(limit + 2):
            completion = await self._llm.complete(req.agent.model, messages, tools or None)
            tokens += completion.tokens
            if not completion.tool_calls:
                answer = completion.content.strip()
                break
            if completion.content.strip():
                thought = ThoughtStep(text=completion.content.strip())
                steps.append(thought)
                await self._stream_step(req.run_id, thought)
            messages.append(
                {
                    "role": "assistant",
                    "content": completion.content,
                    "tool_calls": [
                        {
                            "id": c.id,
                            "type": "function",
                            "function": {"name": c.name, "arguments": json.dumps(c.arguments)},
                        }
                        for c in completion.tool_calls
                    ],
                }
            )
            for call in completion.tool_calls:
                if calls_made >= limit:
                    result = ToolCall(
                        tool=call.name,
                        input=call.arguments,
                        outcome="denied",
                        reason=f"Tool call limit of {limit} reached",
                    )
                else:
                    outcome = await self._platform.invoke_with_grant(req.grant, call.name, call.arguments)
                    result = ToolCall(
                        tool=call.name,
                        input=call.arguments,
                        outcome=outcome.outcome,
                        output=outcome.output,
                        reason=outcome.reason,
                    )
                calls_made += 1
                step = ToolStep(call=result)
                steps.append(step)
                await self._stream_step(req.run_id, step)
                messages.append(
                    {"role": "tool", "name": call.name, "tool_call_id": call.id, "content": _tool_content(result)}
                )

        if not answer:
            answer = "I stopped before finishing because I reached my tool call limit."
        failed = any(isinstance(s, ToolStep) and s.call.outcome == "error" for s in steps)
        return RunResult(
            status="failed" if failed else "completed",
            steps=steps,
            answer=answer,
            tokens=tokens,
            duration_ms=int((time.monotonic() - started) * 1000),
        )


def _tool_content(call: ToolCall) -> str:
    body: dict[str, Any] = {"outcome": call.outcome}
    if call.outcome == "allowed":
        body["output"] = call.output
    else:
        body["reason"] = call.reason
    return json.dumps(body, default=str)
