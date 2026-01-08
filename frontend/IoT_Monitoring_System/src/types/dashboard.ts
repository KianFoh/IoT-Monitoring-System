// Dashboard Overview

export interface DashboardOverviewDevice {
    id: number;
    name: string;
    uid: string;
    is_online: boolean;
    customer_name: string;
    department_name: string;
    last_seen?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalDevices: number;
  totalUsers: number;
  mqttUsers: number;
}

// Dashboard Devices
export interface Device {
  id: number;
  name: string;
  uid: string;
  is_online: boolean;
  department_id: number;
  is_active: boolean;
  created_at: string;
}