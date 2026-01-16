export type UserRole = "superuser" | "admin" | "user";

export interface User {
  id: number;
  email: string;
  department_id?: number | null;
  department_name?: string | null;
  customer_name?: string | null;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  last_login?: string | null;
  created_at: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
}
