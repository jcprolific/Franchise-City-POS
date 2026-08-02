import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { friendlyAuthError } from '../lib/authErrors';
import { landingPageUrl } from '../lib/landing';
import './LoginPage.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const verifyRecoverySession = async () => {
      const hash = window.location.hash;
      const isRecoveryLink =
        hash.includes('type=recovery') || hash.includes('access_token');

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true);
          setCheckingSession(false);
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      if (isRecoveryLink) {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionError || !data.session) {
          setError('This reset link is invalid or has expired. Request a new one from the login page.');
          setCheckingSession(false);
          return;
        }

        setReady(true);
        setCheckingSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        setReady(true);
      } else {
        setError('Open the password reset link from your email to set a new password.');
      }
      setCheckingSession(false);
    };

    void verifyRecoverySession();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(friendlyAuthError(updateError.message));
      return;
    }

    await supabase.auth.signOut();
    navigate('/login', {
      replace: true,
      state: { passwordReset: true },
    });
  };

  return (
    <div className="login-page" id="reset-password-page">
      <a
        href={landingPageUrl()}
        className="login-back-landing"
        aria-label="Back to Franchise City landing page"
      >
        <ArrowLeft size={20} aria-hidden="true" />
        <span>Back to Franchise City</span>
      </a>

      <div className="login-card">
        <div className="login-brand">
          <p className="login-subtitle">Set New Password</p>
        </div>

        {checkingSession ? (
          <div className="login-form">
            <p className="login-pin-hint">Verifying reset link...</p>
          </div>
        ) : !ready ? (
          <div className="login-form">
            {error && <div className="login-error">{error}</div>}
            <Link to="/login" className="login-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <p className="login-pin-hint">
              Choose a new password for your account.
            </p>

            <div className="login-field">
              <label className="login-label" htmlFor="reset-password">New Password</label>
              <input
                className="login-input"
                id="reset-password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="new-password"
                autoFocus
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="reset-confirm">Confirm Password</label>
              <input
                className="login-input"
                id="reset-confirm"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                autoComplete="new-password"
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Update Password'}
            </button>

            <Link to="/login" className="login-forgot-link">
              Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
