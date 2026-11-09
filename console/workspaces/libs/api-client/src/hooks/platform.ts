import { useQuery } from "@tanstack/react-query";
import { useAuthHooks } from "@workspacenow/auth";
import type { GroupInput, GroupRoleMapping } from "@workspacenow/types";
import * as api from "../apis/platform";
import { useApiMutation, useApiQuery } from "./react-query-notifications";

export function useSession() {
  const { getToken, userInfo } = useAuthHooks();
  return useApiQuery({ queryKey: ["session", userInfo?.id], queryFn: () => api.getSession(getToken), enabled: !!userInfo });
}

/** Whether the signed-in user holds a permission; the platform still enforces it on every call.
 *  The "*" wildcard (system bootstrap role) grants everything. */
export function hasPermission(permissions: string[] | undefined, permission: string): boolean {
  return !!permissions && (permissions.includes("*") || permissions.includes(permission));
}

export function useCan(permission: string): boolean {
  const { data } = useSession();
  return hasPermission(data?.permissions, permission);
}

export function useListPersonas() {
  return useQuery({ queryKey: ["personas"], queryFn: () => api.listPersonas() });
}

export function useOverview() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["overview"], queryFn: () => api.getOverview(getToken) });
}

export function useListResources() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["resources"], queryFn: () => api.listResources(getToken) });
}

export function useListEvents(query: { applicationId?: string; limit?: number; offset?: number } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["events", query], queryFn: () => api.listEvents(query, getToken) });
}

export function useListHealth() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["health"], queryFn: () => api.listHealth(getToken) });
}

export function useOrganization() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["organization"], queryFn: () => api.getOrganization(getToken) });
}

export function useCreateDepartment() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (d) => `Department ${d.name} created`,
    mutationFn: (body: { name: string; description?: string }) => api.createDepartment(body, getToken),
  });
}

export function useListDepartments() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["departments"], queryFn: () => api.listDepartments(getToken) });
}

export function useListTeams() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["teams"], queryFn: () => api.listTeams(getToken) });
}

export function useListUsers() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["users"], queryFn: () => api.listUsers(getToken) });
}

export function useListRoles() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["roles"], queryFn: () => api.listRoles(getToken) });
}

export function useListGroupMappings() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["group-mappings"], queryFn: () => api.listGroupMappings(getToken) });
}

export function useUpdateUserRoles() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "user roles" },
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) => api.updateUserRoles(userId, roleIds, getToken),
  });
}

export function useListGroups() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["groups"], queryFn: () => api.listGroups(getToken) });
}

export function useCreateGroup() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "create", target: "group" },
    mutationFn: (input: GroupInput) => api.createGroup(input, getToken),
  });
}

export function useUpdateGroup() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "group" },
    mutationFn: ({ groupId, input }: { groupId: string; input: GroupInput }) => api.updateGroup(groupId, input, getToken),
  });
}

export function useDeleteGroup() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "delete", target: "group" },
    mutationFn: (groupId: string) => api.deleteGroup(groupId, getToken),
  });
}

export function useUpdateGroupMappings() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "group mappings" },
    mutationFn: (mappings: GroupRoleMapping[]) => api.updateGroupMappings(mappings, getToken),
  });
}

export function useListEnvironments() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["environments"], queryFn: () => api.listEnvironments(getToken) });
}

export function useResetDemo() {
  return useApiMutation({
    action: { verb: "reset", target: "demo data" },
    mutationFn: () => api.resetDemo(),
  });
}

export function useActivity(query: { days?: number } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["analytics", "activity", query], queryFn: () => api.getActivity(query, getToken) });
}

export function useLogMetrics(query: { days?: number } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["analytics", "log-metrics", query], queryFn: () => api.getLogMetrics(query, getToken) });
}

export function useTokenUsage(query: { days?: number } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["analytics", "tokens", query], queryFn: () => api.getTokenUsage(query, getToken) });
}

export function useEntryPointBreakdown() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["analytics", "entry-points"], queryFn: () => api.getEntryPointBreakdown(getToken) });
}

/** Global search across resources, people and readable records; idle until there is a query. */
export function useSearch(q: string) {
  const { getToken } = useAuthHooks();
  const query = q.trim();
  return useApiQuery({
    queryKey: ["search", query],
    queryFn: () => api.search({ q: query }, getToken),
    enabled: query.length > 0,
    placeholderData: (previous) => previous,
  });
}

export function useOrganizationTheme() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["organization-theme"], queryFn: () => api.getOrganizationTheme(getToken) });
}

export function useUpdateOrganizationTheme() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    mutationFn: (body: import("@workspacenow/types").Theme) => api.updateOrganizationTheme(body, getToken),
  });
}
