import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useBrand } from './context/BrandContext';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import {
  addAttendanceEntry,
  getLatestAttendanceStatus,
  subscribeAttendance,
} from './lib/attendanceStore';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import InventoryPage from './pages/InventoryPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import AdminSidebar from './hq/components/AdminSidebar';
import GlobalDashboard from './hq/pages/GlobalDashboard';
import BranchManagement from './hq/pages/BranchManagement';
import WarehouseManagement from './hq/pages/WarehouseManagement';
import SupplierManagement from './hq/pages/SupplierManagement';
import MenuCatalogPage from './hq/pages/MenuCatalogPage';
import StaffDirectoryPage from './hq/pages/StaffDirectoryPage';
import ReportsAnalyticsPage from './hq/pages/ReportsAnalyticsPage';
import SupplyOrdersPage from './hq/pages/SupplyOrdersPage';
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
} from './lib/authSessionStore';
import { preloadPosOrderColumns } from './lib/dashboardRealtime';
import './App.css';

type LoginMode = 'guest' | 'pin' | 'email' | null;
type UserRole = 'cashier' | 'hq_admin' | 'franchisee';

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

function RequireFranchisee({ isFranchisee }: { isFranchisee: boolean }) {
  if (!isFranchisee) {
    return <Navigate to="/pos" replace />;
  }
  return <Outlet />;
}

function homePathForRole(role: UserRole): string {
  if (role === 'hq_admin') return '/hq';
  if (role === 'franchisee') return '/portal';
  return '/pos';
}

function formatToday(d: Date) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getHeaderTitle(pathname: string, terminalLabel: string): { title: string; subtitle: string } {
  if (pathname.startsWith('/portal')) return { title: 'Franchisee Portal', subtitle: terminalLabel };
  if (pathname.startsWith('/orders')) return { title: 'Orders', subtitle: terminalLabel };
  if (pathname.startsWith('/inventory')) return { title: 'Inventory', subtitle: terminalLabel };
  if (pathname.startsWith('/dashboard')) return { title: 'Dashboard', subtitle: terminalLabel };
  if (pathname.startsWith('/promotions')) return { title: 'Promotions', subtitle: terminalLabel };
  return { title: 'Point of Sale', subtitle: terminalLabel };
}

function PosShell({ auth, onLogout }: PosShellProps) {
  const { brand } = useBrand();
  const location = useLocation();
  const navigate = useNavigate();
  const [bannerMessage, setBannerMessage] = useState('');
  const [today, setToday] = useState(() => new Date());

  const displayName = auth.userName
    ? auth.userName.charAt(0).toUpperCase() + auth.userName.slice(1)
    : 'Cashier';
  const roleLabel =
    auth.role === 'hq_admin' ? 'HQ Admin'
    : auth.role === 'franchisee' ? 'Franchisee'
    : 'Cashier';

  const [attendanceStatus, setAttendanceStatus] = useState<'IN' | 'OUT'>(
    () => getLatestAttendanceStatus(displayName) ?? 'OUT'
  );

  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const sync = () => setAttendanceStatus(getLatestAttendanceStatus(displayName) ?? 'OUT');
    sync();
    const cleanup = subscribeAttendance(sync);
    return cleanup;
  }, [displayName]);

  useEffect(() => {
    const state = location.state as LoginLocationState | null;
    if (state?.accessDenied) {
      setBannerMessage(state.accessDenied);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const handleToggleAttendance = useCallback(() => {
    const nextStatus = attendanceStatus === 'IN' ? 'OUT' : 'IN';
    addAttendanceEntry({ staffName: displayName, role: roleLabel, status: nextStatus });
  }, [attendanceStatus, displayName, roleLabel]);

  const { title, subtitle } = useMemo(
    () => getHeaderTitle(location.pathname, brand.terminalLabel),
    [location.pathname, brand.terminalLabel]
  );

  return (
    <div className={`app-layout pos-shell brand-${brand.slug}`} id="app-root">
      <TopHeader
        franchiseName={brand.franchiseName}
        brandName={brand.name}
        logoUrl={brand.logoUrl}
        title={title}
        subtitle={subtitle}
        dateLabel={formatToday(today)}
        cashierName={displayName}
        attendanceStatus={attendanceStatus}
        onToggleAttendance={handleToggleAttendance}
        onLogout={onLogout}
      />
      <div className="pos-shell-body">
        <Sidebar
          userName={auth.userName}
          userRole={roleLabel}
          canAccessHq={auth.role === 'hq_admin'}
          onLogout={onLogout}
        />
        <main className="app-main">
          {bannerMessage && <div className="access-banner">{bannerMessage}</div>}
          <Outlet context={{ userName: auth.userName, userRole: roleLabel }} />
        </main>
      </div>
    </div>
  );
}

export interface PosOutletContext {
  userName: string;
  userRole: string;
}

function HqShell({ userName, onLogout }: HqShellProps) {
  const { brand } = useBrand();

  return (
    <div className={`app-layout hq-shell brand-${brand.slug}`} id="app-root">
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
  const { brand, resolveBrandFromProfile, setBrandSlug } = useBrand();
  const [preferredArea, setPreferredArea] = useState<'pos' | 'hq'>('pos');
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    userName: '',
    loginMode: null,
    role: 'cashier',
    isLoading: true,
  });

  useEffect(() => {
    preloadPosOrderColumns();
  }, []);

  const resolveUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data?.role) {
      return 'cashier';
    }
    if (data.role === 'hq_admin' || data.role === 'franchisee') {
      return data.role;
    }
    return 'cashier';
  }, []);

  const syncSessionUser = useCallback(
    async (user: { id: string; email?: string | null }) => {
      clearStoredAuthSession();
      const role = await resolveUserRole(user.id);
      await resolveBrandFromProfile(user.id);
      setAuth({
        isLoggedIn: true,
        userName: user.email?.split('@')[0] || 'User',
        loginMode: 'email',
        role,
        isLoading: false,
      });
      return role;
    },
    [resolveUserRole, resolveBrandFromProfile]
  );

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        await syncSessionUser(session.user);
        return;
      }

      const stored = readStoredAuthSession();
      if (stored) {
        setAuth({
          isLoggedIn: true,
          userName: stored.userName,
          loginMode: stored.loginMode,
          role: stored.role,
          isLoading: false,
        });
        return;
      }

      setAuth((prev) => ({ ...prev, isLoading: false }));
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        void syncSessionUser(session.user);
        return;
      }
      // Only clear auth on explicit sign-out — not during initial hydration.
      if (event === 'SIGNED_OUT') {
        clearStoredAuthSession();
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
      if (mode === 'pin' && targetArea === 'hq') {
        setBrandSlug('coftea');
      }
      const role = mode === 'pin' && targetArea === 'hq' ? 'hq_admin' : 'cashier';
      const userName = name || 'User';
      if (mode === 'pin' || mode === 'guest') {
        writeStoredAuthSession({ userName, loginMode: mode, role });
      }
      setAuth({
        isLoggedIn: true,
        userName,
        loginMode: mode,
        role,
        isLoading: false,
      });
      if (mode === 'pin' && targetArea === 'hq') {
        navigate('/hq', { replace: true });
        return;
      }
      navigate('/pos', { replace: true });
    },
    [navigate, setBrandSlug, syncSessionUser]
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
      navigate(homePathForRole(auth.role), { replace: true });
    }
  }, [auth.isLoading, auth.isLoggedIn, auth.role, location.pathname, navigate, preferredArea]);

  const handleLogout = useCallback(async () => {
    clearStoredAuthSession();
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
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>{brand.menu.loadingEmoji}</div>
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
            ? <Navigate to={homePathForRole(auth.role)} replace />
            : <LoginPage onLogin={handleLogin} />
        }
      />
      <Route element={<RequireAuth isLoggedIn={auth.isLoggedIn} />}>
        <Route element={<PosShell auth={auth} onLogout={handleLogout} />}>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/promotions"
            element={<HqPlaceholder title="Promotions" subtitle="Discounts & combo deals coming soon." />}
          />
        </Route>
        <Route element={<RequireHq isHq={auth.role === 'hq_admin'} />}>
          <Route element={<HqShell userName={auth.userName} onLogout={handleLogout} />}>
            <Route path="/hq" element={<GlobalDashboard />} />
            <Route path="/hq/branches" element={<BranchManagement />} />
            <Route path="/hq/warehouse" element={<WarehouseManagement />} />
            <Route path="/hq/supply-orders" element={<SupplyOrdersPage />} />
            <Route path="/hq/suppliers" element={<SupplierManagement />} />
            <Route path="/hq/catalog" element={<MenuCatalogPage />} />
            <Route path="/hq/staff" element={<StaffDirectoryPage />} />
            <Route path="/hq/reports" element={<ReportsAnalyticsPage />} />
            <Route
              path="/hq/settings"
              element={<HqPlaceholder title="Settings" subtitle="HQ config coming soon." />}
            />
          </Route>
        </Route>
      </Route>
      <Route
        path="*"
        element={<Navigate to={auth.isLoggedIn ? homePathForRole(auth.role) : '/login'} replace />}
      />
    </Routes>
  );
}
