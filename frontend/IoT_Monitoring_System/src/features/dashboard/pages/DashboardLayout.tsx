import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar/Navbar";
import "../styles/dashboard.css";

export function DashboardLayout() {
  return (
    <div className="dashboardLayout">
      <Navbar />
      <main className="dashboardContent">
        <Outlet />
      </main>
    </div>
  );
}
