from typing import Any

from wsn_ai_service.llm import Completion, Message, RequestedCall
from wsn_ai_service.models import AgentSpec, RunRequest, ToolSpec
from wsn_ai_service.planner import Planner
from wsn_ai_service.platform import ToolOutcome
from wsn_ai_service.runtime import AgentRuntime


class ScriptedModel:
    # Plays back completions in order and records what the runtime sent.
    def __init__(self, *completions: Completion) -> None:
        self.completions = list(completions)
        self.sent: list[list[Message]] = []

    async def complete(
        self, model: str, messages: list[Message], tools: Any = None, json_schema: Any = None
    ) -> Completion:
        self.sent.append(list(messages))
        return self.completions.pop(0)


class FakePlatform:
    def __init__(self, outcomes: dict[str, ToolOutcome]) -> None:
        self.outcomes = outcomes
        self.calls: list[tuple[str, str, dict[str, Any]]] = []
        self.streamed: list[tuple[str, dict[str, Any]]] = []
        self.stream_ok = True

    async def invoke_with_grant(self, grant: str, tool: str, arguments: dict[str, Any]) -> ToolOutcome:
        self.calls.append((grant, tool, arguments))
        return self.outcomes[tool]

    async def stream_run_step(self, run_id: str, step: dict[str, Any]) -> bool:
        self.streamed.append((run_id, step))
        return self.stream_ok


def request(max_calls: int = 5) -> RunRequest:
    return RunRequest(
        run_id="run-1",
        agent=AgentSpec(
            id="agent-procurement",
            name="Procurement Assistant",
            model="mistral-medium-latest",
            max_tool_calls_per_run=max_calls,
        ),
        prompt="Prepare a purchase request for low stock",
        grant="signed-grant",
        tools=[ToolSpec(name="get_low_stock_items"), ToolSpec(name="approve_purchase_request")],
    )


async def test_tool_calls_go_through_the_platform_with_the_grant() -> None:
    llm = ScriptedModel(
        Completion("Checking stock.", [RequestedCall("c1", "get_low_stock_items", {})], tokens=40),
        Completion("Coconut Oil 1L is low at Kandy.", tokens=25),
    )
    platform = FakePlatform({"get_low_stock_items": ToolOutcome("allowed", [{"productName": "Coconut Oil 1L"}])})
    result = await AgentRuntime(llm, platform).run(request())  # type: ignore[arg-type]

    assert platform.calls == [("signed-grant", "get_low_stock_items", {})]
    assert result.status == "completed"
    assert result.answer == "Coconut Oil 1L is low at Kandy."
    assert result.tokens == 65
    assert [s.kind for s in result.steps] == ["thought", "tool"]
    assert llm.sent[1][-1]["role"] == "tool"


async def test_every_step_is_streamed_to_the_platform_as_it_happens() -> None:
    llm = ScriptedModel(
        Completion("Checking stock.", [RequestedCall("c1", "get_low_stock_items", {})], tokens=40),
        Completion("All good.", tokens=25),
    )
    platform = FakePlatform({"get_low_stock_items": ToolOutcome("allowed", [{"productName": "Oil"}])})

    result = await AgentRuntime(llm, platform).run(request())  # type: ignore[arg-type]

    assert [run_id for run_id, _ in platform.streamed] == ["run-1", "run-1"]
    assert platform.streamed[0][1] == {"kind": "thought", "text": "Checking stock."}
    assert platform.streamed[1][1] == {
        "kind": "tool",
        "call": {
            "tool": "get_low_stock_items",
            "input": {},
            "outcome": "allowed",
            "output": [{"productName": "Oil"}],
            "reason": None,
        },
    }
    assert len(result.steps) == 2  # the streamed steps are exactly the result's steps


async def test_a_failing_step_stream_never_fails_the_run() -> None:
    llm = ScriptedModel(
        Completion("Looking.", [RequestedCall("c1", "get_low_stock_items", {})], tokens=1),
        Completion("Done.", tokens=1),
    )
    platform = FakePlatform({"get_low_stock_items": ToolOutcome("allowed", [])})
    platform.stream_ok = False

    result = await AgentRuntime(llm, platform).run(request())  # type: ignore[arg-type]

    assert result.status == "completed"
    assert result.answer == "Done."
    assert len(platform.streamed) == 2  # it kept trying to report


async def test_a_denied_call_is_a_step_not_a_failure() -> None:
    llm = ScriptedModel(
        Completion("", [RequestedCall("c1", "approve_purchase_request", {"purchaseRequestId": "pr-1"})]),
        Completion("I can't approve that; a Procurement Manager has to."),
    )
    platform = FakePlatform({"approve_purchase_request": ToolOutcome("denied", reason="lacks procurement.approve")})
    result = await AgentRuntime(llm, platform).run(request())  # type: ignore[arg-type]

    assert result.status == "completed"
    call = result.steps[0].call  # type: ignore[union-attr]
    assert (call.outcome, call.reason) == ("denied", "lacks procurement.approve")


async def test_the_tool_call_limit_is_enforced_locally_too() -> None:
    llm = ScriptedModel(
        Completion(
            "", [RequestedCall("c1", "get_low_stock_items", {}), RequestedCall("c2", "get_low_stock_items", {})]
        ),
        Completion("Done."),
    )
    platform = FakePlatform({"get_low_stock_items": ToolOutcome("allowed", [])})
    result = await AgentRuntime(llm, platform).run(request(max_calls=1))  # type: ignore[arg-type]

    assert len(platform.calls) == 1
    assert result.steps[1].call.outcome == "denied"  # type: ignore[union-attr]


async def test_application_scope_lands_in_the_system_prompt() -> None:
    llm = ScriptedModel(Completion("ok"))
    req = request()
    req.application_name = "Inventory Management"

    await AgentRuntime(llm, FakePlatform({})).run(req)  # type: ignore[arg-type]

    assert "You help only with Inventory Management" in llm.sent[0][0]["content"]


async def test_workflow_context_lands_in_the_user_prompt() -> None:
    llm = ScriptedModel(Completion("ok"))
    req = request()
    req.context = {"saleId": "s-1"}

    await AgentRuntime(llm, FakePlatform({})).run(req)  # type: ignore[arg-type]

    user = llm.sent[0][1]["content"]
    assert "Context from the workflow" in user and "s-1" in user


async def test_a_run_that_never_answers_gets_the_tool_limit_message() -> None:
    llm = ScriptedModel(
        Completion("", [RequestedCall("c1", "get_low_stock_items", {})]),
        Completion("", [RequestedCall("c2", "get_low_stock_items", {})]),
    )
    platform = FakePlatform({"get_low_stock_items": ToolOutcome("allowed", [])})

    result = await AgentRuntime(llm, platform).run(request(max_calls=0))  # type: ignore[arg-type]

    assert result.answer == "I stopped before finishing because I reached my tool call limit."
    assert result.status == "completed"
    assert len(platform.calls) == 0  # the local limit of zero denies before any call leaves


async def test_planner_returns_the_console_plan_shape() -> None:
    llm = ScriptedModel(
        Completion(
            '{"name":"Leave Tracker","description":"d","ownerDepartmentId":"dep-hr","entities":[{"name":"LeaveRequest",'
            '"label":"Leave request","description":"","fields":[]}],"pages":[]}'
        )
    )
    plan = await Planner(llm, "mistral-large-latest").plan(  # type: ignore[arg-type]
        __import__("wsn_ai_service.models", fromlist=["PlanRequest"]).PlanRequest(
            prompt="Track leave", problems=["fix it"]
        )
    )
    assert plan["entities"][0]["relationships"] == []
    assert plan["prompt"] == "Track leave"
    assert "fix it" in llm.sent[0][1]["content"]
