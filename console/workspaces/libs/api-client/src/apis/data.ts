import { ApiError, globalConfig, type ApiErrorBody } from "@workspacenow/types";
import type {
  BusinessOperationDescriptor,
  DatabaseConnection,
  Entity,
  EntityRecord, EntityVersion, EntityVersionDiff,
  EntryPoint,
  FieldValue,
  ListResponse,
  OperationResult,
  RecordHistoryEntry,
  SavedView,
  SavedViewInput,
  SchemaMigration,
} from "@workspacenow/types";
import { enc, httpDELETE, httpGET, httpPATCH, httpPOST, httpPUT, requestRaw, SERVICE_BASE, qs, type GetToken } from "../utils/http";

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

export async function listRecords(
  params: { entityName: string; q?: string; view?: string; includeDeleted?: boolean; limit?: number; offset?: number },
  getToken: GetToken,
) {
  const { entityName, ...query } = params;
  return httpGET<ListResponse<EntityRecord>>(`${SERVICE_BASE}/entities/${enc(entityName)}/records`, {
    token: await getToken(),
    searchParams: qs(query),
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

/** Uploads a file for a record's file field; resolves with the updated record (its field holds the FileRef). */
export async function uploadRecordFile(
  params: { entityName: string; recordId: string; field: string; name: string },
  file: Uint8Array,
  getToken: GetToken,
) {
  const res = await requestRaw("POST", `${SERVICE_BASE}/entities/${enc(params.entityName)}/records/${enc(params.recordId)}/files/${enc(params.field)}`, {
    token: await getToken(),
    searchParams: { name: params.name },
    rawBody: file,
  });
  if (res.status >= 400) throw new ApiError(res.body as ApiErrorBody);
  return res.body as EntityRecord;
}

/** Downloads the file a record's file field references; resolves with the raw bytes. */
export async function downloadRecordFile(params: { entityName: string; recordId: string; field: string }, getToken: GetToken) {
  const res = await requestRaw("GET", `${SERVICE_BASE}/entities/${enc(params.entityName)}/records/${enc(params.recordId)}/files/${enc(params.field)}`, {
    token: await getToken(),
  });
  if (res.status >= 400) throw new ApiError(res.body as ApiErrorBody);
  return res;
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

export async function exportRecords(
  params: { entityName: string; format?: "json" | "csv"; view?: string },
  getToken: GetToken,
): Promise<{ body: string; contentType: string }> {
  const { entityName, ...query } = params;
  const base = globalConfig.apiBaseUrl?.replace(/\/+$/, "") ?? "";
  const token = await getToken();
  const res = await fetch(`${base}${SERVICE_BASE}/entities/${enc(entityName)}/records/export${qs(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await res.json().then((b) => new Error(b.message ?? `export answered ${res.status}`));
  return { body: await res.text(), contentType: res.headers.get("Content-Type") ?? "application/json" };
}

export async function importRecords(
  params: { entityName: string },
  body: { format?: "json" | "csv"; data: string },
  getToken: GetToken,
) {
  return httpPOST<{ created: number }>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/records/import`, {
    token: await getToken(),
    body,
  });
}

export async function recordHistory(params: { entityName: string; recordId: string }, getToken: GetToken) {
  return httpGET<ListResponse<RecordHistoryEntry>>(
    `${SERVICE_BASE}/entities/${enc(params.entityName)}/records/${enc(params.recordId)}/history`,
    { token: await getToken() },
  );
}

export async function restoreRecord(params: { entityName: string; recordId: string }, getToken: GetToken) {
  return httpPOST<EntityRecord>(
    `${SERVICE_BASE}/entities/${enc(params.entityName)}/records/${enc(params.recordId)}/restore`,
    { token: await getToken() },
  );
}

export async function migrateEntity(params: { entityName: string }, body: SchemaMigration, getToken: GetToken) {
  return httpPOST<Entity>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/migrate`, { token: await getToken(), body });
}

export async function listViews(params: { entityName: string }, getToken: GetToken) {
  return httpGET<ListResponse<SavedView>>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/views`, {
    token: await getToken(),
  });
}

export async function createView(params: { entityName: string }, body: SavedViewInput, getToken: GetToken) {
  return httpPOST<SavedView>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/views`, { token: await getToken(), body });
}

export async function updateView(params: { entityName: string; viewId: string }, body: SavedViewInput, getToken: GetToken) {
  return httpPUT<SavedView>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/views/${enc(params.viewId)}`, {
    token: await getToken(),
    body,
  });
}

export async function deleteView(params: { entityName: string; viewId: string }, getToken: GetToken) {
  return httpDELETE(`${SERVICE_BASE}/entities/${enc(params.entityName)}/views/${enc(params.viewId)}`, {
    token: await getToken(),
  });
}

export async function runView(params: { entityName: string; viewId: string; includeDeleted?: boolean }, getToken: GetToken) {
  const { entityName, viewId, ...query } = params;
  return httpPOST<ListResponse<EntityRecord>>(
    `${SERVICE_BASE}/entities/${enc(entityName)}/views/${enc(viewId)}/run${qs(query)}`,
    { token: await getToken() },
  );
}

export async function listEntityVersions(params: { entityName: string }, getToken: GetToken) {
  return httpGET<ListResponse<EntityVersion>>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/versions`, { token: await getToken() });
}

export async function diffEntityVersions(params: { entityName: string; from: number; to: number }, getToken: GetToken) {
  return httpGET<EntityVersionDiff>(
    `${SERVICE_BASE}/entities/${enc(params.entityName)}/versions/diff${qs({ from: String(params.from), to: String(params.to) })}`,
    { token: await getToken() },
  );
}

export async function purgeRecords(params: { entityName: string; olderThanDays?: number }, getToken: GetToken) {
  return httpPOST<{ purged: number }>(
    `${SERVICE_BASE}/entities/${enc(params.entityName)}/records/purge${qs({ olderThanDays: params.olderThanDays?.toString() })}`,
    { token: await getToken(), body: {} },
  );
}

export async function deleteRecord(params: { entityName: string; recordId: string }, getToken: GetToken) {
  return httpDELETE<{ id: string; deleted: true }>(`${SERVICE_BASE}/entities/${enc(params.entityName)}/records/${enc(params.recordId)}`, {
    token: await getToken(),
  });
}
