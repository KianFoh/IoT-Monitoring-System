import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { ReactElement } from "react";
import {
  FaTachometerAlt,
  FaNetworkWired,
  FaUsers,
  FaCog,
  FaUserCog,
  FaUserAlt ,
  FaBuilding,
  FaSitemap ,
} from "react-icons/fa";
import styles from"./Navbar.module.css";
import { config } from "@/config";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
}

const Navbar = () => {
  const { logout, user } = useAuth();
  const displayName = user?.username?.trim() || user?.email || "User";
  const initials = useMemo(() => {
    const trimmedUsername = user?.username?.trim() || "";
    if (trimmedUsername) {
      const parts = trimmedUsername.split(/[\s@._-]+/).filter(Boolean);
      const letters = parts.slice(0, 3).map((part: string) => part[0]?.toUpperCase() ?? "");
      return letters.join("") || "U";
    }
    const email = (user?.email || "").trim();
    return email ? email[0]?.toUpperCase() ?? "U" : "U";
  }, [user?.email, user?.username]);

  const profileSrc = useMemo(() => {
    const value = user?.profile_picture;
    if (!value) return null;
    return value.startsWith("http") ? value : `${config.api.baseUrl}${value}`;
  }, [user?.profile_picture]);

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
          {profileSrc ? (
            <img
              src={profileSrc}
              alt={displayName}
              className={styles["gen-navbar-profile-avatar-img"]}
            />
          ) : (
            <span className={styles["gen-navbar-profile-avatar-placeholder"]}>{initials}</span>
          )}
        </div>
        <div>
          <h3 className={styles["gen-navbar-profile-email"]}>{displayName}</h3>
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
