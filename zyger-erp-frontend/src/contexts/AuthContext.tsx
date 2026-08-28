import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi, type ScreenAccess } from '../api/authApi';
import type { LoginRequest } from '../api/authApi';
import { getRolePermissions, type PermissionModule, type PermissionAction, type PermissionKey } from '../config/rbac';

export type ScreenAction = 'View' | 'Create' | 'Edit' | 'Delete' | 'Export';
export type ScreenAccessMap = Record<string, ScreenAccess>;

interface User { username: string; role: string; }
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  screenPerms: ScreenAccessMap;
  screensLoaded: boolean;
  can: (mod: PermissionModule, action: PermissionAction) => boolean;
  canAny: (mod: PermissionModule, actions: PermissionAction[]) => boolean;
  hasModule: (mod: PermissionModule) => boolean;
  canScreen: (screenKey: string, action?: ScreenAction) => boolean;
  login: (data: LoginRequest) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const TOKEN_KEY = 'zyger-access-token';
const USER_KEY = 'zyger-user';

const SESSION_IDLE_MS = 30 * 60 * 1000;
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.username === 'string' && typeof parsed.role === 'string') {
      return { username: parsed.username, role: parsed.role };
    }
  } catch { /* corrupt storage */ }
  return null;
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

const SCREEN_ACTION_KEY = {
  View: 'canView',
  Create: 'canCreate',
  Edit: 'canEdit',
  Delete: 'canDelete',
  Export: 'canExport',
} as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (!sessionStorage.getItem(TOKEN_KEY)) return null;
    return readStoredUser();
  });
  const [screenPerms, setScreenPerms] = useState<ScreenAccessMap>({});
  const [screensLoaded, setScreensLoaded] = useState(false);

  const perms = useMemo(() => {
    if (!user?.role) return new Set<PermissionKey>();
    return getRolePermissions(user.role);
  }, [user?.role]);

  const persist = (token: string, u: User) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  const loadScreens = useCallback(async () => {
    try {
      const list = await authApi.getMyScreens();
      const map: ScreenAccessMap = {};
      for (const s of list) map[s.screenKey] = s;
      setScreenPerms(map);
    } catch {
      setScreenPerms({});
    } finally {
      setScreensLoaded(true);
    }
  }, []);

  // Load the user's effective screen matrix after login / session restore.
  useEffect(() => {
    if (user && !screensLoaded) {
      loadScreens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, screensLoaded]);

  const can = useCallback(
    (mod: PermissionModule, action: PermissionAction): boolean => {
      return perms.has(`${mod}:${action}` as PermissionKey);
    },
    [perms]
  );

  const canAny = useCallback(
    (mod: PermissionModule, actions: PermissionAction[]): boolean => {
      return actions.some((a) => perms.has(`${mod}:${a}` as PermissionKey));
    },
    [perms]
  );

  const hasModule = useCallback(
    (mod: PermissionModule): boolean => {
      for (const p of perms) {
        if (p.startsWith(`${mod}:`)) return true;
      }
      return false;
    },
    [perms]
  );

  // Screen-level access from the per-user Access Control matrix.
  // ADMIN users see every screen fully granted (server returns all-true;
  // admin-only screens absent from the catalog are also granted here).
  const canScreen = useCallback(
    (screenKey: string, action: ScreenAction = 'View'): boolean => {
      if (user && (user.role === 'ADMIN' || user.role.toLowerCase() === 'admin')) return true;
      const s = screenPerms[screenKey];
      return s ? Boolean(s[SCREEN_ACTION_KEY[action]]) : false;
    },
    [screenPerms, user]
  );

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data);
    const u = { username: res.username, role: res.role };
    persist(res.token, u);
    await loadScreens();
  };

  const loginDemo = async () => {
    await login({ username: 'demo', password: 'demo123' });
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setScreenPerms({});
    setScreensLoaded(false);
  };

  // Auto-logout after 30 minutes of inactivity.
  useEffect(() => {
    if (!user) return;
    let idleTimer: number | undefined;
    const onIdle = () => {
      clearSession();
      setUser(null);
      setScreenPerms({});
      setScreensLoaded(false);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    };
    const reset = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(onIdle, SESSION_IDLE_MS);
    };
    IDLE_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer) window.clearTimeout(idleTimer);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, screenPerms, screensLoaded, can, canAny, hasModule, canScreen, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
