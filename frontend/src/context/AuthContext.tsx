import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../services/api';
import type { AuthResponse, User } from '../services/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = 'sico_user';

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [loading] = useState(false);

  const applyAuth = useCallback((res: AuthResponse) => {
    setToken(res.token);
    setTokenState(res.token);
    const u: User = { id: res.user.id, email: res.user.email, createdAt: res.user.createdAt };
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<AuthResponse>('/auth/login', { email, password });
      applyAuth(res);
    },
    [applyAuth]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<AuthResponse>('/auth/register', { email, password });
      applyAuth(res);
    },
    [applyAuth]
  );

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
    localStorage.removeItem(USER_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}