import { useAuthHooks } from "@workspacenow/auth";
import type { Agent } from "@workspacenow/types";
import * as api from "../apis/ai";
import { useApiMutation, useApiQuery } from "./react-query-notifications";

export function useListModelProviders() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["model-providers"], queryFn: () => api.listModelProviders(getToken) });
}

export function useListAgents() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["agents"], queryFn: () => api.listAgents(getToken) });
}

export function useGetAgent(params: { agentId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["agents", params],
    queryFn: () => api.getAgent({ agentId: params.agentId! }, getToken),
    enabled: !!params.agentId,
  });
}

export function useUpdateAgent() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "agent" },
    mutationFn: ({ agentId, ...body }: { agentId: string } & Partial<Pick<Agent, "tools" | "permissions" | "instructions" | "model" | "status">>) =>
      api.updateAgent({ agentId }, body, getToken),
  });
}

export function useRunAgent() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    showSuccess: false,
    mutationFn: ({ agentId, prompt }: { agentId: string; prompt: string }) => api.runAgent({ agentId }, { prompt }, getToken),
  });
}

/** Asks Sidekick, which acts as the signed-in user with no more than their permissions. */
export function useRunSidekick() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    showSuccess: false,
    mutationFn: (prompt: string) => api.runSidekick({ prompt }, getToken),
  });
}

export function useListAgentRuns(query: { agentId?: string } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["agent-runs", query], queryFn: () => api.listAgentRuns(query, getToken) });
}

export function useGetAgentRun(params: { runId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["agent-runs", params],
    queryFn: () => api.getAgentRun({ runId: params.runId! }, getToken),
    enabled: !!params.runId,
  });
}
