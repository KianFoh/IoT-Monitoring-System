// Dashboard Overview

export interface DashboardOverviewDevice {
    id: number;
    name: string;
    uid: string;
    is_online: boolean;
    customer_name?: string | null;
    department_name?: string | null;
    last_seen?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalDevices: number;
  totalUsers: number;
  mqttUsers: number;
}
