import { StatCard } from "@/components/StatCard/StatCard";
import { useDashboardOverview } from "./hooks/useDashboardOverview";
import { useUserDashboardOverview } from "./hooks/useUserDashboardOverview";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";
import { Link, useNavigate } from "react-router-dom";
import { DataTable } from "../../components/DataTable/DataTable";
import { FaCheckCircle, FaNetworkWired, FaTimesCircle, FaUserAlt, FaUserCog, FaUsers } from "react-icons/fa";
import styles from "./DashboardHome.module.css";
import useOverviewDeviceColumns from "./hooks/useOverviewDeviceColumns";
import useUserOverviewDeviceColumns from "./hooks/useUserOverviewDeviceColumns";
import { useAuth } from "@/features/auth/context/AuthContext";

export function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isUser = user?.role === "user";
  const superOverview = useDashboardOverview(!isUser);
  const userOverview = useUserDashboardOverview(isUser);
  const superStats = superOverview.stats;
  const userStats = userOverview.stats;
  const loading = isUser ? userOverview.loading : superOverview.loading;
  const error = isUser ? userOverview.error : superOverview.error;

  const handleViewDashboard = (device: { uid: string }) => {
    navigate(`/dashboard/devices/${device.uid}`);
  };

  const superColumns = useOverviewDeviceColumns(handleViewDashboard);
  const userColumns = useUserOverviewDeviceColumns(handleViewDashboard);

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
      <p>Dashboard Overview</p>

      <div className={styles["dashboard-stats-grid"]}>
        {isUser ? (
          <>
            <StatCard title="Total Devices" value={userStats.totalDevices} color="primary" icon={<FaNetworkWired />} />
            <StatCard title="Online" value={userStats.onlineDevices} color="success" icon={<FaCheckCircle />} />
            <StatCard title="Offline" value={userStats.offlineDevices} color="warning" icon={<FaTimesCircle />} />
          </>
        ) : (
          <>
            <StatCard title="Total Customers" value={superStats.totalCustomers} color="primary" icon={<FaUserAlt />} />
            <StatCard title="Total Devices" value={superStats.totalDevices} color="success" icon={<FaNetworkWired />} />
            <StatCard title="Total Users" value={superStats.totalUsers} color="info" icon={<FaUsers />} />
            <StatCard title="Total Mqtt Users" value={superStats.mqttUsers} color="warning" icon={<FaUserCog />} />
          </>
        )}
      </div>

      <div className={styles["dashboard-section-header"]}>
        <h2>Recent Devices</h2>
        <Link to="/dashboard/devices" className={styles["dashboard-section-link"]}>
          See all
        </Link>
      </div>
      {isUser ? (
        <DataTable
          data={userOverview.devices}
          columns={userColumns}          emptyMessage="No devices found"
        />
      ) : (
        <DataTable
          data={superOverview.devices}
          columns={superColumns}          emptyMessage="No devices found"
        />
      )}
    </div>
  );
}
