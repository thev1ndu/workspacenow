import type { AppSlo, Application, ApplicationPlan, Entity, EntityField, ScanConfig } from "./domain";

type PlannedEntity = ApplicationPlan["entities"][number];

const ENTITY_NAME = /^[A-Z][A-Za-z0-9]*$/;
const FIELD_NAME = /^[a-z][A-Za-z0-9]*$/;

/** "Purchase request" → "PurchaseRequest"; the identifier an entity label suggests. */
export function toEntityName(label: string): string {
  return label
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

/** "Unit price" → "unitPrice"; the identifier a field label suggests. */
export function toFieldName(label: string): string {
  const pascal = toEntityName(label);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** The SLO configuration a plan gets when neither the Architect nor the editor sets one: off. */
export const DEFAULT_SLO: AppSlo = { enabled: false, targetSuccess: 0.99, targetP95Ms: 500, windowMinutes: 10080 };

/** The CRUD operations an entity gets when a plan is applied. */
export function planOperations(entities: Array<Pick<PlannedEntity, "name">>): string[] {
  return entities.flatMap((e) => ["list", "get", "create", "update"].map((verb) => `${e.name}.${verb}`));
}

function fieldProblems(entity: PlannedEntity, field: EntityField, references: Set<string>): string[] {
  const where = `${entity.label || entity.name} → ${field.label || field.name || "unnamed field"}`;
  const problems: string[] = [];
  if (!field.label.trim()) problems.push(`${where}: label is required`);
  if (!FIELD_NAME.test(field.name)) problems.push(`${where}: name must start with a lowercase letter and use letters and digits only`);
  if (field.type === "enum" && !field.enumValues?.length) problems.push(`${where}: a choice field needs at least one option`);
  if (field.type === "reference" && (!field.reference || !references.has(field.reference))) {
    problems.push(`${where}: pick the entity this field refers to`);
  }
  return problems;
}

function scanProblems(where: string, scan: ScanConfig | undefined, entity: PlannedEntity): string[] {
  if (!scan?.matchField) return [`${where}: choose what the QR code holds`];
  const problems: string[] = [];
  if (scan.matchField !== "id" && !entity.fields.some((f) => f.name === scan.matchField)) problems.push(`${where}: the QR field is not on ${entity.label}`);
  if (scan.onScan) {
    const field = entity.fields.find((f) => f.name === scan.onScan!.field);
    if (field?.type !== "enum" || !field.enumValues?.includes(scan.onScan.value)) problems.push(`${where}: the value to set on scan is not a choice of ${entity.label}`);
  }
  return problems;
}

/**
 * Everything wrong with a plan, in reading order; empty when it can be applied. The editor shows
 * these as the user types and the platform runs the same check before creating anything.
 */
export function validatePlan(plan: ApplicationPlan, existingEntityNames: string[]): string[] {
  const problems: string[] = [];
  if (!plan.name.trim()) problems.push("The application needs a name");
  if (!plan.ownerDepartmentId) problems.push("Choose the owning department");
  if (plan.entities.length === 0) problems.push("Add at least one entity");

  const planned = plan.entities.map((e) => e.name);
  const references = new Set([...planned, ...existingEntityNames]);
  const seen = new Set<string>();
  for (const entity of plan.entities) {
    const where = entity.label || entity.name || "Unnamed entity";
    if (!entity.label.trim()) problems.push(`${where}: label is required`);
    if (!ENTITY_NAME.test(entity.name)) problems.push(`${where}: name must start with a capital letter and use letters and digits only`);
    else if (seen.has(entity.name)) problems.push(`${where}: another entity in this plan is also named ${entity.name}`);
    else if (existingEntityNames.includes(entity.name)) problems.push(`${where}: ${entity.name} already exists; rename it or reference the existing one`);
    seen.add(entity.name);
    if (entity.fields.length === 0) problems.push(`${where}: add at least one field`);
    const fieldNames = new Set<string>();
    for (const field of entity.fields) {
      problems.push(...fieldProblems(entity, field, references));
      if (fieldNames.has(field.name)) problems.push(`${where}: two fields are named ${field.name}`);
      fieldNames.add(field.name);
    }
  }

  plan.pages.forEach((page, i) => {
    const where = page.title || `Page ${i + 1}`;
    if (!page.title.trim()) problems.push(`${where}: title is required`);
    if (!page.entity || !planned.includes(page.entity)) problems.push(`${where}: choose one of this plan's entities`);
    else if (page.kind === "scan") problems.push(...scanProblems(where, page.scan, plan.entities.find((e) => e.name === page.entity)!));
  });
  if (plan.slo?.enabled) {
    if (!(plan.slo.targetSuccess > 0 && plan.slo.targetSuccess <= 1)) problems.push("SLO: the success target must be between 0 and 1 (e.g. 0.999)");
    if (!(plan.slo.targetP95Ms > 0)) problems.push("SLO: the p95 target must be a positive number of milliseconds");
    if (!(plan.slo.windowMinutes > 0)) problems.push("SLO: the window must be a positive number of minutes");
  }
  return problems;
}

/** The entities an application owns and may change: its own, never shared ones it only uses or external ones. */
export function ownedEntities(app: Application, entities: Entity[]): Entity[] {
  return entities.filter((e) => app.entityNames.includes(e.name) && e.ownerApplicationId === app.id && e.scope !== "external");
}

/** The plan an existing application is built from, so it can be edited the way a new one is designed. */
export function planFromApplication(app: Application, entities: Entity[]): ApplicationPlan {
  const owned = ownedEntities(app, entities);
  return {
    prompt: "",
    name: app.name,
    description: app.description,
    ownerDepartmentId: app.ownerDepartmentId,
    // A deep copy: editing the plan must never change the entities it was read from.
    entities: owned.map(({ name, label, description, fields, relationships }) => structuredClone({ name, label, description, fields, relationships })),
    pages: app.pages.map(({ id, title, kind, entity, scan }) => ({ id, title, kind, entity, scan })),
    operations: planOperations(owned),
    workflows: [],
    permissions: [],
    slo: app.slo ? structuredClone(app.slo) : { ...DEFAULT_SLO },
  };
}

/**
 * What an edit to an existing application may not do, because records already depend on it: remove
 * or rename an entity or field, change a field's type or target, drop a choice, or tighten a field
 * to required or unique. New entities, new optional fields, new choices and relabelling are fine.
 */
export function validatePlanChanges(saved: PlannedEntity[], plan: ApplicationPlan): string[] {
  const problems: string[] = [];
  for (const before of saved) {
    const after = plan.entities.find((e) => e.name === before.name);
    if (!after) {
      problems.push(`${before.label}: an existing entity cannot be removed or renamed`);
      continue;
    }
    for (const field of before.fields) {
      const where = `${after.label} → ${field.label}`;
      const now = after.fields.find((f) => f.name === field.name);
      if (!now) {
        problems.push(`${where}: an existing field cannot be removed or renamed`);
        continue;
      }
      if (now.type !== field.type) problems.push(`${where}: an existing field's type cannot change`);
      if (now.reference !== field.reference) problems.push(`${where}: an existing reference cannot point to another entity`);
      const dropped = (field.enumValues ?? []).filter((v) => !now.enumValues?.includes(v));
      if (dropped.length) problems.push(`${where}: existing choices cannot be removed (${dropped.join(", ")})`);
      if (now.required && !field.required) problems.push(`${where}: an existing field cannot become required`);
      if (now.unique && !field.unique) problems.push(`${where}: an existing field cannot become unique`);
    }
    for (const field of after.fields) {
      if (field.required && !before.fields.some((f) => f.name === field.name)) {
        problems.push(`${after.label} → ${field.label}: a new field on an existing entity must be optional, since current records have no value for it`);
      }
    }
  }
  return problems;
}
