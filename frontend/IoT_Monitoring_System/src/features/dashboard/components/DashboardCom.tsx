import { StatCard } from "../../../components/StatCard/StatCard";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { LoadingScreen } from "../../../components/Loading/LoadingScreen";

export function DashboardCom() {
  const { stats, loading, error } = useDashboardOverview();

  if (loading) {
    return <LoadingScreen />;
  }

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
        <p>Monitor your IoT devices and systems in real-time</p>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          color="primary"
          icon="👥"
        />
        <StatCard
          title="Total Devices"
          value={stats.totalDevices}
          color="success"
          icon="📱"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          color="info"
          icon="👤"
        />
        <StatCard
          title="Total Mqtt Users"
          value={stats.mqttUsers}
          color="warning"
          icon="✨"
        />
      </div>

      {/* Add more dashboard widgets, charts here */}
    </div>
  );
}