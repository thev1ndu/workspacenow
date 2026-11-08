import type {
  ActivityPoint, LogMetricPoint,
  Department,
  EntryPointBreakdown,
  Environment,
  Group, GroupInput, GroupRoleMapping,
  HealthSignal,
  ListResponse,
  Organization,
  OverviewStats,
  PlatformEvent,
  ResourceSummary,
  SearchHit,
  Role,
  Session,
  Team,
  TokenUsagePoint,
  User,
} from "@workspacenow/types";
import { httpDELETE, httpGET, httpPOST, httpPUT, SERVICE_BASE, qs, type GetToken } from "../utils/http";

export type UserWithRoles = User & { roles: string[] };

export async function getSession(getToken: GetToken) {
  return httpGET<Session>(`${SERVICE_BASE}/session`, { token: await getToken() });
}

export async function listPersonas() {
  return httpGET<ListResponse<User>>(`${SERVICE_BASE}/personas`);
}

export async function getOverview(getToken: GetToken) {
  return httpGET<OverviewStats>(`${SERVICE_BASE}/overview`, { token: await getToken() });
}

export async function listResources(getToken: GetToken) {
  return httpGET<ListResponse<ResourceSummary>>(`${SERVICE_BASE}/resources`, { token: await getToken() });
}

export async function listEvents(query: { applicationId?: string; limit?: number; offset?: number }, getToken: GetToken) {
  return httpGET<ListResponse<PlatformEvent>>(`${SERVICE_BASE}/events`, {
    token: await getToken(),
    searchParams: qs(query),
  });
}

export async function listHealth(getToken: GetToken) {
  return httpGET<ListResponse<HealthSignal>>(`${SERVICE_BASE}/health`, { token: await getToken() });
}

export async function getOrganization(getToken: GetToken) {
  return httpGET<Organization>(`${SERVICE_BASE}/organization`, { token: await getToken() });
}

export async function listDepartments(getToken: GetToken) {
  return httpGET<ListResponse<Department>>(`${SERVICE_BASE}/departments`, { token: await getToken() });
}

export async function listTeams(getToken: GetToken) {
  return httpGET<ListResponse<Team>>(`${SERVICE_BASE}/teams`, { token: await getToken() });
}

export async function listUsers(getToken: GetToken) {
  return httpGET<ListResponse<UserWithRoles>>(`${SERVICE_BASE}/users`, { token: await getToken() });
}

export async function listRoles(getToken: GetToken) {
  return httpGET<ListResponse<Role>>(`${SERVICE_BASE}/roles`, { token: await getToken() });
}

export async function listGroupMappings(getToken: GetToken) {
  return httpGET<ListResponse<GroupRoleMapping>>(`${SERVICE_BASE}/group-mappings`, { token: await getToken() });
}

export async function updateUserRoles(userId: string, roleIds: string[], getToken: GetToken) {
  return httpPUT<UserWithRoles>(`${SERVICE_BASE}/users/${encodeURIComponent(userId)}/roles`, {
    token: await getToken(),
    body: { roles: roleIds },
  });
}

export async function listGroups(getToken: GetToken) {
  return httpGET<ListResponse<Group>>(`${SERVICE_BASE}/groups`, { token: await getToken() });
}

export async function createGroup(input: GroupInput, getToken: GetToken) {
  return httpPOST<Group>(`${SERVICE_BASE}/groups`, { token: await getToken(), body: input });
}

export async function updateGroup(groupId: string, input: GroupInput, getToken: GetToken) {
  return httpPUT<Group>(`${SERVICE_BASE}/groups/${encodeURIComponent(groupId)}`, { token: await getToken(), body: input });
}

export async function deleteGroup(groupId: string, getToken: GetToken) {
  return httpDELETE(`${SERVICE_BASE}/groups/${encodeURIComponent(groupId)}`, { token: await getToken() });
}

export async function updateGroupMappings(mappings: GroupRoleMapping[], getToken: GetToken) {
  return httpPUT<ListResponse<GroupRoleMapping>>(`${SERVICE_BASE}/group-mappings`, {
    token: await getToken(),
    body: { mappings },
  });
}

export async function listEnvironments(getToken: GetToken) {
  return httpGET<ListResponse<Environment>>(`${SERVICE_BASE}/environments`, { token: await getToken() });
}

export async function resetDemo() {
  return httpPOST<{ reset: boolean }>(`${SERVICE_BASE}/demo/reset`);
}

export async function getActivity(query: { days?: number }, getToken: GetToken) {
  return httpGET<ListResponse<ActivityPoint>>(`${SERVICE_BASE}/analytics/activity`, {
    token: await getToken(),
    searchParams: { days: query.days?.toString() },
  });
}

export async function getTokenUsage(query: { days?: number }, getToken: GetToken) {
  return httpGET<ListResponse<TokenUsagePoint>>(`${SERVICE_BASE}/analytics/tokens`, {
    token: await getToken(),
    searchParams: { days: query.days?.toString() },
  });
}

export async function getLogMetrics(query: { days?: number }, getToken: GetToken) {
  return httpGET<ListResponse<LogMetricPoint>>(`${SERVICE_BASE}/analytics/log-metrics`, {
    token: await getToken(),
    searchParams: { days: query.days?.toString() },
  });
}

export async function getEntryPointBreakdown(getToken: GetToken) {
  return httpGET<ListResponse<EntryPointBreakdown>>(`${SERVICE_BASE}/analytics/entry-points`, { token: await getToken() });
}

export async function search(query: { q: string; limit?: number }, getToken: GetToken) {
  return httpGET<ListResponse<SearchHit>>(`${SERVICE_BASE}/search`, {
    token: await getToken(),
    searchParams: { q: query.q, limit: query.limit?.toString() },
  });
}
