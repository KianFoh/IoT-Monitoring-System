import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DashboardOverviewDevice } from "@/types/dashboard";
import { StatCard } from "../../..//components/StatCard/StatCard";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { LoadingScreen } from "../../..//components/Loading/LoadingScreen";
import { Link } from "react-router-dom";
import { DataTable } from "../components/DataTable";
import { FaBoxes, FaNetworkWired, FaUserAlt, FaUserCog, FaUsers } from "react-icons/fa";

export function DashboardHome() {
  const { stats, devices, loading, error } = useDashboardOverview();

  const columns = useMemo<ColumnDef<DashboardOverviewDevice>[]>(
    () => [
      {
        accessorKey: "uid",
        header: "UID",
        cell: (info) => <span className="device-id">{info.getValue<string>()}</span>,
      },
      { accessorKey: "name", header: "Name" },
      { accessorKey: "department_name", header: "Department" },
      { accessorKey: "customer_name", header: "Customer" },
      {
        accessorKey: "is_online",
        header: "Status",
        cell: (info) => (
          <span className={`status-badge ${info.getValue<boolean>() ? "online" : "offline"}`}>
            {info.getValue<boolean>() ? "Online" : "Offline"}
          </span>
        ),
      },
    ],
    []
  );

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Error loading dashboard stats: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Monitor your IoT devices and in real-time</p>
      </div>

      <div className="stats-grid">
        <StatCard title="Total Customers" value={stats.totalCustomers} color="primary" icon={<FaUserAlt />} />
        <StatCard title="Total Devices" value={stats.totalDevices} color="success" icon={<FaNetworkWired />} />
        <StatCard title="Total Users" value={stats.totalUsers} color="info" icon={<FaUsers />} />
        <StatCard title="Total Mqtt Users" value={stats.mqttUsers} color="warning" icon={<FaUserCog />} />
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Devices</h2>
          <Link to="/dashboard/devices" className="section-link">
            See all
          </Link>
        </div>
        <DataTable data={devices} columns={columns} tableClassName="dashboard-table" emptyMessage="No devices found" />
      </div>
    </div>
  );
}
