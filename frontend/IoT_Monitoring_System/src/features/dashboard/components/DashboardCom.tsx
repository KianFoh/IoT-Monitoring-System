import { StatCard } from "../../../components/StatCard/StatCard";

export function DashboardCom() {
  // Mock data - replace with actual API calls
  const stats = {
    totalCustomers: 24,
    totalDevices: 156,
    totalUsers: 42,
    mqttUsers: 148,
  };

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