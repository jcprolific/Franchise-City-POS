import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { friendlyAuthError, normalizeAuthEmail } from '../lib/authErrors';
import { LOGIN_BRAND_LIST } from '../brands';
import { useBrand } from '../context/BrandContext';
import { landingPageUrl } from '../lib/landing';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: (mode: 'guest' | 'pin' | 'email', name?: string, targetArea?: 'pos' | 'hq') => Promise<void> | void;
}

type LoginTab = 'email' | 'pin';

export default function LoginPage({ onLogin }: LoginPageProps) {
  const location = useLocation();
  const { brand, brandSlug, setBrandSlug } = useBrand();
  const showBrandSwitcher = LOGIN_BRAND_LIST.length > 1;

  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [targetArea, setTargetArea] = useState<'pos' | 'hq'>('pos');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [hqHint, setHqHint] = useState('');

  // Deep link from the Franchise City landing "HQ Login" button: ?area=hq
  // opens email login so provisioned HQ/franchisee accounts can sign in directly.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('area') === 'hq') {
      setTargetArea('hq');
      setActiveTab('email');
      setHqHint('Sign in with your HQ email and password. Staff PIN 1234 is demo view-only.');
    }
  }, []);

  useEffect(() => {
    const state = location.state as { passwordReset?: boolean } | null;
    if (state?.passwordReset) {
      setEmailSuccess('Password updated. Sign in with your new password.');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail || !password) {
      setEmailError('Please enter email and password');
      return;
    }
    setEmailLoading(true);
    setEmailError('');
    setEmailSuccess('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setEmailLoading(false);

    if (error) {
      setEmailError(friendlyAuthError(error.message));
      return;
    }

    const userName = data.user?.email?.split('@')[0] || 'User';
    await onLogin('email', userName, targetArea);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail) {
      setEmailError('Enter the email address for your account');
      return;
    }
    setEmailLoading(true);
    setEmailError('');
    setEmailSuccess('');

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setEmailLoading(false);

    if (error) {
      setEmailError(friendlyAuthError(error.message));
      return;
    }

    setEmailSuccess(`Password reset link sent to ${normalizedEmail}. Check your inbox (and spam folder).`);
    setShowForgotPassword(false);
  };

  const handleSignUp = async () => {
    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail || !password) {
      setEmailError('Please enter email and password');
      return;
    }
    if (password.length < 6) {
      setEmailError('Password must be at least 6 characters');
      return;
    }
    setEmailLoading(true);
    setEmailError('');
    setEmailSuccess('');

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    setEmailLoading(false);

    if (error) {
      setEmailError(friendlyAuthError(error.message));
      return;
    }

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
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
      if (targetArea === 'pos') {
        setPinError('HQ PIN is not allowed on branch POS. Use Staff PIN or email login.');
        return;
      }
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

  return (
    <div className={`login-page brand-${brandSlug}`} id="login-page">
      <a
        href={landingPageUrl()}
        className="login-back-landing"
        aria-label="Back to Franchise City landing page"
      >
        <ArrowLeft size={20} aria-hidden="true" />
        <span>Back to Franchise City</span>
      </a>

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
          <>
            {hqHint && activeTab === 'email' && (
              <div className="login-hq-hint login-hq-hint--form">{hqHint}</div>
            )}

            {showForgotPassword ? (
              <form className="login-form" onSubmit={handleForgotPassword}>
                <p className="login-pin-hint">
                  Enter your account email and we&apos;ll send a link to reset your password.
                </p>
                <div className="login-field">
                  <label className="login-label" htmlFor="login-email">Email</label>
                  <input
                    className="login-input"
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); setEmailSuccess(''); }}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {emailError && <div className="login-error">{emailError}</div>}
                {emailSuccess && <div className="login-success">{emailSuccess}</div>}

                <button className="login-btn" type="submit" disabled={emailLoading}>
                  {emailLoading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  className="login-forgot-link"
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setEmailError(''); }}
                >
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form className="login-form" onSubmit={handleEmailLogin}>
                <div className="login-field">
                  <label className="login-label" htmlFor="login-email">Email</label>
                  <input
                    className="login-input"
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); setEmailSuccess(''); }}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <div className="login-field">
                  <div className="login-field-header">
                    <label className="login-label" htmlFor="login-password">Password</label>
                    <button
                      className="login-forgot-link login-forgot-link--inline"
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setEmailError(''); setEmailSuccess(''); }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    className="login-input"
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setEmailError(''); setEmailSuccess(''); }}
                    autoComplete="current-password"
                  />
                </div>

                {emailError && <div className="login-error">{emailError}</div>}
                {emailSuccess && <div className="login-success">{emailSuccess}</div>}

                <button className="login-btn" type="submit" disabled={emailLoading}>
                  {emailLoading ? 'Signing in...' : 'Sign In'}
                </button>

                <button
                  className="login-signup-btn"
                  type="button"
                  onClick={handleSignUp}
                  disabled={emailLoading}
                >
                  Don&apos;t have an account? <span>Sign Up</span>
                </button>
              </form>
            )}
          </>
        )}

        {activeTab === 'pin' && (
          <div className="login-pin-section">
            <span className="login-label">Enter Staff PIN</span>
            {hqHint && (
              <div className="login-hq-hint">{hqHint}</div>
            )}
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

        <div className="login-footer">
          <a href={landingPageUrl()} className="login-footer-landing-link">
            ← Franchise City landing page
          </a>
          <p className="login-footer-text">
            {brand.footerText} · <span className="version">v1.0.0</span>
          </p>
        </div>
      </div>
    </div>
  );
}
