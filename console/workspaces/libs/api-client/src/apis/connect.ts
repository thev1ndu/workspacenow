import type { Api, ApiOperation, Integration, ListResponse, McpServer, McpTool, OperationResult } from "@workspacenow/types";
import { enc, httpGET, httpPATCH, httpPOST, SERVICE_BASE, type GetToken } from "../utils/http";

export async function listApis(getToken: GetToken) {
  return httpGET<ListResponse<Api>>(`${SERVICE_BASE}/apis`, { token: await getToken() });
}

export async function getApi(params: { apiId: string }, getToken: GetToken) {
  return httpGET<Api>(`${SERVICE_BASE}/apis/${enc(params.apiId)}`, { token: await getToken() });
}

export async function listApiOperations(query: { apiId?: string }, getToken: GetToken) {
  return httpGET<ListResponse<ApiOperation>>(`${SERVICE_BASE}/api-operations`, {
    token: await getToken(),
    searchParams: query,
  });
}

export async function updateMcpExposure(
  params: { operationId: string },
  body: { enabled: boolean; toolName?: string; description?: string },
  getToken: GetToken,
) {
  return httpPATCH<ApiOperation>(`${SERVICE_BASE}/api-operations/${enc(params.operationId)}/mcp`, {
    token: await getToken(),
    body,
  });
}

export async function invokeApiOperation(
  params: { operationId: string },
  body: { input: Record<string, unknown> },
  getToken: GetToken,
) {
  return httpPOST<OperationResult>(`${SERVICE_BASE}/api-operations/${enc(params.operationId)}/invoke`, {
    token: await getToken(),
    body,
  });
}

export async function listMcpTools(getToken: GetToken) {
  return httpGET<ListResponse<McpTool>>(`${SERVICE_BASE}/mcp/tools`, { token: await getToken() });
}

export async function listMcpServers(getToken: GetToken) {
  return httpGET<ListResponse<McpServer>>(`${SERVICE_BASE}/mcp/servers`, { token: await getToken() });
}

export async function registerMcpServer(
  body: { name: string; url: string; auth: McpServer["auth"] },
  getToken: GetToken,
) {
  return httpPOST<McpServer>(`${SERVICE_BASE}/mcp/servers`, { token: await getToken(), body });
}

export async function listIntegrations(getToken: GetToken) {
  return httpGET<ListResponse<Integration>>(`${SERVICE_BASE}/integrations`, { token: await getToken() });
}

export async function testIntegration(params: { integrationId: string }, getToken: GetToken) {
  return httpPOST<Integration>(`${SERVICE_BASE}/integrations/${enc(params.integrationId)}/test`, {
    token: await getToken(),
  });
}
