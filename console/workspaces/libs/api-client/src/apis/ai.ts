import type { Agent, AgentRun, ListResponse, ModelProvider } from "@workspacenow/types";
import { enc, httpGET, httpPATCH, httpPOST, SERVICE_BASE, type GetToken } from "../utils/http";

export async function listModelProviders(getToken: GetToken) {
  return httpGET<ListResponse<ModelProvider>>(`${SERVICE_BASE}/model-providers`, { token: await getToken() });
}

export async function listAgents(getToken: GetToken) {
  return httpGET<ListResponse<Agent>>(`${SERVICE_BASE}/agents`, { token: await getToken() });
}

export async function getAgent(params: { agentId: string }, getToken: GetToken) {
  return httpGET<Agent>(`${SERVICE_BASE}/agents/${enc(params.agentId)}`, { token: await getToken() });
}

export async function updateAgent(
  params: { agentId: string },
  body: Partial<Pick<Agent, "tools" | "permissions" | "instructions" | "model" | "status">>,
  getToken: GetToken,
) {
  return httpPATCH<Agent>(`${SERVICE_BASE}/agents/${enc(params.agentId)}`, { token: await getToken(), body });
}

export async function runAgent(params: { agentId: string }, body: { prompt: string }, getToken: GetToken) {
  return httpPOST<AgentRun>(`${SERVICE_BASE}/agents/${enc(params.agentId)}/runs`, { token: await getToken(), body });
}

export async function listAgentRuns(query: { agentId?: string }, getToken: GetToken) {
  return httpGET<ListResponse<AgentRun>>(`${SERVICE_BASE}/agent-runs`, { token: await getToken(), searchParams: query });
}

export async function getAgentRun(params: { runId: string }, getToken: GetToken) {
  return httpGET<AgentRun>(`${SERVICE_BASE}/agent-runs/${enc(params.runId)}`, { token: await getToken() });
}

export async function runSidekick(body: { prompt: string; applicationId?: string }, getToken: GetToken) {
  return httpPOST<AgentRun>(`${SERVICE_BASE}/sidekick/runs`, { token: await getToken(), body });
}
