export type AlertRuleFieldType = "text" | "number" | "boolean" | "list";

export type AlertRuleOperator =
  | "=="
  | "!="
  | "in"
  | "not in"
  | "<"
  | ">"
  | "<="
  | ">="
  | "contains"
  | "not contains"
  | "contains any"
  | "contains all"
  | "is empty";

export type AlertRule = {
  id: number;
  name: string;
  device_id: number;
  field: string;
  field_label?: string | null;
  field_type: AlertRuleFieldType;
  operator: AlertRuleOperator;
  value?: unknown;
  notification_method: string;
  message?: string | null;
  include_data_in_message: boolean;
  cooldown_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AlertRuleCreatePayload = {
  name: string;
  device_id: number;
  field: string;
  field_label?: string | null;
  field_type: AlertRuleFieldType;
  operator: AlertRuleOperator;
  value?: unknown;
  notification_method: string;
  message?: string | null;
  include_data_in_message: boolean;
  cooldown_seconds: number;
  is_active: boolean;
};

export type AlertRuleUpdatePayload = Partial<Omit<AlertRuleCreatePayload, "device_id">>;

export type AlertRuleListResponse = {
  items: AlertRule[];
  total: number;
  page: number;
  page_size: number;
};
