import type {
  ApplicationPlan,
  FieldValue,
  BlueprintChange,
  BlueprintDiff,
  Entity,
  EntityField,
  EntityInference,
  FilterOp,
  InferredField,
  PreviewResult,
  SavedView,
  SimStep,
  Template,
  ViewFromTextResult,
  WorkflowSimulation,
} from "@workspacenow/types";
import type { ExecutionContext, Platform } from "./platform";
import { applyPlan } from "./studio";

const TEMPLATE_KEY = "workspacenow-dev-template-key";

// signBlueprint computes the publisher signature: HMAC-SHA256 over the canonical blueprint JSON.
// Pure-TS HMAC (the demo mock must not depend on node:crypto types).
export function signBlueprint(blueprint: ApplicationPlan): string {
  return hmacSha256Hex(TEMPLATE_KEY, JSON.stringify(blueprint));
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Hex(data: string): string {
  const bytes = new TextEncoder().encode(data);
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen >>> 0);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32));
  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h = h.map((x, i) => (x + [a, b, c, d, e, f, g, hh][i]) >>> 0);
  }
  return h.map((x) => x.toString(16).padStart(8, "0")).join("");
}

function hmacSha256Hex(key: string, msg: string): string {
  const enc = new TextEncoder();
  let k = enc.encode(key);
  if (k.length > 64) k = enc.encode(sha256Hex(key));
  const padded = new Uint8Array(64);
  padded.set(k);
  const inner = new Uint8Array(64 + enc.encode(msg).length);
  inner.set(padded.map((b) => b ^ 0x36));
  inner.set(enc.encode(msg), 64);
  const innerHash = sha256Hex(String.fromCharCode(...inner));
  const outer = new Uint8Array(64 + 32);
  outer.set(padded.map((b) => b ^ 0x5c));
  for (let i = 0; i < 32; i++) outer[64 + i] = Number.parseInt(innerHash.slice(i * 2, i * 2 + 2), 16);
  return sha256Hex(String.fromCharCode(...outer));
}

/** The built-in marketplace catalog (inventory, procurement, CRM, HR requests), publisher-signed. */
export function seedTemplates(): Template[] {
  const mk = (id: string, name: string, description: string, category: Template["category"], blueprint: Omit<ApplicationPlan, "name" | "ownerDepartmentId">): Template => {
    const plan = { ...blueprint, name, ownerDepartmentId: "dep-it" } as ApplicationPlan;
    return { id, name, description, category, version: "1.0.0", signature: signBlueprint(plan), blueprint: plan };
  };
  const ent = (name: string, label: string, description: string, fields: EntityField[]) => ({ name, label, description, fields, relationships: [] });
  return [
    mk("tpl-inventory", "Inventory Management", "Products, stock levels, low-stock events and reorder points.", "inventory", {
      prompt: "inventory", description: "Track products and stock; low stock raises an event for replenishment workflows.",
      entities: [ent("Product", "Product", "A sellable product.", [
        { name: "name", label: "Name", type: "string", required: true, unique: true },
        { name: "sku", label: "SKU", type: "string", required: true, unique: true },
        { name: "stock", label: "Stock", type: "integer", required: true },
        { name: "reorderLevel", label: "Reorder level", type: "integer", required: true },
        { name: "unitPrice", label: "Unit price", type: "number" },
      ])],
      pages: [{ id: "products", title: "Products", kind: "list", entity: "Product" }],
      operations: ["record sale", "adjust stock"],
      workflows: ["low-stock replenishment"],
      permissions: ["inventory.read", "inventory.write"],
    }),
    mk("tpl-procurement", "Procurement", "Purchase requests with approvals and purchase orders to suppliers.", "procurement", {
      prompt: "procurement", description: "Purchase requests flow through approval to purchase orders.",
      entities: [
        ent("PurchaseRequest", "Purchase request", "", [
          { name: "title", label: "Title", type: "string", required: true },
          { name: "product", label: "Product", type: "string", required: true },
          { name: "quantity", label: "Quantity", type: "integer", required: true },
          { name: "status", label: "Status", type: "enum", enumValues: ["draft", "pending", "approved", "rejected"]},
        ]),
        ent("PurchaseOrder", "Purchase order", "", [
          { name: "requestId", label: "Request", type: "string", required: true },
          { name: "supplier", label: "Supplier", type: "string", required: true },
          { name: "status", label: "Status", type: "enum", enumValues: ["open", "sent", "received"]},
        ]),
      ],
      pages: [{ id: "requests", title: "Purchase requests", kind: "list", entity: "PurchaseRequest" }],
      operations: ["create purchase request", "approve purchase request", "create purchase order"],
      workflows: ["purchase approval"],
      permissions: ["procurement.read", "procurement.approve"],
    }),
    mk("tpl-crm", "CRM", "Contacts, companies and deals with a pipeline view.", "crm", {
      prompt: "crm", description: "Contacts and companies with deals tracked through a pipeline.",
      entities: [
        ent("Company", "Company", "", [
          { name: "name", label: "Name", type: "string", required: true, unique: true },
          { name: "industry", label: "Industry", type: "string" },
        ]),
        ent("Contact", "Contact", "", [
          { name: "name", label: "Name", type: "string", required: true },
          { name: "email", label: "Email", type: "string", unique: true },
          { name: "company", label: "Company", type: "string" },
        ]),
        ent("Deal", "Deal", "", [
          { name: "title", label: "Title", type: "string", required: true },
          { name: "stage", label: "Stage", type: "enum", enumValues: ["lead", "qualified", "proposal", "won", "lost"]},
          { name: "amount", label: "Amount", type: "number" },
        ]),
      ],
      pages: [{ id: "deals", title: "Deals", kind: "list", entity: "Deal" }],
      operations: [],
      workflows: [],
      permissions: ["crm.read", "crm.write"],
    }),
    mk("tpl-hr", "HR Requests", "Employee requests (leave, equipment, expense) with approvals.", "hr", {
      prompt: "hr", description: "Employees file requests; managers approve or reject them.",
      entities: [ent("Request", "Request", "", [
        { name: "type", label: "Type", type: "enum", enumValues: ["leave", "equipment", "expense"], required: true },
        { name: "reason", label: "Reason", type: "text" },
        { name: "status", label: "Status", type: "enum", enumValues: ["pending", "approved", "rejected"] },
      ])],
      pages: [{ id: "requests", title: "My requests", kind: "list", entity: "Request" }],
      operations: ["file request", "decide request"],
      workflows: ["request approval"],
      permissions: ["hr.read", "hr.approve"],
    }),
  ];
}

/* ---------- schema inference (POST /entities/infer) ---------- */

const DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?$/;
const INT_RE = /^-?\d+$/;
const FLOAT_RE = /^-?\d+\.\d+$/;

function pascal(s: string): string {
  return s.replace(/(^|[^a-zA-Z0-9])([a-zA-Z0-9])/g, (_m, _sep, ch: string) => ch.toUpperCase());
}
function camel(s: string): string {
  const p = pascal(s);
  return p ? p[0].toLowerCase() + p.slice(1) : p;
}
function labelOf(s: string): string {
  return pascal(s).replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function inferEntity(input: { name?: string; format: "json" | "csv"; data: string }): EntityInference {
  let rows: Record<string, unknown>[];
  if (input.format === "json") {
    const parsed = JSON.parse(input.data);
    if (!Array.isArray(parsed) || parsed.some((r) => typeof r !== "object" || r === null || Array.isArray(r))) {
      throw new Error("data is not a JSON array of objects");
    }
    rows = parsed as Record<string, unknown>[];
  } else {
    const lines = input.data.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) throw new Error("CSV needs a header row and at least one data row");
    const header = lines[0].split(",").map((h) => h.trim());
    rows = lines.slice(1).map((l) => {
      const cells = l.split(",");
      const m: Record<string, unknown> = {};
      header.forEach((h, i) => { m[h] = cells[i] ?? ""; });
      return m;
    });
  }
  if (rows.length === 0) throw new Error("no data rows found");
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].sort();
  const fields: InferredField[] = [];
  for (const col of cols) {
    const vals = rows.map((r) => String(r[col] ?? "").trim()).filter((v) => v !== "");
    if (vals.length === 0) continue;
    const allBool = vals.every((v) => ["true", "false", "yes", "no"].includes(v));
    const allInt = vals.every((v) => INT_RE.test(v));
    const allNum = vals.every((v) => INT_RE.test(v) || FLOAT_RE.test(v));
    const allDate = vals.every((v) => DATE_RE.test(v));
    const distinct = [...new Set(vals)];
    const lower = col.toLowerCase();
    const idLike = lower.includes("id") || ["code", "sku", "number", "ref"].includes(lower) || lower.includes("email");
    let type: InferredField["type"] = "string";
    if (allBool) type = "boolean";
    else if (allInt) type = "integer";
    else if (allNum) type = "number";
    else if (allDate) type = "date";
    else if (distinct.length <= 10 && distinct.length < vals.length) type = "enum";
    else if (vals.reduce((n, v) => n + v.length, 0) / vals.length > 80) type = "text";
    const f: InferredField = {
      name: camel(col), label: labelOf(col), type,
      required: vals.length === rows.length,
      unique: idLike && distinct.length === vals.length && vals.length > 1,
    };
    if (type === "enum") f.enumValues = distinct.sort();
    fields.push(f);
  }
  if (fields.length === 0) throw new Error("no usable columns found");
  return {
    name: input.name ? pascal(input.name) : "ImportedEntity",
    fields,
    importMapping: fields.map((f) => ({ column: colOf(f.name, cols), field: f.name })),
    rows: rows.length,
  };
}
function colOf(field: string, cols: string[]): string {
  return cols.find((c) => camel(c) === field) ?? field;
}

/* ---------- NL view builder (POST /entities/{name}/views/from-text) ---------- */

const OP_PHRASES: [string, FilterOp["op"]][] = [
  ["less than or equal to", "lte"], ["greater than or equal to", "gte"], ["at least", "gte"], ["at most", "lte"],
  ["not equal to", "neq"], ["less than", "lt"], ["greater than", "gt"], ["below", "lt"], ["under", "lt"],
  ["above", "gt"], ["over", "gt"], ["more than", "gt"], ["contains", "contains"], ["equal to", "eq"],
  ["equals", "eq"], ["is", "eq"], ["=", "eq"], ["<", "lt"], [">", "gt"], ["<=", "lte"], [">=", "gte"], ["!=", "neq"],
];
const NUM_RE = /-?\d+(?:\.\d+)?/;
const QUOTE_RE = /"([^"]+)"|'([^']+)'/;

function extractValue(s: string): unknown {
  const q = QUOTE_RE.exec(s);
  if (q) return q[1] ?? q[2];
  const n = NUM_RE.exec(s);
  if (n) return n[0].includes(".") ? Number.parseFloat(n[0]) : Number.parseInt(n[0], 10);
  return null;
}

function fieldVariants(f: EntityField): string[] {
  return [f.name.toLowerCase(), (f.label ?? "").toLowerCase()].filter(Boolean);
}

function parseCondition(lower: string, idx: number, fieldLen: number): { op: FilterOp["op"]; value: unknown } | null {
  const before = lower.slice(Math.max(0, idx - 30), idx).trimEnd();
  const after = idx + fieldLen <= lower.length ? lower.slice(idx + fieldLen) : "";
  for (const [phrase, op] of OP_PHRASES) {
    if (before.endsWith(phrase)) {
      const v = extractValue(after);
      if (v !== null) return { op, value: v };
    }
  }
  const afterWindow = after.slice(0, 15);
  for (const [phrase, op] of OP_PHRASES) {
    const i = afterWindow.indexOf(phrase);
    if (i >= 0) {
      const v = extractValue(afterWindow.slice(i + phrase.length));
      if (v !== null) return { op, value: v };
    }
  }
  return null;
}

export function viewFromText(platform: Platform, entityName: string, text: string): ViewFromTextResult {
  const entity = platform.entity(entityName);
  const lower = text.toLowerCase();
  let sortField = "";
  let sortDesc = false;
  const sortM = /(?:ordered|order|sorted)\s+by\s+([a-z0-9_ ]+?)(?:\s+(asc|desc|ascending|descending))?(?:\s|,|\.|$)/.exec(lower);
  if (sortM) {
    const f = matchField(entity, sortM[1].trim());
    if (f) {
      sortField = f.name;
      sortDesc = sortM[2]?.startsWith("desc") ?? false;
    }
  }
  let limit = 0;
  const limitM = /(?:limit|top|first)\s+(\d+)/.exec(lower);
  if (limitM) limit = Math.min(Number.parseInt(limitM[1], 10), 200);

  const filters: FilterOp[] = [];
  for (const f of entity.fields) {
    for (const variant of fieldVariants(f)) {
      const idx = lower.indexOf(variant);
      if (idx < 0) continue;
      const cond = parseCondition(lower, idx, variant.length);
      if (cond) {
        filters.push({ field: f.name, op: cond.op, value: cond.value as FilterOp["value"] });
        break;
      }
    }
  }
  if (filters.length === 0) {
    throw new Error(`could not find a condition on any field of ${entity.name}; try "<field> below 10"`);
  }
  let name = "NL: " + text;
  if (name.length > 63) name = name.slice(0, 60) + "...";
  const now = platform.now();
  const view: SavedView = {
    id: platform.nextId("view"), entity: entity.name, name, filters, sortField, sortDesc, limit,
    ownerId: "", shared: false, createdAt: now, updatedAt: now,
  };
  platform.state.views.push(view);
  const parts = filters.map((f) => `${f.field} ${f.op} ${JSON.stringify(f.value)}`).join(" and ");
  let explanation = `Shows ${entity.label} where ${parts}`;
  if (sortField) explanation += `, ordered by ${sortField}${sortDesc ? " descending" : " ascending"}`;
  if (limit) explanation += `, limit ${limit}`;
  return { view, explanation };
}

function matchField(entity: Entity, s: string): EntityField | undefined {
  const target = s.toLowerCase().trim();
  for (const f of entity.fields) {
    if (fieldVariants(f).includes(target)) return f;
  }
  for (const f of entity.fields) {
    if (fieldVariants(f).some((v) => v.startsWith(target) || target.startsWith(v))) return f;
  }
  return undefined;
}

/* ---------- workflow simulation (POST /workflows/{id}/simulate) ---------- */

type StepLike = { id: string; name: string; kind: string; next?: string | null; businessOperation?: string; agentId?: string; channel?: string; minutes?: number; permission?: string; field?: string; operator?: string; value?: string; then?: string | null; otherwise?: string | null };

export function simulateWorkflow(platform: Platform, workflow: { name: string; steps: StepLike[]; start?: string | null }, event?: Record<string, unknown>): WorkflowSimulation {
  const ev = event ?? {};
  const byId = new Map(workflow.steps.map((s) => [s.id, s]));
  const steps: SimStep[] = [];
  const visited = new Set<string>();
  let cur = workflow.start ?? workflow.steps[0]?.id ?? "";
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const st = byId.get(cur);
    if (!st) {
      steps.push({ name: cur, kind: "unknown", outcome: "would-skip", detail: "step referenced but not defined" });
      break;
    }
    let next = st.next ?? null;
    switch (st.kind) {
      case "operation":
        steps.push({ name: st.name, kind: st.kind, outcome: "would-run", detail: `would invoke business operation ${st.businessOperation ?? ""}` });
        break;
      case "agent":
        steps.push({ name: st.name, kind: st.kind, outcome: "would-run", detail: `would run agent ${st.agentId ?? ""} (governed by a signed grant)` });
        break;
      case "notify":
        steps.push({ name: st.name, kind: st.kind, outcome: "would-run", detail: `would notify ${st.channel ?? ""}` });
        break;
      case "wait":
        steps.push({ name: st.name, kind: st.kind, outcome: "would-run", detail: `would wait ${st.minutes ?? 0} minutes` });
        break;
      case "approval":
        steps.push({ name: st.name, kind: st.kind, outcome: "would-wait-approval", detail: `would wait for approval by a holder of ${st.permission ?? ""}` });
        break;
      case "condition": {
        const got = lookupPath(ev, st.field ?? "");
        const cond = evalCond(String(got), st.operator ?? "eq", st.value ?? "");
        steps.push({ name: st.name, kind: st.kind, outcome: cond ? "condition-true" : "condition-false", detail: `${st.field} ${st.operator} ${st.value} evaluated against the sample event` });
        next = cond ? (st.then ?? null) : (st.otherwise ?? null);
        break;
      }
      default:
        steps.push({ name: st.name, kind: st.kind, outcome: "would-skip", detail: "unknown step kind" });
    }
    cur = next ?? "";
  }
  return { traceId: platform.nextId("sim"), summary: `Dry run of "${workflow.name}": ${steps.length} steps, no side effects`, steps };
}

function lookupPath(m: Record<string, unknown>, path: string): unknown {
  let cur: unknown = m;
  for (const part of path.split(".")) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}
function evalCond(got: string, op: string, want: string): boolean {
  const g = Number(got);
  const w = Number(want);
  switch (op) {
    case "eq": case "=": case "": return got === want;
    case "neq": case "!=": return got !== want;
    case "gt": case ">": return g > w;
    case "lt": case "<": return g < w;
    case "gte": case ">=": return g >= w;
    case "lte": case "<=": return g <= w;
    case "contains": return got.includes(want);
    default: return false;
  }
}

/* ---------- preview sample data (POST /applications/{id}/preview) ---------- */

const ADJECTIVES = ["Atlas", "Boreal", "Cedar", "Delta", "Ember", "Fjord"];
const NOUNS = ["Widget", "Gadget", "Module", "Kit", "Pack", "Set"];

export function sampleValues(entity: Entity, i: number): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of entity.fields) {
    const lower = f.name.toLowerCase();
    switch (f.type) {
      case "boolean": out[f.name] = i % 2 === 0; break;
      case "integer": out[f.name] = sampleNumber(lower, i); break;
      case "number": out[f.name] = sampleNumber(lower, i) / 10; break;
      case "date": out[f.name] = new Date(Date.now() + (i - 2) * 86400000).toISOString().slice(0, 10); break;
      case "enum": out[f.name] = ((f.enumValues ?? [])[i % Math.max(1, (f.enumValues ?? []).length)] ?? "") as FieldValue; break;
      default:
        if (lower.includes("email")) out[f.name] = `user${i + 1}@example.com`;
        else if (lower.includes("sku") || lower.includes("code")) out[f.name] = `SKU-${String(i + 1).padStart(3, "0")}`;
        else if (lower.includes("name") || lower.includes("title")) out[f.name] = `${ADJECTIVES[i % 6]} ${NOUNS[i % 6]} ${i + 1}`;
        else out[f.name] = `${f.label ?? f.name} ${i + 1}`;
    }
  }
  return out;
}
function sampleNumber(lower: string, i: number): number {
  if (lower.includes("price") || lower.includes("amount") || lower.includes("cost")) return 10 + i * 7;
  if (lower.includes("stock") || lower.includes("quantity") || lower.includes("level")) return 5 + i * 3;
  return i + 1;
}

export function previewApplication(platform: Platform, ctx: ExecutionContext, appId: string): PreviewResult {
  platform.requirePermission(ctx, "studio.manage", "application.preview", `application/${appId}`);
  const app = platform.state.applications.find((a) => a.id === appId);
  if (!app) throw new Error("NOT_FOUND: Application not found");
  for (const d of platform.state.deployments) {
    if (d.applicationId === appId && d.environment === "development" && d.status === "active") d.status = "superseded";
  }
  const now = platform.now();
  const deployment = {
    id: platform.nextId("dep"), applicationId: app.id, environment: "development" as const,
    version: app.version, status: "active" as const, preview: true, deployedAt: now, deployedBy: ctx.actor.name,
  };
  platform.state.deployments.push(deployment);
  let seeded = 0;
  for (const e of platform.state.entities) {
    if (e.ownerApplicationId !== app.id) continue;
    if (platform.records(e.name).length > 0) continue;
    for (let i = 0; i < 5; i++) {
      platform.createRecord(ctx, e.name, sampleValues(e, i));
      seeded++;
    }
  }
  platform.audit(ctx, "application.preview", `application/${app.id}`, "allowed", `preview of v${app.version}, ${seeded} sample records`);
  return { deployment, recordsSeeded: seeded, url: `/apps/${app.slug}?preview=1` };
}

/* ---------- template install + blueprint diff ---------- */

export function installTemplate(platform: Platform, ctx: ExecutionContext, templateId: string, name?: string): ReturnType<typeof applyPlan> {
  platform.requirePermission(ctx, "studio.manage", "template.install", `template/${templateId}`);
  const tpl = platform.state.templates.find((t) => t.id === templateId);
  if (!tpl) throw new Error("NOT_FOUND: Template not found");
  if (signBlueprint(tpl.blueprint) !== tpl.signature) {
    platform.audit(ctx, "template.install", `template/${templateId}`, "failed", "signature mismatch");
    throw new Error("VALIDATION_FAILED: Template signature verification failed");
  }
  const plan = { ...tpl.blueprint, name: name || tpl.name };
  const app = applyPlan(platform, ctx, plan);
  platform.audit(ctx, "template.install", `application/${app.id}`, "allowed", `${tpl.name} v${tpl.version}`);
  return app;
}

export function diffBlueprints(from: string, to: string, a: ApplicationPlan, b: ApplicationPlan): BlueprintDiff {
  const changes: BlueprintChange[] = [];
  const add = (kind: BlueprintChange["kind"], change: BlueprintChange["change"], name: string, detail: string) =>
    changes.push({ kind, change, name, detail });
  const entsA = new Map((a.entities ?? []).map((e) => [e.name, e]));
  const entsB = new Map((b.entities ?? []).map((e) => [e.name, e]));
  for (const [name, eb] of entsB) {
    const ea = entsA.get(name);
    if (!ea) {
      add("entity", "added", name, `Adds entity ${name} (${eb.fields.length} fields)`);
      continue;
    }
    const fa = new Map(ea.fields.map((f) => [f.name, f]));
    for (const fb of eb.fields) {
      const f = fa.get(fb.name);
      if (!f) add("field", "added", `${name}.${fb.name}`, `Adds field '${fb.name}' (${fb.type}) to ${name}`);
      else if (f.type !== fb.type) add("field", "changed", `${name}.${fb.name}`, `Changes field '${fb.name}' of ${name} from ${f.type} to ${fb.type}`);
    }
    for (const f of ea.fields) if (!eb.fields.some((x) => x.name === f.name)) add("field", "removed", `${name}.${f.name}`, `Removes field '${f.name}' from ${name}`);
  }
  for (const name of entsA.keys()) if (!entsB.has(name)) add("entity", "removed", name, `Removes entity ${name}`);
  const pagesA = new Map((a.pages ?? []).map((p) => [p.id, p]));
  const pagesB = new Map((b.pages ?? []).map((p) => [p.id, p]));
  for (const [id, pb] of pagesB) {
    const pa = pagesA.get(id);
    if (!pa) add("page", "added", pb.title, `Adds page '${pb.title}'`);
    else if (pa.title !== pb.title || pa.kind !== pb.kind || pa.entity !== pb.entity) add("page", "changed", pb.title, `Changes page '${pb.title}'`);
  }
  for (const [id, pa] of pagesA) if (!pagesB.has(id)) add("page", "removed", pa.title, `Removes page '${pa.title}'`);
  const opsA = a.operations ?? [];
  const opsB = b.operations ?? [];
  for (const o of opsB) if (!opsA.includes(o)) add("operation", "added", o, `Adds operation '${o}'`);
  for (const o of opsA) if (!opsB.includes(o)) add("operation", "removed", o, `Removes operation '${o}'`);
  const summary = changes.map((c) => c.detail).sort();
  return { from, to, summary: summary.length ? summary : ["No changes"], changes };
}
