import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar/Navbar";
import styles from "./DashboardLayout.module.css";

export function DashboardLayout() {
  return (
    <div className={styles["dashboard-Layout"]}>
      <Navbar />
      <main className={styles["dashboard-Content"]}>
        <Outlet />
      </main>
    </div>
  );
}
