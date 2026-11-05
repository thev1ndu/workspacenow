import { useAuthHooks } from "@workspacenow/auth";
import type { ApplicationPlan, EnvironmentKey } from "@workspacenow/types";
import * as api from "../apis/studio";
import { useApiMutation, useApiQuery } from "./react-query-notifications";

export function useListApplications() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["applications"], queryFn: () => api.listApplications(getToken) });
}

export function useGetApplication(params: { appId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["applications", params],
    queryFn: () => api.getApplication({ appId: params.appId! }, getToken),
    enabled: !!params.appId,
  });
}

export function usePlanApplication() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    showSuccess: false,
    mutationFn: (prompt: string) => api.planApplication({ prompt }, getToken),
  });
}

export function useApplyApplicationPlan() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "create", target: "application" },
    mutationFn: (plan: ApplicationPlan) => api.applyApplicationPlan({ plan }, getToken),
  });
}

export function useUpdateApplication() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "application" },
    mutationFn: ({ appId, plan }: { appId: string; plan: ApplicationPlan }) => api.updateApplication({ appId }, { plan }, getToken),
  });
}

export function useListReleases(params: { appId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["releases", params],
    queryFn: () => api.listReleases({ appId: params.appId! }, getToken),
    enabled: !!params.appId,
  });
}

export function useCreateRelease() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (release) => `Release ${release.version} created`,
    mutationFn: ({ appId, notes }: { appId: string; notes: string }) => api.createRelease({ appId }, { notes }, getToken),
  });
}

export function useListDeployments(query: { applicationId?: string } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["deployments", query], queryFn: () => api.listDeployments(query, getToken) });
}

export function useCreateDeployment() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (d) => `Deployed ${d.version} to ${d.environment}`,
    mutationFn: (body: { applicationId: string; environment: EnvironmentKey; version: string }) =>
      api.createDeployment(body, getToken),
  });
}

export function useListPinnedApplications() {
  const { getToken, userInfo } = useAuthHooks();
  return useApiQuery({
    queryKey: ["pinned-applications", userInfo?.id],
    queryFn: () => api.listPinnedApplications(getToken),
    enabled: !!userInfo,
  });
}

export function useSetApplicationPinned() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (_pins, { name, pinned }) => (pinned ? `Pinned ${name}` : `Unpinned ${name}`),
    mutationFn: ({ appId, pinned }: { appId: string; name: string; pinned: boolean }) =>
      pinned ? api.pinApplication({ appId }, getToken) : api.unpinApplication({ appId }, getToken),
  });
}
