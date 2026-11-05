import type { ActorKind, AuditRecord, ListResponse, Trace, TraceSummary } from "@workspacenow/types";
import { enc, httpGET, SERVICE_BASE, type GetToken } from "../utils/http";

export interface AuditQuery {
  actorKind?: ActorKind;
  outcome?: AuditRecord["outcome"];
  q?: string;
}

export async function listAudit(query: AuditQuery, getToken: GetToken) {
  return httpGET<ListResponse<AuditRecord>>(`${SERVICE_BASE}/audit`, {
    token: await getToken(),
    searchParams: { ...query },
  });
}

export async function listTraces(getToken: GetToken) {
  return httpGET<ListResponse<TraceSummary>>(`${SERVICE_BASE}/traces`, { token: await getToken() });
}

export async function getTrace(params: { traceId: string }, getToken: GetToken) {
  return httpGET<Trace>(`${SERVICE_BASE}/traces/${enc(params.traceId)}`, { token: await getToken() });
}
