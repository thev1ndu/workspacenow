import type {
  BusinessOperationDescriptor,
  DatabaseConnection,
  Entity,
  EntityRecord,
  EntryPoint,
  FieldValue,
  ListResponse,
  OperationResult,
} from "@workspacenow/types";
import { enc, httpDELETE, httpGET, httpPATCH, httpPOST, SERVICE_BASE, type GetToken } from "../utils/http";

export async function listEntities(getToken: GetToken) {
  return httpGET<ListResponse<Entity>>(`${SERVICE_BASE}/entities`, { token: await getToken() });
}

export async function getEntity(params: { entityName: string }, getToken: GetToken) {
  return httpGET<Entity>(`${SERVICE_BASE}/entities/${enc(params.entityName)}`, { token: await getToken() });
}

export type CreateEntityBody = Pick<Entity, "name" | "label" | "description" | "fields" | "scope"> & {
  ownerApplicationId?: string;
};

export async function createEntity(body: CreateEntityBody, getToken: GetToken) {
  return httpPOST<Entity>(`${SERVICE_BASE}/entities`, { token: await getToken(), body });
}

export async function updateEntity(
  params: { entityName: string },
  body: Partial<Pick<Entity, "fields" | "description" | "readPermission" | "writePermission">>,
  getToken: GetToken,
) {
  return httpPATCH<Entity>(`${SERVICE_BASE}/entities/${enc(params.entityName)}`, { token: await getToken(), body });
}

export async function listRecords(params: { entityName: string }, getToken: GetToken) {
  return httpGET<ListResponse<EntityRecord>>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/records`, {
    token: await getToken(),
  });
}

export async function createRecord(
  params: { entityName: string },
  body: { values: Record<string, FieldValue> },
  getToken: GetToken,
) {
  return httpPOST<EntityRecord>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/records`, {
    token: await getToken(),
    body,
  });
}

export async function updateRecord(
  params: { entityName: string; recordId: string },
  body: { values: Record<string, FieldValue> },
  getToken: GetToken,
) {
  return httpPATCH<EntityRecord>(
    `${SERVICE_BASE}/entities/${enc(params.entityName)}/records/${enc(params.recordId)}`,
    { token: await getToken(), body },
  );
}

export async function listConnections(getToken: GetToken) {
  return httpGET<ListResponse<DatabaseConnection>>(`${SERVICE_BASE}/connections`, { token: await getToken() });
}

export async function listBusinessOperations(getToken: GetToken) {
  return httpGET<ListResponse<BusinessOperationDescriptor>>(`${SERVICE_BASE}/business-operations`, {
    token: await getToken(),
  });
}

export async function invokeBusinessOperation(
  body: { operation: string; input: Record<string, unknown>; entryPoint: EntryPoint },
  getToken: GetToken,
) {
  return httpPOST<OperationResult>(`${SERVICE_BASE}/business-operations/invoke`, { token: await getToken(), body });
}

export async function deleteRecord(params: { entityName: string; recordId: string }, getToken: GetToken) {
  return httpDELETE<{ id: string; deleted: true }>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/records/${enc(params.recordId)}`, {
    token: await getToken(),
  });
}
