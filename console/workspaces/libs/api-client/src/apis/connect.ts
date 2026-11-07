import type {
  ApiKey,
  ApiVersion,
  ApiVersionInput,
  CreatedApiKey,
  PortalCatalogEntry,
  Webhook,
  WebhookDelivery,
  WebhookInput, Api, ApiOperation, Integration, IntegrationInput, ListResponse, McpServer, McpTool, OperationResult, SecretValues } from "@workspacenow/types";
import { enc, httpDELETE, httpGET, httpPATCH, httpPOST, httpPUT, SERVICE_BASE, qs, type GetToken } from "../utils/http";

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
  params: { operationId: string; version?: string },
  body: { input: Record<string, unknown> },
  getToken: GetToken,
) {
  const { version } = params;
  return httpPOST<OperationResult>(`${SERVICE_BASE}/api-operations/${enc(params.operationId)}/invoke`, {
    searchParams: qs({ version }),
    token: await getToken(),
    body,
  });
}

export async function listWebhooks(getToken: GetToken) {
  return httpGET<ListResponse<Webhook>>(`${SERVICE_BASE}/webhooks`, { token: await getToken() });
}
export async function createWebhook(body: WebhookInput, getToken: GetToken) {
  return httpPOST<Webhook>(`${SERVICE_BASE}/webhooks`, { token: await getToken(), body });
}
export async function updateWebhook(params: { webhookId: string }, body: WebhookInput, getToken: GetToken) {
  return httpPUT<Webhook>(`${SERVICE_BASE}/webhooks/${enc(params.webhookId)}`, { token: await getToken(), body });
}
export async function deleteWebhook(params: { webhookId: string }, getToken: GetToken) {
  return httpDELETE(`${SERVICE_BASE}/webhooks/${enc(params.webhookId)}`, { token: await getToken() });
}
export async function listWebhookDeliveries(params: { webhookId: string }, getToken: GetToken) {
  return httpGET<ListResponse<WebhookDelivery>>(`${SERVICE_BASE}/webhooks/${enc(params.webhookId)}/deliveries`, { token: await getToken() });
}
export async function replayWebhookDelivery(params: { webhookId: string; deliveryId: string }, getToken: GetToken) {
  return httpPOST<WebhookDelivery>(`${SERVICE_BASE}/webhooks/${enc(params.webhookId)}/deliveries/${enc(params.deliveryId)}/replay`, { token: await getToken() });
}
export async function testWebhook(params: { webhookId: string }, getToken: GetToken) {
  return httpPOST<WebhookDelivery>(`${SERVICE_BASE}/webhooks/${enc(params.webhookId)}/test`, { token: await getToken() });
}
export async function listApiVersions(params: { apiId: string }, getToken: GetToken) {
  return httpGET<ListResponse<ApiVersion>>(`${SERVICE_BASE}/apis/${enc(params.apiId)}/versions`, { token: await getToken() });
}
export async function createApiVersion(params: { apiId: string }, body: ApiVersionInput, getToken: GetToken) {
  return httpPOST<ApiVersion>(`${SERVICE_BASE}/apis/${enc(params.apiId)}/versions`, { token: await getToken(), body });
}
export async function updateApiVersion(params: { apiId: string; versionId: string }, body: ApiVersionInput, getToken: GetToken) {
  return httpPUT<ApiVersion>(`${SERVICE_BASE}/apis/${enc(params.apiId)}/versions/${enc(params.versionId)}`, { token: await getToken(), body });
}
export async function portalCatalog(getToken: GetToken) {
  return httpGET<ListResponse<PortalCatalogEntry>>(`${SERVICE_BASE}/portal/apis`, { token: await getToken() });
}
export async function listApiKeys(getToken: GetToken) {
  return httpGET<ListResponse<ApiKey>>(`${SERVICE_BASE}/api-keys`, { token: await getToken() });
}
export async function createApiKey(body: { name: string; permissions?: string[]; quotaPerHour?: number }, getToken: GetToken) {
  return httpPOST<CreatedApiKey>(`${SERVICE_BASE}/api-keys`, { token: await getToken(), body });
}
export async function revokeApiKey(params: { keyId: string }, getToken: GetToken) {
  return httpDELETE(`${SERVICE_BASE}/api-keys/${enc(params.keyId)}`, { token: await getToken() });
}
export async function executeGraphQL(body: { query: string }, getToken: GetToken) {
  return httpPOST<{ data: Record<string, unknown>; errors?: Array<{ message: string }> }>(`${SERVICE_BASE}/graphql`, {
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

export async function createIntegration(body: IntegrationInput, getToken: GetToken) {
  return httpPOST<Integration>(`${SERVICE_BASE}/integrations`, { token: await getToken(), body });
}

export async function updateIntegration(params: { integrationId: string }, body: IntegrationInput, getToken: GetToken) {
  return httpPUT<Integration>(`${SERVICE_BASE}/integrations/${enc(params.integrationId)}`, { token: await getToken(), body });
}

export async function listSecrets(query: { prefix?: string }, getToken: GetToken) {
  return httpGET<{ items: string[]; totalCount: number }>(`${SERVICE_BASE}/secrets`, {
    token: await getToken(),
    searchParams: { prefix: query.prefix },
  });
}

export async function readSecret(query: { path: string }, getToken: GetToken) {
  return httpGET<SecretValues>(`${SERVICE_BASE}/secrets/read`, { token: await getToken(), searchParams: { path: query.path } });
}

export async function testIntegration(params: { integrationId: string }, getToken: GetToken) {
  return httpPOST<Integration>(`${SERVICE_BASE}/integrations/${enc(params.integrationId)}/test`, {
    token: await getToken(),
  });
}
