import { useState, useEffect } from 'react';
import type { NavPage } from './types';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import InventoryPage from './pages/InventoryPage';
import DashboardPage from './pages/DashboardPage';
import './App.css';

interface AuthState {
  isLoggedIn: boolean;
  userName: string;
  loginMode: 'guest' | 'pin' | 'email' | null;
  isLoading: boolean;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('pos');
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    userName: '',
    loginMode: null,
    isLoading: true,
  });

  // Check for existing Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuth({
          isLoggedIn: true,
          userName: session.user.email?.split('@')[0] || 'User',
          loginMode: 'email',
          isLoading: false,
        });
      } else {
        setAuth((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuth({
          isLoggedIn: true,
          userName: session.user.email?.split('@')[0] || 'User',
          loginMode: 'email',
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (mode: 'guest' | 'pin' | 'email', name?: string) => {
    setAuth({
      isLoggedIn: true,
      userName: name || 'User',
      loginMode: mode,
      isLoading: false,
    });
    setCurrentPage('pos');
  };

  const handleLogout = async () => {
    // Sign out from Supabase if it was an email login
    if (auth.loginMode === 'email') {
      await supabase.auth.signOut();
    }
    setAuth({
      isLoggedIn: false,
      userName: '',
      loginMode: null,
      isLoading: false,
    });
    setCurrentPage('pos');
  };

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

  // Show login page if not authenticated
  if (!auth.isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout" id="app-root">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        userName={auth.userName}
        onLogout={handleLogout}
      />
      <main className="app-main">
        {currentPage === 'pos' && <POSPage />}
        {currentPage === 'inventory' && <InventoryPage />}
        {currentPage === 'dashboard' && <DashboardPage />}
      </main>
    </div>
  );
}
