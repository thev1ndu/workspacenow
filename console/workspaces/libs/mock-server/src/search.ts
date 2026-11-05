import type { EntityRecord, SearchHit } from "@workspacenow/types";
import type { ExecutionContext, Platform } from "./platform";

/** Breaks ties between equally good matches: what people open most comes first. */
const TYPE_WEIGHT: Partial<Record<SearchHit["type"], number>> = { application: 3, record: 2, user: 2, entity: 1 };

const NAME_FIELDS = ["name", "orderNumber", "sku", "receipt", "fullName", "title", "subject", "tag"];

/** Scores how well text matches every query term: exact, then prefix, then word start, then substring. */
function score(terms: string[], title: string, rest: string): number {
  const t = title.toLowerCase();
  const all = `${t} ${rest.toLowerCase()}`;
  let total = 0;
  for (const term of terms) {
    if (t === term) total += 100;
    else if (t.startsWith(term)) total += 60;
    else if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t)) total += 40;
    else if (t.includes(term)) total += 25;
    else if (all.includes(term)) total += 10;
    else return 0;
  }
  return total;
}

/**
 * Global search over what the caller can see: platform resources and people for any signed-in
 * user, business records only for entities the caller may read.
 */
export function search(platform: Platform, ctx: ExecutionContext, query: string, limit = 30): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const s = platform.state;
  const dept = (id: string) => s.departments.find((d) => d.id === id)?.name ?? id;
  const appName = (id?: string) => s.applications.find((a) => a.id === id)?.name ?? "Organization";
  const ranked: Array<SearchHit & { score: number }> = [];
  const add = (hit: SearchHit, rest = "") => {
    const value = score(terms, hit.title, `${hit.subtitle} ${hit.id} ${rest}`);
    if (value > 0) ranked.push({ ...hit, score: value + (TYPE_WEIGHT[hit.type] ?? 0) });
  };

  for (const a of s.applications) add({ type: "application", id: a.id, title: a.name, subtitle: `Application · ${dept(a.ownerDepartmentId)}` }, a.description);
  for (const e of s.entities) add({ type: "entity", id: e.name, title: e.label, subtitle: `Entity · ${appName(e.ownerApplicationId)}` }, `${e.name} ${e.description}`);
  for (const a of s.apis) add({ type: "api", id: a.id, title: a.name, subtitle: `API · ${appName(a.applicationId)}` });
  for (const m of s.mcpServers) add({ type: "mcp-server", id: m.id, title: m.name, subtitle: "MCP server" }, m.tools.map((t) => t.name).join(" "));
  for (const i of s.integrations) add({ type: "integration", id: i.id, title: i.name, subtitle: `Integration · ${i.kind}` }, i.target);
  for (const a of s.agents) add({ type: "agent", id: a.id, title: a.name, subtitle: `Agent · ${dept(a.ownerDepartmentId)}` }, a.description);
  for (const w of s.workflows) add({ type: "workflow", id: w.id, title: w.name, subtitle: `Workflow · ${appName(w.applicationId)}` });
  for (const u of s.users) add({ type: "user", id: u.id, title: u.name, subtitle: `${u.title} · ${dept(u.departmentId)}` }, u.email);

  const labelOf = (record: EntityRecord) => String(NAME_FIELDS.map((f) => record.values[f]).find((v) => v != null) ?? record.id);
  for (const entity of s.entities) {
    if (!ctx.permissions.has(entity.readPermission)) continue;
    const records = platform.records(entity.name);
    const reference = (fieldName: string, value: unknown) => {
      const field = entity.fields.find((f) => f.name === fieldName);
      if (field?.type !== "reference" || !field.reference) return undefined;
      const target = platform.records(field.reference).find((r) => r.id === value);
      return target && labelOf(target);
    };
    const page = s.applications.flatMap((a) => a.pages.map((p) => ({ app: a, page: p }))).find((x) => x.page.entity === entity.name && x.page.kind === "list");
    for (const record of records) {
      const values = Object.entries(record.values).map(([k, v]) => reference(k, v) ?? (v == null ? "" : String(v)));
      const named = NAME_FIELDS.some((f) => record.values[f] != null);
      const firstReference = Object.entries(record.values).map(([k, v]) => reference(k, v)).find(Boolean);
      const title = named ? labelOf(record) : firstReference ?? record.id;
      add(
        { type: "record", id: record.id, title, subtitle: `${entity.label} · ${record.id}`, entity: entity.name, appId: page?.app.id, pageId: page?.page.id },
        values.join(" "),
      );
    }
  }

  return ranked
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(({ score: _score, ...hit }) => hit);
}
