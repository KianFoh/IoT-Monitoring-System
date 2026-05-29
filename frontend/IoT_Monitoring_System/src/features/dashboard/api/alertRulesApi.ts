import { api } from "@/services/api";
import type {
  AlertRule,
  AlertRuleCreatePayload,
  AlertRuleListResponse,
  AlertRuleUpdatePayload,
} from "@/types/alertRule";
import { buildListParams, type ListParams } from "./apiHelpers";

const BASE_PATH = "/alert-rules";

type AlertRuleListParams = ListParams & {
  device_id?: number;
};

const buildAlertRuleListParams = (params: AlertRuleListParams) => {
  const built = buildListParams(params);
  if (params.device_id != null) built.device_id = String(params.device_id);
  return built;
};

export const alertRulesApi = {
  async list(params: AlertRuleListParams) {
    return api.get<AlertRuleListResponse>(`${BASE_PATH}/`, {
      params: buildAlertRuleListParams(params),
    });
  },

  async create(payload: AlertRuleCreatePayload) {
    return api.post<AlertRule>(`${BASE_PATH}/`, payload);
  },

  async update(alertRuleId: number, payload: AlertRuleUpdatePayload) {
    return api.patch<AlertRule>(`${BASE_PATH}/${alertRuleId}`, payload);
  },

  async remove(alertRuleId: number) {
    return api.delete<void>(`${BASE_PATH}/${alertRuleId}`);
  },
};
