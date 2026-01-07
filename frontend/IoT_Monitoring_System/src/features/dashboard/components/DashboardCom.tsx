import { StatCard } from "../../../components/StatCard/StatCard";
import { useDashboardOverview } from "../hooks/useDashboardOverview";
import { LoadingScreen } from "../../../components/Loading/LoadingScreen";
import { Link } from "react-router-dom";

export function DashboardCom() {
  const { stats, devices, loading, error } = useDashboardOverview();

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
        <p>Monitor your IoT devices and in real-time</p>
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

      {/* Devices Table */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Devices</h2>
          <Link to="/dashboard/devices" className="section-link">
            See all
          </Link>
        </div>
        <div className="table-container">
          <table className="dashboard-table">
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Customer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>
                      No devices found
                    </td>
                  </tr>
                ) : (
                  devices.map((device) => (
                    <tr key={device.id}>
                      <td className="device-id">{device.uid}</td>
                      <td>{device.name}</td>
                      <td>{device.department_name}</td>
                      <td>{device.customer_name}</td>
                      <td>
                        <span className={`status-badge ${device.is_online ? "online" : "offline"}`}>
                          {device.is_online ? "Online" : "Offline"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}