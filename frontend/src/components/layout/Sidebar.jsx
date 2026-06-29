import React from 'react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

// Define navigation with role requirements
const allNav = [
  { key: 'dashboard', label: 'Dashboard', roles: ['admin', 'manager'] },
  { key: 'pos', label: 'Point of Sale', roles: ['admin', 'manager', 'cashier'] },
  { key: 'products', label: 'Products', roles: ['admin', 'manager', 'cashier'] },
  { key: 'inventory', label: 'Inventory', roles: ['admin', 'manager'] },
  { key: 'customers', label: 'Customers', roles: ['admin', 'manager', 'cashier'] },
  { key: 'suppliers', label: 'Suppliers', roles: ['admin', 'manager'] },
  { key: 'reports', label: 'Reports', roles: ['admin', 'manager', 'auditor'] },
  { key: 'users', label: 'User Management', roles: ['admin'] },
  { key: 'audit', label: 'Audit Trail', roles: ['admin', 'manager', 'auditor'] },
  { key: 'settings', label: 'Settings', roles: ['admin'] },
];

const Sidebar = ({ active, onNavigate }) => {
  const { user } = useAuth();

  // Filter navigation items based on user role
  const nav = allNav.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <aside className="w-56 bg-surface-card border-r border-surface-border flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-surface-border">
        <img src={logo} alt="K-POINT OF SALES" className="" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-3 pb-1">
          <p className="text-xs font-600 text-text-faint uppercase tracking-wider px-2 mb-1">Menu</p>
          {nav.map(item => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-500 transition-all mb-0.5
                ${active === item.key
                  ? 'bg-primary/15 text-primary border-l-2 border-primary'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-panel'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* User Info */}
      <div className="px-4 py-3 border-t border-surface-border">
        <p className="text-xs font-600 text-text-primary truncate">{user?.full_name}</p>
        <p className="text-xs text-primary capitalize mt-0.5">{user?.role}</p>
      </div>
    </aside>
  );
};

export default Sidebar;