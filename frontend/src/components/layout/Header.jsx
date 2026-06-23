import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Header = ({ currentPage }) => {
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
  };

  return (
    <header className="h-14 bg-surface-card border-b border-surface-border flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-sm font-700 text-text-primary capitalize">{currentPage}</h1>
        <p className="text-xs text-text-faint">
          {time.toLocaleDateString('en-LS', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}
          {time.toLocaleTimeString('en-LS', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-600 text-text-primary">{user?.full_name}</p>
          <p className="text-xs text-primary capitalize">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-500 text-text-muted hover:text-danger border border-surface-border hover:border-danger/50 px-3 py-1.5 rounded-lg transition-all"
        >
          Sign out
        </button>
      </div>
    </header>
  );
};

export default Header;
