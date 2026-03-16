import { Outlet } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import styles from "./DashboardLayout.module.css";

export function DashboardLayout() {
  const [navCollapsed, setNavCollapsed] = useState(false);
  return (
    <div className={styles["dashboard-Layout"]}>
      <Navbar
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed((prev) => !prev)}
      />
      <main className={styles["dashboard-Content"]}>
        <Outlet />
      </main>
    </div>
  );
}
