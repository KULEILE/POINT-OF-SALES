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
  dashboard: { component: Dashboard, label: 'Dashboard'       },
  pos:       { component: POS,       label: 'Point of Sale'   },
  products:  { component: Products,  label: 'Products'        },
  inventory: { component: Inventory, label: 'Inventory'       },
  customers: { component: Customers, label: 'Customers'       },
  suppliers: { component: Suppliers, label: 'Suppliers'       },
  reports:   { component: Reports,   label: 'Reports'         },
  users:     { component: Users,     label: 'User Management' },
  audit:     { component: AuditTrail,label: 'Audit Trail'     },
  settings:  { component: Settings,  label: 'Settings'        },
};

const AppInner = () => {
  const { user, loading } = useAuth();
  const [screen,   setScreen]   = useState('splash');
  const [page,     setPage]     = useState('dashboard');

  // Splash done → check auth
  const handleSplashDone = () => {
    setScreen(user ? 'app' : 'welcome');
  };

  if (screen === 'splash') return <Splash onDone={handleSplashDone} />;
  if (screen === 'welcome') return <Welcome onLogin={() => setScreen('login')} onRegister={() => setScreen('register')} />;
  if (screen === 'login')   return <Login   onBack={() => setScreen('welcome')} onSuccess={() => setScreen('app')} />;
  if (screen === 'register')return <Register onBack={() => setScreen('welcome')} onSuccess={() => setScreen('login')} />;

  if (!user) { setScreen('welcome'); return null; }

  const ActivePage = PAGES[page]?.component || Dashboard;
  const pageLabel  = PAGES[page]?.label     || 'Dashboard';

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
