import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Splash    from './pages/Splash';
import Welcome   from './pages/Welcome';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Dashboard from './pages/Dashboard';
import POS       from './pages/POS';
import Products  from './pages/Products';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Reports   from './pages/Reports';
import Users     from './pages/Users';
import AuditTrail from './pages/AuditTrail';
import Settings  from './pages/Settings';
import Sidebar   from './components/layout/Sidebar';
import Header    from './components/layout/Header';
import './styles/globals.css';

const PAGES = {
  dashboard: { component: Dashboard, label: 'Dashboard' },
  pos:       { component: POS,       label: 'Point of Sale' },
  products:  { component: Products,  label: 'Products' },
  inventory: { component: Inventory, label: 'Inventory' },
  customers: { component: Customers, label: 'Customers' },
  suppliers: { component: Suppliers, label: 'Suppliers' },
  reports:   { component: Reports,   label: 'Reports' },
  users:     { component: Users,     label: 'User Management' },
  audit:     { component: AuditTrail,label: 'Audit Trail' },
  settings:  { component: Settings,  label: 'Settings' },
};

// Define which roles can access each page
const PAGE_ROLES = {
  dashboard: ['admin', 'manager'],
  pos:       ['admin', 'manager', 'cashier'],
  products:  ['admin', 'manager', 'cashier'],
  inventory: ['admin', 'manager'],
  customers: ['admin', 'manager', 'cashier'],
  suppliers: ['admin', 'manager'],
  reports:   ['admin', 'manager', 'auditor'],
  users:     ['admin'],
  audit:     ['admin', 'manager', 'auditor'],
  settings:  ['admin'],
};

// Default page based on user role
const getDefaultPage = (role) => {
  if (role === 'admin' || role === 'manager' || role === 'auditor') {
    return 'dashboard';
  }
  return 'pos';
};

const AppInner = () => {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState('splash');
  const [page, setPage] = useState('dashboard');

  // Splash done → check auth
  const handleSplashDone = () => {
    if (user) {
      // Redirect to appropriate default page based on role
      const defaultPage = getDefaultPage(user.role);
      setPage(defaultPage);
      setScreen('app');
    } else {
      setScreen('welcome');
    }
  };

  if (screen === 'splash') return <Splash onDone={handleSplashDone} />;
  if (screen === 'welcome') return <Welcome onLogin={() => setScreen('login')} onRegister={() => setScreen('register')} />;
  if (screen === 'login') return <Login onBack={() => setScreen('welcome')} onSuccess={() => {
    const defaultPage = getDefaultPage(user?.role);
    setPage(defaultPage);
    setScreen('app');
  }} />;
  if (screen === 'register') return <Register onBack={() => setScreen('welcome')} onSuccess={() => setScreen('login')} />;

  if (!user) {
    setScreen('welcome');
    return null;
  }

  // Check if user has access to the current page
  const allowedRoles = PAGE_ROLES[page] || ['admin', 'manager'];
  const hasAccess = user && allowedRoles.includes(user.role);

  // If no access, redirect to default page
  if (!hasAccess) {
    const defaultPage = getDefaultPage(user.role);
    setPage(defaultPage);
    return null;
  }

  const ActivePage = PAGES[page]?.component || Dashboard;
  const pageLabel = PAGES[page]?.label || 'Dashboard';

  return (
    <div className="h-screen flex overflow-hidden bg-surface-bg">
      <Sidebar active={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentPage={pageLabel} />
        <main className="flex-1 overflow-hidden">
          <ActivePage />
        </main>
      </div>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <CartProvider>
      <AppInner />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#06B6D4', secondary: '#F8FAFC' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#F8FAFC' } },
        }}
      />
    </CartProvider>
  </AuthProvider>
);

export default App;