import { useAuthHooks } from "@workspacenow/auth";
import type { Entity, EntryPoint, FieldValue, InferEntityInput, SavedViewInput, SchemaMigration } from "@workspacenow/types";
import * as api from "../apis/data";
import { useApiMutation, useApiQuery } from "./react-query-notifications";

export function useListEntities() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["entities"], queryFn: () => api.listEntities(getToken) });
}

export function useGetEntity(params: { entityName?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["entities", params],
    queryFn: () => api.getEntity({ entityName: params.entityName! }, getToken),
    enabled: !!params.entityName,
  });
}

export function useCreateEntity() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "create", target: "entity" },
    mutationFn: (body: api.CreateEntityBody) => api.createEntity(body, getToken),
  });
}

export function useUpdateEntity() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "entity" },
    mutationFn: ({ entityName, ...body }: { entityName: string } & Partial<Pick<Entity, "fields" | "description">>) =>
      api.updateEntity({ entityName }, body, getToken),
  });
}

export function useListRecords(params: {
  entityName?: string;
  q?: string;
  view?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["records", params],
    queryFn: () =>
      api.listRecords(
        { entityName: params.entityName!, q: params.q, view: params.view, includeDeleted: params.includeDeleted, limit: params.limit, offset: params.offset },
        getToken,
      ),
    enabled: !!params.entityName,
  });
}

export function useRecordHistory(params: { entityName?: string; recordId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["recordHistory", params],
    queryFn: () => api.recordHistory({ entityName: params.entityName!, recordId: params.recordId! }, getToken),
    enabled: !!params.entityName && !!params.recordId,
  });
}

export function useRestoreRecord() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "record" },
    mutationFn: ({ entityName, recordId }: { entityName: string; recordId: string }) =>
      api.restoreRecord({ entityName, recordId }, getToken),
  });
}

export function useImportRecords() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "create", target: "record" },
    mutationFn: ({ entityName, format, data }: { entityName: string; format?: "json" | "csv"; data: string }) =>
      api.importRecords({ entityName }, { format, data }, getToken),
  });
}

export function useMigrateEntity() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "entity" },
    mutationFn: ({ entityName, ...body }: { entityName: string } & SchemaMigration) =>
      api.migrateEntity({ entityName }, body, getToken),
  });
}

export function useListViews(params: { entityName?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["views", params],
    queryFn: () => api.listViews({ entityName: params.entityName! }, getToken),
    enabled: !!params.entityName,
  });
}

export function useCreateView() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "create", target: "view" },
    mutationFn: ({ entityName, ...body }: { entityName: string } & SavedViewInput) =>
      api.createView({ entityName }, body, getToken),
  });
}

export function useUpdateView() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "view" },
    mutationFn: ({ entityName, viewId, body }: { entityName: string; viewId: string; body: SavedViewInput }) =>
      api.updateView({ entityName, viewId }, body, getToken),
  });
}

export function useListEntityVersions(params: { entityName?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["entity-versions", params.entityName],
    queryFn: () => api.listEntityVersions({ entityName: params.entityName! }, getToken),
    enabled: !!params.entityName,
  });
}

export function usePurgeRecords() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (data) => `Purged ${data.purged} deleted records`,
    mutationFn: ({ entityName, olderThanDays }: { entityName: string; olderThanDays?: number }) => api.purgeRecords({ entityName, olderThanDays }, getToken),
  });
}

export function useDeleteView() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "view" },
    mutationFn: ({ entityName, viewId }: { entityName: string; viewId: string }) =>
      api.deleteView({ entityName, viewId }, getToken),
  });
}

export function useRunView() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    showSuccess: false,
    mutationFn: ({ entityName, viewId, includeDeleted }: { entityName: string; viewId: string; includeDeleted?: boolean }) =>
      api.runView({ entityName, viewId, includeDeleted }, getToken),
  });
}

export function useCreateRecord() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "create", target: "record" },
    mutationFn: ({ entityName, values }: { entityName: string; values: Record<string, FieldValue> }) =>
      api.createRecord({ entityName }, { values }, getToken),
  });
}

export function useUpdateRecord() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "record" },
    mutationFn: ({ entityName, recordId, values }: { entityName: string; recordId: string; values: Record<string, FieldValue> }) =>
      api.updateRecord({ entityName, recordId }, { values }, getToken),
  });
}

export function useDeleteRecord() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (_r, { recordId }) => `Deleted ${recordId}`,
    mutationFn: ({ entityName, recordId }: { entityName: string; recordId: string }) => api.deleteRecord({ entityName, recordId }, getToken),
  });
}

export function useListConnections() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["connections"], queryFn: () => api.listConnections(getToken) });
}

export function useListBusinessOperations() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["business-operations"], queryFn: () => api.listBusinessOperations(getToken) });
}

export function useInvokeBusinessOperation(options: { successMessage?: string } = {}) {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "invoke", target: "operation" },
    successMessage: options.successMessage,
    mutationFn: (body: { operation: string; input: Record<string, unknown>; entryPoint: EntryPoint }) =>
      api.invokeBusinessOperation(body, getToken),
  });
}

export function useInferEntity() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    mutationFn: (body: InferEntityInput) => api.inferEntity(body, getToken),
  });
}

export function useCreateViewFromText() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    mutationFn: ({ entityName, text }: { entityName: string; text: string }) => api.createViewFromText({ entityName }, { text }, getToken),
  });
}
