import { useAuthHooks } from "@workspacenow/auth";
import type { Entity, EntryPoint, FieldValue } from "@workspacenow/types";
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

export function useListRecords(params: { entityName?: string; q?: string; limit?: number; offset?: number }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["records", params],
    queryFn: () => api.listRecords({ entityName: params.entityName! }, getToken),
    enabled: !!params.entityName,
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
