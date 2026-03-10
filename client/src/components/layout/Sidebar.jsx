import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin','pharmacist','auditor'] },
    { path: '/analytics', label: 'Analytics', icon: '📈', roles: ['admin','pharmacist','auditor'] },
  ]},
  { section: 'Monitoring', items: [
    { path: '/alerts', label: 'Alerts', icon: '🔔', roles: ['admin','pharmacist','auditor'] },
    { path: '/medicines', label: 'Medicines', icon: '💊', roles: ['admin','pharmacist'] },
    { path: '/monitoring', label: 'Shelf Monitor', icon: '🗄️', roles: ['admin','pharmacist','auditor'] },
    { path: '/device', label: 'Device Health', icon: '📡', roles: ['admin','pharmacist','auditor'] },
  ]},
  { section: 'Reports', items: [
    { path: '/reports', label: 'Reports', icon: '📄', roles: ['admin','auditor'] },
  ]},
  { section: 'Admin', items: [
    { path: '/users', label: 'Users', icon: '👥', roles: ['admin'] },
  ]},
];

export default function Sidebar({ collapsed, onToggle, mobileOpen }) {
  const { user, logout } = useAuth();
  const { nightMode, toggleNightMode } = useTheme();
  const location = useLocation();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">🛡️</div>
        <span className="brand-text">MediGuard</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => {
          const visibleItems = section.items.filter(item => item.roles.includes(user?.role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.section}>
              <div className="sidebar-section-title">{section.section}</div>
              {visibleItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="theme-toggle-row">
          <span>🌙 Night Mode</span>
          <div
            className={`theme-switch ${nightMode ? 'active' : ''}`}
            onClick={toggleNightMode}
            role="button"
            aria-label="Toggle night mode"
          />
        </div>

        <div style={{ padding: '8px 14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div className="sidebar-footer-info">👤 {user?.username} ({user?.role})</div>
        </div>

        <button className="sidebar-toggle" onClick={logout}>
          🚪 <span className="nav-text">Logout</span>
        </button>

        <button className="sidebar-toggle" onClick={onToggle} style={{ marginTop: 6 }}>
          {collapsed ? '→' : '←'} <span className="nav-text">Collapse</span>
        </button>
      </div>
    </aside>
  );
}
