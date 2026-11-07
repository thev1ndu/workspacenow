import { useAuthHooks } from "@workspacenow/auth";
import type { AlertRuleInput, SloInput } from "@workspacenow/types";
import * as api from "../apis/control";
import { listWebhooks } from "../apis/connect";
import { useApiMutation, useApiQuery } from "./react-query-notifications";

export function useListAlertRules() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["alert-rules"], queryFn: () => api.listAlertRules(getToken) });
}

export function useCreateAlertRule() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "create", target: "alert rule" },
    mutationFn: (body: AlertRuleInput) => api.createAlertRule(body, getToken),
  });
}

export function useUpdateAlertRule() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "alert rule" },
    mutationFn: ({ ruleId, body }: { ruleId: string; body: AlertRuleInput }) => api.updateAlertRule({ ruleId }, body, getToken),
  });
}

export function useDeleteAlertRule() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "delete", target: "alert rule" },
    mutationFn: (ruleId: string) => api.deleteAlertRule({ ruleId }, getToken),
  });
}

export function useListAlertFires(ruleId: string | undefined) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["alert-fires", ruleId],
    queryFn: () => api.listAlertFires({ ruleId: ruleId! }, getToken),
    enabled: !!ruleId,
  });
}

export function useAckAlertFire() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "acknowledge", target: "alert fire" },
    mutationFn: ({ ruleId, fireId }: { ruleId: string; fireId: string }) => api.ackAlertFire({ ruleId, fireId }, getToken),
  });
}

export function useListSLOs() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["slos"], queryFn: () => api.listSLOs(getToken) });
}

export function useCreateSLO() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "define", target: "SLO" },
    mutationFn: (body: SloInput) => api.createSLO(body, getToken),
  });
}

export function useListWebhooks() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["webhooks"], queryFn: () => listWebhooks(getToken) });
}
