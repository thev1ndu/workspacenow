import type { EntityScope, FieldType, Permission } from "@workspacenow/types";

export const PERMISSIONS: Permission[] = [
  "studio.manage",
  "connect.manage",
  "data.manage",
  "ai.manage",
  "flow.manage",
  "control.manage",
  "inventory.read",
  "inventory.write",
  "supplier.read",
  "supplier.write",
  "procurement.read",
  "procurement.request",
  "procurement.approve",
  "procurement.order",
  "deployment.promote",
  "audit.read",
];

export const FIELD_TYPES: FieldType[] = ["string", "text", "number", "integer", "boolean", "date", "enum", "reference"];

export const SCOPE_LABEL: Record<EntityScope, string> = {
  application: "Application-scoped",
  organization: "Organization-shared",
  external: "External system",
};

export const SCOPE_EXPLANATION: Record<EntityScope, string> = {
  application:
    "Owned by one application, which is the only source of authoritative writes. Other applications reach it through governed operations.",
  organization:
    "Shared across the organization. The owning application stays responsible for writes; every other consumer reads through an authorized entity service.",
  external:
    "Defined and owned by an external system. WorkspaceNow reads it through a connection and never writes to it.",
};
