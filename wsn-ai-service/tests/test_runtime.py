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

    async def invoke_with_grant(self, grant: str, tool: str, arguments: dict[str, Any]) -> ToolOutcome:
        self.calls.append((grant, tool, arguments))
        return self.outcomes[tool]


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
