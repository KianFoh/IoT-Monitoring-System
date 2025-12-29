import { useState } from 'react';
import { useAuth } from "@/features/auth/context/AuthContext";
import type { ReactElement } from 'react';
import { FaTachometerAlt, FaBoxes, FaBuilding, FaUsers, FaCog, FaUserCircle } from 'react-icons/fa';
import './Navbar.css';

interface NavItem {
  id: string;
  label: string;
  icon: ReactElement;
}

const Navbar = () => {
  const [activeItem, setActiveItem] = useState('dashboard');
  const { logout } = useAuth();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaTachometerAlt /> },
    { id: 'devices', label: 'Devices', icon: <FaBoxes /> },
    { id: 'departments', label: 'Departments', icon: <FaBuilding /> },
    { id: 'users', label: 'Users', icon: <FaUsers /> },
    { id: 'settings', label: 'Settings', icon: <FaCog /> },
  ];

  return (
    <nav className="navbar">
      {/* Profile Section */}
      <div className="navbar-profile">
        <div className="profile-avatar">
          <FaUserCircle size={48} />
        </div>
        <div className="profile-info">
          <h3 className="profile-name">John Doe</h3>
          <p className="profile-role">Administrator</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <ul className="navbar-menu">
        {navItems.map((item) => (
          <li
            key={item.id}
            className={`navbar-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => setActiveItem(item.id)}
          >
            <span className="navbar-icon">{item.icon}</span>
            <span className="navbar-label">{item.label}</span>
          </li>
        ))}
      </ul>

      {/* Footer/Logout */}
      <div className="navbar-footer">
        <button className="logout-btn" onClick={logout}>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;