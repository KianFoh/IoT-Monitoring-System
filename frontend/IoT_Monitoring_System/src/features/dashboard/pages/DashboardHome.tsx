import { StatCard } from "../../..//components/StatCard/StatCard";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { LoadingScreen } from "../../..//components/Loading/LoadingScreen";
import { Link } from "react-router-dom";
import { DataTable } from "../components/DataTable";
import { FaNetworkWired, FaUserAlt, FaUserCog, FaUsers } from "react-icons/fa";
import styles from "../styles/dashboard.module.css";
import useOverviewDeviceColumns from "../hooks/useOverviewDeviceColumns";

export function DashboardHome() {
  const { stats, devices, loading, error } = useDashboardOverview();

  const columns = useOverviewDeviceColumns();

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className={styles["dashboard-container"]}>
        <h1>Dashboard</h1>
        <p>Error loading dashboard stats: {error}</p>
      </div>
    );
  }

  return (
    <div className={styles["dashboard-container"]}>
      <h1>Dashboard</h1>
      <p>Monitor your IoT devices and in real-time</p>

      <div className={styles["dashboard-stats-grid"]}>
        <StatCard title="Total Customers" value={stats.totalCustomers} color="primary" icon={<FaUserAlt />} />
        <StatCard title="Total Devices" value={stats.totalDevices} color="success" icon={<FaNetworkWired />} />
        <StatCard title="Total Users" value={stats.totalUsers} color="info" icon={<FaUsers />} />
        <StatCard title="Total Mqtt Users" value={stats.mqttUsers} color="warning" icon={<FaUserCog />} />
      </div>

      <div className={styles["dashboard-section-header"]}>
        <h2>Recent Devices</h2>
        <Link to="/dashboard/devices" className={styles["dashboard-section-link"]}>
          See all
        </Link>
      </div>
      <DataTable data={devices} columns={columns} tableClassName={styles["dashboard-table"]} emptyMessage="No devices found" />
    </div>
  );
}