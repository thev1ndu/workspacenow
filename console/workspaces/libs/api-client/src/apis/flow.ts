import type { Approval, ListResponse, Workflow, WorkflowDefinition, WorkflowExecution } from "@workspacenow/types";
import { enc, httpGET, httpPATCH, httpPOST, SERVICE_BASE, qs, type GetToken } from "../utils/http";

export async function listWorkflows(getToken: GetToken) {
  return httpGET<ListResponse<Workflow>>(`${SERVICE_BASE}/workflows`, { token: await getToken() });
}

export async function getWorkflow(params: { workflowId: string }, getToken: GetToken) {
  return httpGET<Workflow>(`${SERVICE_BASE}/workflows/${enc(params.workflowId)}`, { token: await getToken() });
}

export async function updateWorkflow(
  params: { workflowId: string },
  body: { status: Workflow["status"] },
  getToken: GetToken,
) {
  return httpPATCH<Workflow>(`${SERVICE_BASE}/workflows/${enc(params.workflowId)}`, { token: await getToken(), body });
}

/** Creates a workflow (no id) or saves a new version of one. */
export async function saveWorkflow(params: { workflowId?: string }, body: { definition: WorkflowDefinition }, getToken: GetToken) {
  if (params.workflowId) {
    return httpPATCH<Workflow>(`${SERVICE_BASE}/workflows/${enc(params.workflowId)}`, { token: await getToken(), body });
  }
  return httpPOST<Workflow>(`${SERVICE_BASE}/workflows`, { token: await getToken(), body });
}

export async function startWorkflow(
  params: { workflowId: string },
  body: { input: Record<string, unknown> },
  getToken: GetToken,
) {
  return httpPOST<WorkflowExecution>(`${SERVICE_BASE}/workflows/${enc(params.workflowId)}/executions`, {
    token: await getToken(),
    body,
  });
}

export async function listExecutions(query: { workflowId?: string }, getToken: GetToken) {
  return httpGET<ListResponse<WorkflowExecution>>(`${SERVICE_BASE}/executions`, {
    token: await getToken(),
    searchParams: query,
  });
}

export async function getExecution(params: { executionId: string }, getToken: GetToken) {
  return httpGET<WorkflowExecution>(`${SERVICE_BASE}/executions/${enc(params.executionId)}`, { token: await getToken() });
}

export async function listApprovals(query: { status?: Approval["status"]; applicationId?: string; limit?: number; offset?: number }, getToken: GetToken) {
  return httpGET<ListResponse<Approval>>(`${SERVICE_BASE}/approvals`, { token: await getToken(), searchParams: qs(query) });
}

export async function decideApproval(
  params: { approvalId: string },
  body: { decision: "approved" | "rejected"; comment: string },
  getToken: GetToken,
) {
  return httpPOST<Approval>(`${SERVICE_BASE}/approvals/${enc(params.approvalId)}/decision`, {
    token: await getToken(),
    body,
  });
}
