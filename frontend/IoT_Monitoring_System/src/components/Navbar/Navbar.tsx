import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { ReactElement } from "react";
import {
  FaTachometerAlt,
  FaBoxes,
  FaUsers,
  FaCog,
  FaUserCircle,
  FaUserCog,
  FaUserAlt ,
} from "react-icons/fa";
import "./Navbar.css";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
}

const Navbar = () => {
  const { logout, user } = useAuth();

  const navItems: NavItem[] = [
    { to: "/dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { to: "/dashboard/devices", label: "Devices", icon: <FaBoxes /> },
    { to: "/dashboard/customers", label: "Customers", icon: <FaUserAlt  /> },
    { to: "/dashboard/users", label: "Users", icon: <FaUsers /> },
    { to: "/dashboard/mqtt-users", label: "MQTT Users", icon: <FaUserCog  /> },
    { to: "/dashboard/settings", label: "Settings", icon: <FaCog /> },
  ];

  return (
    <nav className="navbar">
      {/* Profile */}
      <div className="navbar-profile">
        <div className="profile-avatar">
          <FaUserCircle size={48} />
        </div>
        <div className="profile-info">
          <h3 className="profile-email">{user?.email || 'User'}</h3>
          <p className="profile-role">{user?.role || 'Role'}</p>
        </div>
      </div>

      {/* Menu */}
      <ul className="navbar-menu">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                `navbar-item ${isActive ? "active" : ""}`
              }
            >
              <span className="navbar-icon">{item.icon}</span>
              <span className="navbar-label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="navbar-footer">
        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
