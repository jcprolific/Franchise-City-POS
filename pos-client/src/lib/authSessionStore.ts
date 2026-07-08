export type StoredLoginMode = 'guest' | 'pin';

export interface StoredAuthSession {
  userName: string;
  loginMode: StoredLoginMode;
  role: string;
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
      typeof parsed.role !== 'string'
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
