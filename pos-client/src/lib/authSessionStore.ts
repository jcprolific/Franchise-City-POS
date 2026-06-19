export type StoredLoginMode = 'guest' | 'pin';

export interface StoredAuthSession {
  userName: string;
  loginMode: StoredLoginMode;
  role: 'cashier' | 'hq_admin';
}

const AUTH_SESSION_KEY = 'coftea.pos.authSession';

export function readStoredAuthSession(): StoredAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (
      !parsed?.userName ||
      (parsed.loginMode !== 'guest' && parsed.loginMode !== 'pin') ||
      (parsed.role !== 'cashier' && parsed.role !== 'hq_admin')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredAuthSession(session: StoredAuthSession) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}
