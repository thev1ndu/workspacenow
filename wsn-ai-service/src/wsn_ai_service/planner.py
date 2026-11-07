import json
from typing import Any

from .llm import ChatModel
from .models import PlanEditRequest, PlanRequest

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
        "slo": {
            "type": "object",
            "properties": {
                "enabled": {"type": "boolean", "description": "true to track SLOs for the app's operations"},
                "targetSuccess": {"type": "number", "description": "0..1 required success rate, e.g. 0.999 for 99.9%"},
                "targetP95Ms": {"type": "integer", "description": "required p95 latency in milliseconds, e.g. 500"},
                "windowMinutes": {"type": "integer", "description": "rolling window in minutes, e.g. 10080 for 7 days"},
            },
            "required": ["enabled", "targetSuccess", "targetP95Ms", "windowMinutes"],
        },
    },
    "required": ["name", "description", "ownerDepartmentId", "entities", "pages"],
}

# Default per-application SLO when the Architect does not propose one: disabled.
DEFAULT_SLO: dict[str, Any] = {"enabled": False, "targetSuccess": 0.99, "targetP95Ms": 500, "windowMinutes": 10080}

ARCHITECT = (
    "You are the WorkspaceNow Application Architect. Design a small business application from the request: "
    "the entities it needs (PascalCase names, camelCase field names, labels a business user understands), "
    "and for each entity a list page and a form page. Reference an existing entity instead of redefining it. "
    "Pick the owning department from the ids given. Keep it minimal: only what the request needs. "
    'When the request asks for a reliability target (e.g. "99.9% of operations succeed within 500ms"), '
    "set slo.enabled=true with matching targets and a sensible rolling window; otherwise set slo.enabled=false "
    "with targetSuccess 0.99, targetP95Ms 500 and windowMinutes 10080 (7 days)."
)


ARCHITECT_EDIT = (
    "You are the WorkspaceNow Application Architect revising an existing application. You are given the "
    "application's current plan as JSON and the user's change request. Output the COMPLETE updated plan in the "
    "same schema — keep every entity, field, and page that the request does not change, with identical names "
    "(records depend on them), and make only the requested changes. Changes to entities that already hold "
    "records must be additive: new fields or enum values are fine, removing or retyping existing ones is not. "
    "Reference an existing entity instead of redefining it. Keep it minimal: only what the change needs. "
    "Change slo only when the request mentions reliability targets: set enabled=true with the requested "
    "targets, or enabled=false to stop tracking SLOs for this app."
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
        plan["slo"] = {**DEFAULT_SLO, **plan.get("slo", {})}
        plan.update({"prompt": req.prompt, "operations": [], "workflows": [], "permissions": []})
        return plan

    async def edit(self, req: PlanEditRequest) -> dict[str, Any]:
        brief = [
            f"Change request: {req.prompt}",
            f"Current plan: {json.dumps(req.current, sort_keys=True)}",
            f"Department ids: {', '.join(req.departments) or 'none'}",
            f"Entities that already exist outside this app: {', '.join(req.existing_entities) or 'none'}",
        ]
        if req.problems:
            brief.append("Your previous draft had these problems; fix every one:\n- " + "\n- ".join(req.problems))
        completion = await self._llm.complete(
            self._model,
            [{"role": "system", "content": ARCHITECT_EDIT}, {"role": "user", "content": "\n".join(brief)}],
            json_schema=PLAN_SCHEMA,
        )
        plan: dict[str, Any] = json.loads(completion.content)
        for entity in plan.get("entities", []):
            entity.setdefault("relationships", [])
        plan["slo"] = {**DEFAULT_SLO, **plan.get("slo", {})}
        plan.update({"prompt": req.prompt, "operations": [], "workflows": [], "permissions": []})
        return plan
