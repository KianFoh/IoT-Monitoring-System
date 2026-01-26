import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { ReactElement } from "react";
import {
  FaTachometerAlt,
  FaNetworkWired,
  FaUsers,
  FaCog,
  FaUserCircle,
  FaUserCog,
  FaUserAlt ,
  FaBuilding,
  FaSitemap ,
} from "react-icons/fa";
import styles from"./Navbar.module.css";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
}

const Navbar = () => {
  const { logout, user } = useAuth();

  const navItems: NavItem[] = [
    { to: "/dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { to: "/dashboard/distributors", label: "Distributors", icon: <FaSitemap  /> },
    { to: "/dashboard/customers", label: "Customers", icon: <FaUserAlt  /> },
    { to: "/dashboard/departments", label: "Departments", icon: <FaBuilding /> },
    { to: "/dashboard/mqtt-users", label: "MQTT Users", icon: <FaUserCog  /> },
    { to: "/dashboard/devices", label: "Devices", icon: <FaNetworkWired /> },
    { to: "/dashboard/users", label: "Users", icon: <FaUsers /> },
    { to: "/dashboard/settings", label: "Settings", icon: <FaCog /> },
  ];

  const isUser = user?.role === "user";
  const visibleNavItems = isUser
    ? navItems.filter((item) => ["/dashboard", "/dashboard/devices", "/dashboard/settings"].includes(item.to))
    : navItems;

  return (
    <nav className={styles["gen-navbar"]}>
      {/* Profile */}
      <div className={styles["gen-navbar-profile"]}>
        <div className={styles["gen-navbar-profile-avatar"]}>
          <FaUserCircle size={48} />
        </div>
        <div>
          <h3 className={styles["gen-navbar-profile-email"]}>{user?.email || 'User'}</h3>
          <p className={styles["gen-navbar-profile-role"]}>{user?.role || 'Role'}</p>
        </div>
      </div>
      {/* Menu */}
      <ul className={styles["gen-navbar-menu"]}>
        {visibleNavItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                `${styles["gen-navbar-item"]} ${isActive ? styles["active"] : ""}`
              }
            >
              <span className={styles["gen-navbar-icon"]}>{item.icon}</span>
              <span className={styles["gen-navbar-label"]}>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className={styles["gen-navbar-footer"]}>
        <button onClick={logout} className={styles["gen-navbar-logout-btn"]}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
