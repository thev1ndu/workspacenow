import type { ActorKind, AuditRecord, ListResponse, Trace, TraceSummary } from "@workspacenow/types";
import { enc, httpGET, SERVICE_BASE, qs, type GetToken } from "../utils/http";

export interface AuditQuery {
  limit?: number;
  offset?: number;
  actorKind?: ActorKind;
  outcome?: AuditRecord["outcome"];
  q?: string;
}

export async function listAudit(query: AuditQuery, getToken: GetToken) {
  return httpGET<ListResponse<AuditRecord>>(`${SERVICE_BASE}/audit`, {
    token: await getToken(),
    searchParams: qs(query as Record<string, string | number | undefined>),
  });
}

export async function listTraces(query: { q?: string; limit?: number; offset?: number }, getToken: GetToken) {
  return httpGET<ListResponse<TraceSummary>>(`${SERVICE_BASE}/traces`, { token: await getToken(), searchParams: qs(query) });
}

export async function getTrace(params: { traceId: string }, getToken: GetToken) {
  return httpGET<Trace>(`${SERVICE_BASE}/traces/${enc(params.traceId)}`, { token: await getToken() });
}
