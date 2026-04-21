import { useCallback, useEffect, useState } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import InventoryPage from './pages/InventoryPage';
import DashboardPage from './pages/DashboardPage';
import AdminSidebar from './hq/components/AdminSidebar';
import GlobalDashboard from './hq/pages/GlobalDashboard';
import BranchManagement from './hq/pages/BranchManagement';
import './App.css';

type LoginMode = 'guest' | 'pin' | 'email' | null;
type UserRole = 'cashier' | 'hq_admin';

interface AuthState {
  isLoggedIn: boolean;
  userName: string;
  loginMode: LoginMode;
  role: UserRole;
  isLoading: boolean;
}

interface LoginLocationState {
  accessDenied?: string;
}

interface RouteGuardProps {
  isLoggedIn: boolean;
}

interface HqGuardProps {
  isHq: boolean;
}

interface PosShellProps {
  auth: AuthState;
  onLogout: () => void;
}

interface HqShellProps {
  userName: string;
  onLogout: () => void;
}

function RequireAuth({ isLoggedIn }: RouteGuardProps) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function RequireHq({ isHq }: HqGuardProps) {
  if (!isHq) {
    return <Navigate to="/pos" replace state={{ accessDenied: 'HQ access requires HQ role.' }} />;
  }
  return <Outlet />;
}

function PosShell({ auth, onLogout }: PosShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [bannerMessage, setBannerMessage] = useState('');

  useEffect(() => {
    const state = location.state as LoginLocationState | null;
    if (state?.accessDenied) {
      setBannerMessage(state.accessDenied);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  return (
    <div className="app-layout pos-shell" id="app-root">
      <Sidebar
        userName={auth.userName}
        userRole={auth.role === 'hq_admin' ? 'HQ Admin' : 'Cashier'}
        canAccessHq={auth.role === 'hq_admin'}
        onLogout={onLogout}
      />
      <main className="app-main">
        {bannerMessage && <div className="access-banner">{bannerMessage}</div>}
        <Outlet context={{ userName: auth.userName, userRole: auth.role === 'hq_admin' ? 'HQ Admin' : 'Cashier' }} />
      </main>
    </div>
  );
}

export interface PosOutletContext {
  userName: string;
  userRole: string;
}

function HqShell({ userName, onLogout }: HqShellProps) {
  return (
    <div className="app-layout hq-shell" id="app-root">
      <AdminSidebar userName={userName} onLogout={onLogout} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

function HqPlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="admin-table-container">
        <div style={{ padding: '16px', color: 'var(--text-muted)' }}>Coming soon.</div>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [preferredArea, setPreferredArea] = useState<'pos' | 'hq'>('pos');
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    userName: '',
    loginMode: null,
    role: 'cashier',
    isLoading: true,
  });

  const resolveUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data?.role) {
      return 'cashier';
    }
    return data.role === 'hq_admin' ? 'hq_admin' : 'cashier';
  }, []);

  const syncSessionUser = useCallback(
    async (user: { id: string; email?: string | null }) => {
      const role = await resolveUserRole(user.id);
      setAuth({
        isLoggedIn: true,
        userName: user.email?.split('@')[0] || 'User',
        loginMode: 'email',
        role,
        isLoading: false,
      });
      return role;
    },
    [resolveUserRole]
  );

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await syncSessionUser(session.user);
      } else {
        setAuth((prev) => ({ ...prev, isLoading: false }));
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void syncSessionUser(session.user);
      } else {
        setAuth({
          isLoggedIn: false,
          userName: '',
          loginMode: null,
          role: 'cashier',
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [syncSessionUser]);

  const handleLogin = useCallback(
    async (mode: 'guest' | 'pin' | 'email', name?: string, targetArea: 'pos' | 'hq' = 'pos') => {
      setPreferredArea(targetArea);
      if (mode === 'email') {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await syncSessionUser(session.user);
        }
        return;
      }
      setAuth({
        isLoggedIn: true,
        userName: name || 'User',
        loginMode: mode,
        role: mode === 'pin' && targetArea === 'hq' ? 'hq_admin' : 'cashier',
        isLoading: false,
      });
      navigate(mode === 'pin' && targetArea === 'hq' ? '/hq' : '/pos', { replace: true });
    },
    [navigate, syncSessionUser]
  );

  useEffect(() => {
    if (auth.isLoading || !auth.isLoggedIn) {
      return;
    }
    if (preferredArea === 'hq') {
      if (auth.role === 'hq_admin') {
        navigate('/hq', { replace: true });
      } else {
        navigate('/pos', {
          replace: true,
          state: { accessDenied: 'HQ access requires HQ role. You are signed in to POS.' },
        });
      }
      setPreferredArea('pos');
      return;
    }
    if (location.pathname === '/login' || location.pathname === '/') {
      navigate(auth.role === 'hq_admin' ? '/hq' : '/pos', { replace: true });
    }
  }, [auth.isLoading, auth.isLoggedIn, auth.role, location.pathname, navigate, preferredArea]);

  const handleLogout = useCallback(async () => {
    if (auth.loginMode === 'email') {
      await supabase.auth.signOut();
    }
    setAuth({
      isLoggedIn: false,
      userName: '',
      loginMode: null,
      role: 'cashier',
      isLoading: false,
    });
    navigate('/login', { replace: true });
  }, [auth.loginMode, navigate]);

  // Show loading while checking session
  if (auth.isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-family)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>☕</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth.isLoggedIn
            ? <Navigate to={auth.role === 'hq_admin' ? '/hq' : '/pos'} replace />
            : <LoginPage onLogin={handleLogin} />
        }
      />
      <Route element={<RequireAuth isLoggedIn={auth.isLoggedIn} />}>
        <Route element={<PosShell auth={auth} onLogout={handleLogout} />}>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route element={<RequireHq isHq={auth.role === 'hq_admin'} />}>
          <Route element={<HqShell userName={auth.userName} onLogout={handleLogout} />}>
            <Route path="/hq" element={<GlobalDashboard />} />
            <Route path="/hq/branches" element={<BranchManagement />} />
            <Route
              path="/hq/catalog"
              element={<HqPlaceholder title="Menu Catalog" subtitle="Centralized product engine coming soon." />}
            />
            <Route
              path="/hq/staff"
              element={<HqPlaceholder title="Staff Directory" subtitle="Global cashier index coming soon." />}
            />
            <Route
              path="/hq/settings"
              element={<HqPlaceholder title="Settings" subtitle="HQ config coming soon." />}
            />
          </Route>
        </Route>
      </Route>
      <Route
        path="*"
        element={<Navigate to={auth.isLoggedIn ? (auth.role === 'hq_admin' ? '/hq' : '/pos') : '/login'} replace />}
      />
    </Routes>
  );
}
