import json
from typing import Any

from .llm import ChatModel
from .models import PlanRequest

# JSON schema of the console's ApplicationPlan, kept to what the Application Architect may propose.
_FIELD = {
    "type": "object",
    "properties": {
        "name": {"type": "string", "description": "camelCase identifier"},
        "label": {"type": "string"},
        "type": {
            "type": "string",
            "enum": ["string", "text", "number", "integer", "boolean", "date", "enum", "reference"],
        },
        "required": {"type": "boolean"},
        "unique": {"type": "boolean"},
        "enumValues": {"type": "array", "items": {"type": "string"}},
        "reference": {"type": "string", "description": "Target entity name when type is reference"},
    },
    "required": ["name", "label", "type"],
}

PLAN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "description": {"type": "string"},
        "ownerDepartmentId": {"type": "string"},
        "entities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "PascalCase identifier"},
                    "label": {"type": "string"},
                    "description": {"type": "string"},
                    "fields": {"type": "array", "items": _FIELD},
                },
                "required": ["name", "label", "description", "fields"],
            },
        },
        "pages": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "kind": {"type": "string", "enum": ["list", "form", "dashboard"]},
                    "entity": {"type": "string"},
                },
                "required": ["title", "kind", "entity"],
            },
        },
    },
    "required": ["name", "description", "ownerDepartmentId", "entities", "pages"],
}

ARCHITECT = (
    "You are the WorkspaceNow Application Architect. Design a small business application from the request: "
    "the entities it needs (PascalCase names, camelCase field names, labels a business user understands), "
    "and for each entity a list page and a form page. Reference an existing entity instead of redefining it. "
    "Pick the owning department from the ids given. Keep it minimal: only what the request needs."
)


class Planner:
    def __init__(self, llm: ChatModel, model: str) -> None:
        self._llm = llm
        self._model = model

    async def plan(self, req: PlanRequest) -> dict[str, Any]:
        brief = [
            f"Request: {req.prompt}",
            f"Department ids: {', '.join(req.departments) or 'none'}",
            f"Entities that already exist: {', '.join(req.existing_entities) or 'none'}",
        ]
        if req.problems:
            brief.append("Your previous draft had these problems; fix every one:\n- " + "\n- ".join(req.problems))
        completion = await self._llm.complete(
            self._model,
            [{"role": "system", "content": ARCHITECT}, {"role": "user", "content": "\n".join(brief)}],
            json_schema=PLAN_SCHEMA,
        )
        plan: dict[str, Any] = json.loads(completion.content)
        for entity in plan.get("entities", []):
            entity.setdefault("relationships", [])
        plan.update({"prompt": req.prompt, "operations": [], "workflows": [], "permissions": []})
        return plan
