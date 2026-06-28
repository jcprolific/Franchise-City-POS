import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LOGIN_BRAND_LIST } from '../brands';
import { useBrand } from '../context/BrandContext';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: (mode: 'guest' | 'pin' | 'email', name?: string, targetArea?: 'pos' | 'hq') => Promise<void> | void;
}

type LoginTab = 'email' | 'pin';

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { brand, brandSlug, setBrandSlug } = useBrand();
  const showBrandSwitcher = LOGIN_BRAND_LIST.length > 1;

  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [targetArea, setTargetArea] = useState<'pos' | 'hq'>('pos');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Deep link from the Franchise City landing "HQ Login" button: ?area=hq
  // sends HQ users straight to the Staff PIN entry, mirroring handleHqAccessClick().
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('area') === 'hq') {
      setTargetArea('hq');
      setActiveTab('pin');
    }
  }, []);

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

  const submitPinLogin = (enteredPin: string) => {
    if (enteredPin.length !== 4) {
      setPinError('Enter 4-digit PIN');
      return;
    }

    if (enteredPin === '1234') {
      onLogin('pin', 'Coftea HQ Demo', 'hq');
      return;
    }

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

  const handleGuestEntry = () => {
    onLogin('guest', 'Guest', 'pos');
  };

  const handleHqAccessClick = () => {
    setTargetArea('hq');
    setActiveTab('pin');
    setEmailError('');
  };

  return (
    <div className={`login-page brand-${brandSlug}`} id="login-page">
      <div className="login-card">
        {showBrandSwitcher && (
          <div className="login-brand-switcher" role="tablist" aria-label="Select brand">
            {LOGIN_BRAND_LIST.map((option) => (
              <button
                key={option.slug}
                type="button"
                role="tab"
                aria-selected={brandSlug === option.slug}
                className={`login-brand-option ${brandSlug === option.slug ? 'active' : ''}`}
                onClick={() => setBrandSlug(option.slug)}
              >
                <img src={option.logoUrl} alt="" className="login-brand-option-logo" />
                <span>{option.shortName}</span>
              </button>
            ))}
          </div>
        )}

        <div className="login-brand">
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="login-logo-image"
          />
          <p className="login-subtitle">Point of Sale System</p>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            Email Login
          </button>
          <button
            className={`login-tab ${activeTab === 'pin' ? 'active' : ''}`}
            onClick={() => setActiveTab('pin')}
          >
            Staff PIN
          </button>
        </div>

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

        <div className="login-divider">
          <div className="login-divider-line" />
          <span className="login-divider-text">or</span>
          <div className="login-divider-line" />
        </div>

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

        <div className="login-footer">
          <p className="login-footer-text">
            {brand.footerText} · <span className="version">v1.0.0</span>
          </p>
        </div>
      </div>
    </div>
  );
}
