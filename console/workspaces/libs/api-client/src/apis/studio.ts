import type { Application, ApplicationPlan, Deployment, EnvironmentKey, ListResponse, Release } from "@workspacenow/types";
import { enc, httpDELETE, httpGET, httpPOST, httpPUT, SERVICE_BASE, type GetToken } from "../utils/http";

export async function listApplications(getToken: GetToken) {
  return httpGET<ListResponse<Application>>(`${SERVICE_BASE}/applications`, { token: await getToken() });
}

export async function getApplication(params: { appId: string }, getToken: GetToken) {
  return httpGET<Application>(`${SERVICE_BASE}/applications/${enc(params.appId)}`, { token: await getToken() });
}

export async function planApplication(body: { prompt: string }, getToken: GetToken) {
  return httpPOST<ApplicationPlan>(`${SERVICE_BASE}/applications/plan`, { token: await getToken(), body });
}

export async function planApplicationEdit(params: { appId: string }, body: { prompt: string }, getToken: GetToken) {
  return httpPOST<ApplicationPlan>(`${SERVICE_BASE}/applications/${enc(params.appId)}/plan`, { token: await getToken(), body });
}

export async function applyApplicationPlan(body: { plan: ApplicationPlan }, getToken: GetToken) {
  return httpPOST<Application>(`${SERVICE_BASE}/applications`, { token: await getToken(), body });
}

export async function updateApplication(params: { appId: string }, body: { plan: ApplicationPlan }, getToken: GetToken) {
  return httpPUT<Application>(`${SERVICE_BASE}/applications/${enc(params.appId)}`, { token: await getToken(), body });
}

export async function listReleases(params: { appId: string }, getToken: GetToken) {
  return httpGET<ListResponse<Release>>(`${SERVICE_BASE}/applications/${enc(params.appId)}/releases`, {
    token: await getToken(),
  });
}

export async function createRelease(params: { appId: string }, body: { notes: string }, getToken: GetToken) {
  return httpPOST<Release>(`${SERVICE_BASE}/applications/${enc(params.appId)}/releases`, {
    token: await getToken(),
    body,
  });
}

export async function listDeployments(query: { applicationId?: string }, getToken: GetToken) {
  return httpGET<ListResponse<Deployment>>(`${SERVICE_BASE}/deployments`, {
    token: await getToken(),
    searchParams: query,
  });
}

export async function createDeployment(
  body: { applicationId: string; environment: EnvironmentKey; version: string },
  getToken: GetToken,
) {
  return httpPOST<Deployment>(`${SERVICE_BASE}/deployments`, { token: await getToken(), body });
}

export async function listPinnedApplications(getToken: GetToken) {
  return httpGET<ListResponse<string>>(`${SERVICE_BASE}/me/pinned-applications`, { token: await getToken() });
}

export async function pinApplication(params: { appId: string }, getToken: GetToken) {
  return httpPUT<ListResponse<string>>(`${SERVICE_BASE}/me/pinned-applications/${enc(params.appId)}`, { token: await getToken() });
}

export async function unpinApplication(params: { appId: string }, getToken: GetToken) {
  return httpDELETE<ListResponse<string>>(`${SERVICE_BASE}/me/pinned-applications/${enc(params.appId)}`, { token: await getToken() });
}
