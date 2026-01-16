export interface MqttUser {
  id: number;
  username: string;
  password?: string | null;
  customer_id: number;
  customer_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MqttUserListResponse {
  items: MqttUser[];
  total: number;
  page: number;
  page_size: number;
}
