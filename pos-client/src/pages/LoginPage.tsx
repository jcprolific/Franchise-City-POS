import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: (mode: 'guest' | 'pin' | 'email', name?: string, targetArea?: 'pos' | 'hq') => Promise<void> | void;
}

type LoginTab = 'email' | 'pin';

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [targetArea, setTargetArea] = useState<'pos' | 'hq'>('pos');

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [hqHint, setHqHint] = useState('');

  // PIN state
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // ---- Email Login ----
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setEmailError('Please enter email and password');
      return;
    }
    setEmailLoading(true);
    setEmailError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setEmailLoading(false);

    if (error) {
      setEmailError(error.message);
      return;
    }

    const userName = data.user?.email?.split('@')[0] || 'User';
    await onLogin('email', userName, targetArea);
  };

  // ---- Email Sign Up ----
  const handleSignUp = async () => {
    if (!email || !password) {
      setEmailError('Please enter email and password');
      return;
    }
    if (password.length < 6) {
      setEmailError('Password must be at least 6 characters');
      return;
    }
    setEmailLoading(true);
    setEmailError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setEmailLoading(false);

    if (error) {
      setEmailError(error.message);
      return;
    }

    // Auto-login after signup
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setEmailError('Account created! Please sign in.');
      return;
    }

    const userName = loginData.user?.email?.split('@')[0] || 'User';
    await onLogin('email', userName, targetArea);
  };

  // ---- PIN Login ----
  const submitPinLogin = (enteredPin: string) => {
    if (enteredPin.length !== 4) {
      setPinError('Enter 4-digit PIN');
      return;
    }

    // Registered HQ PIN
    if (enteredPin === '4200') {
      onLogin('pin', 'Staff HQ', 'hq');
      return;
    }

    // Other valid staff PINs still go to POS order-taking.
    onLogin('pin', 'Staff', 'pos');
  };

  const handlePinKey = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setPinError('');

    if (newPin.length === 4) {
      setTimeout(() => {
        submitPinLogin(newPin);
      }, 300);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError('');
  };

  // ---- Guest ----
  const handleGuestEntry = () => {
    onLogin('guest', 'Guest', 'pos');
  };

  const handleHqAccessClick = () => {
    setTargetArea('hq');
    setActiveTab('email');
    setEmailError('');
    setHqHint('Sign in with your HQ account to open the HQ dashboard.');
  };

  return (
    <div className="login-page" id="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">☕</div>
          <h1 className="login-title">Franchise City</h1>
          <p className="login-subtitle">Point of Sale System</p>
        </div>

        {/* Tab Switcher */}
        <div className="login-tabs">
          <button
            className={`login-tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            ✉️ Email Login
          </button>
          <button
            className={`login-tab ${activeTab === 'pin' ? 'active' : ''}`}
            onClick={() => setActiveTab('pin')}
          >
            🔢 Staff PIN
          </button>
        </div>

        {/* ---- EMAIL TAB ---- */}
        {activeTab === 'email' && (
          <form className="login-form" onSubmit={handleEmailLogin}>
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">Email</label>
              <input
                className="login-input"
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Password</label>
              <input
                className="login-input"
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setEmailError(''); }}
                autoComplete="current-password"
              />
            </div>

            {emailError && (
              <div className="login-error">{emailError}</div>
            )}
            {hqHint && (
              <div className="login-hq-hint">{hqHint}</div>
            )}

            <button
              className="login-btn"
              type="submit"
              disabled={emailLoading}
            >
              {emailLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              className="login-signup-btn"
              type="button"
              onClick={handleSignUp}
              disabled={emailLoading}
            >
              Don't have an account? <span>Sign Up</span>
            </button>
          </form>
        )}

        {/* ---- PIN TAB ---- */}
        {activeTab === 'pin' && (
          <div className="login-pin-section">
            <span className="login-label">Enter Staff PIN</span>

            <div className="pin-dots">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`pin-dot ${i < pin.length ? 'filled' : ''}`}
                />
              ))}
            </div>

            <div className="pin-numpad" id="pin-numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  className="pin-key"
                  onClick={() => handlePinKey(d)}
                  type="button"
                >
                  {d}
                </button>
              ))}
              <button
                className="pin-key backspace"
                onClick={handleBackspace}
                aria-label="Backspace"
                type="button"
              >
                ⌫
              </button>
              <button
                className="pin-key"
                onClick={() => handlePinKey('0')}
                type="button"
              >
                0
              </button>
              <button
                className="pin-key enter"
                onClick={() => {
                  submitPinLogin(pin);
                }}
                aria-label="Enter"
                type="button"
              >
                →
              </button>
            </div>

            <div className="pin-error">{pinError}</div>
          </div>
        )}

        {/* Divider */}
        <div className="login-divider">
          <div className="login-divider-line" />
          <span className="login-divider-text">or</span>
          <div className="login-divider-line" />
        </div>

        {/* Guest Entry */}
        <div className="login-guest-section">
          <button
            className="login-guest-btn"
            onClick={handleGuestEntry}
            id="guest-login-btn"
          >
            <span className="login-guest-icon">👤</span>
            Enter as Guest
          </button>
          <button
            className="login-hq-link"
            type="button"
            onClick={handleHqAccessClick}
          >
            HQ access? <span>Click here</span>
          </button>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p className="login-footer-text">
            Franchise City POS · <span className="version">v1.0.0</span>
          </p>
        </div>
      </div>
    </div>
  );
}
