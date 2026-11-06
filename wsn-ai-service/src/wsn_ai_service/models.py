from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Wire(BaseModel):
    # Field names are camelCase on the wire to match wsn-service and the console.
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AgentSpec(Wire):
    id: str
    name: str
    model: str
    instructions: str = ""
    max_tool_calls_per_run: int = 10


class ToolSpec(Wire):
    name: str
    description: str = ""
    input_schema: dict[str, Any] = Field(default_factory=lambda: {"type": "object", "properties": {}})


class RunRequest(Wire):
    run_id: str
    agent: AgentSpec
    prompt: str
    context: dict[str, Any] = Field(default_factory=dict)
    # Signed by wsn-service; it names the permissions and tools this run may use.
    grant: str
    tools: list[ToolSpec] = Field(default_factory=list)
    application_name: str | None = None


Outcome = Literal["allowed", "denied", "error"]


class ToolCall(Wire):
    tool: str
    input: dict[str, Any]
    outcome: Outcome
    output: Any = None
    reason: str | None = None


class ThoughtStep(Wire):
    kind: Literal["thought"] = "thought"
    text: str


class ToolStep(Wire):
    kind: Literal["tool"] = "tool"
    call: ToolCall


class RunResult(Wire):
    status: Literal["completed", "failed"]
    steps: list[ThoughtStep | ToolStep]
    answer: str
    tokens: int
    duration_ms: int


class PlanRequest(Wire):
    prompt: str
    departments: list[str] = Field(default_factory=list)
    existing_entities: list[str] = Field(default_factory=list)
    problems: list[str] = Field(default_factory=list)


class DiscoverRequest(Wire):
    url: str
    auth: Literal["oauth2", "api-key", "none"] = "none"
    token: str | None = None


class DiscoveredTool(Wire):
    name: str
    description: str = ""


class DiscoverResult(Wire):
    tools: list[DiscoveredTool]
