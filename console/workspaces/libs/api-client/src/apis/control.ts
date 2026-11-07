import type { AlertFire, AlertRule, AlertRuleInput, ListResponse, Slo, SloInput, SloStatus } from "@workspacenow/types";
import { enc, httpDELETE, httpGET, httpPOST, httpPUT, SERVICE_BASE, type GetToken } from "../utils/http";

export async function listAlertRules(getToken: GetToken) {
  return httpGET<ListResponse<AlertRule>>(`${SERVICE_BASE}/alerts`, { token: await getToken() });
}

export async function createAlertRule(body: AlertRuleInput, getToken: GetToken) {
  return httpPOST<AlertRule>(`${SERVICE_BASE}/alerts`, { token: await getToken(), body });
}

export async function updateAlertRule(params: { ruleId: string }, body: AlertRuleInput, getToken: GetToken) {
  return httpPUT<AlertRule>(`${SERVICE_BASE}/alerts/${enc(params.ruleId)}`, { token: await getToken(), body });
}

export async function deleteAlertRule(params: { ruleId: string }, getToken: GetToken) {
  return httpDELETE<{ id: string; deleted: boolean }>(`${SERVICE_BASE}/alerts/${enc(params.ruleId)}`, { token: await getToken() });
}

export async function listAlertFires(params: { ruleId: string }, getToken: GetToken) {
  return httpGET<ListResponse<AlertFire>>(`${SERVICE_BASE}/alerts/${enc(params.ruleId)}/fires`, { token: await getToken() });
}

export async function ackAlertFire(params: { ruleId: string; fireId: string }, getToken: GetToken) {
  return httpPOST<AlertFire>(`${SERVICE_BASE}/alerts/${enc(params.ruleId)}/fires/${enc(params.fireId)}/ack`, { token: await getToken(), body: {} });
}

export async function listSLOs(getToken: GetToken) {
  return httpGET<ListResponse<Slo>>(`${SERVICE_BASE}/slos`, { token: await getToken() });
}

export async function createSLO(body: SloInput, getToken: GetToken) {
  return httpPOST<Slo>(`${SERVICE_BASE}/slos`, { token: await getToken(), body });
}

export async function getSLOStatus(params: { sloId: string }, getToken: GetToken) {
  return httpGET<SloStatus>(`${SERVICE_BASE}/slos/${enc(params.sloId)}/status`, { token: await getToken() });
}

