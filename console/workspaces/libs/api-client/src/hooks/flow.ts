import { useAuthHooks } from "@workspacenow/auth";
import type { Approval, Workflow, WorkflowDefinition } from "@workspacenow/types";
import * as api from "../apis/flow";
import { useApiMutation, useApiQuery } from "./react-query-notifications";

export function useListWorkflows() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["workflows"], queryFn: () => api.listWorkflows(getToken) });
}

export function useGetWorkflow(params: { workflowId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["workflows", params],
    queryFn: () => api.getWorkflow({ workflowId: params.workflowId! }, getToken),
    enabled: !!params.workflowId,
  });
}

export function useUpdateWorkflow() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (w) => `${w.name} is ${w.status}`,
    mutationFn: ({ workflowId, status }: { workflowId: string; status: Workflow["status"] }) =>
      api.updateWorkflow({ workflowId }, { status }, getToken),
  });
}

export function useStartWorkflow() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (e) => (e.status === "failed" ? "Workflow run failed" : `Workflow run ${e.status}`),
    successSeverity: (e) => (e.status === "failed" ? "error" : "success"),
    mutationFn: ({ workflowId, input }: { workflowId: string; input: Record<string, unknown> }) =>
      api.startWorkflow({ workflowId }, { input }, getToken),
  });
}

export function useListExecutions(query: { workflowId?: string } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["executions", query], queryFn: () => api.listExecutions(query, getToken) });
}

export function useGetExecution(params: { executionId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["executions", params],
    queryFn: () => api.getExecution({ executionId: params.executionId! }, getToken),
    enabled: !!params.executionId,
  });
}

export function useListApprovals(query: { status?: Approval["status"]; limit?: number; offset?: number } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["approvals", query], queryFn: () => api.listApprovals(query, getToken) });
}

export function useDecideApproval() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (a) => `Request ${a.status}`,
    mutationFn: ({ approvalId, ...body }: { approvalId: string; decision: "approved" | "rejected"; comment: string }) =>
      api.decideApproval({ approvalId }, body, getToken),
  });
}

export function useSaveWorkflow() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (w) => `${w.name} saved as version ${w.version}`,
    mutationFn: ({ workflowId, definition }: { workflowId?: string; definition: WorkflowDefinition }) => api.saveWorkflow({ workflowId }, { definition }, getToken),
  });
}
