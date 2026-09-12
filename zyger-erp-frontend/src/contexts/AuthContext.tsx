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
  logout: () => void;
}

const TOKEN_KEY = 'zyger-access-token';
const USER_KEY = 'zyger-user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.username === 'string' && typeof parsed.role === 'string') {
      return { username: parsed.username, role: parsed.role };
    }
  } catch { /* corrupt storage */ }
  return null;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
    if (!localStorage.getItem(TOKEN_KEY) && !sessionStorage.getItem(TOKEN_KEY)) return null;
    return readStoredUser();
  });
  const [screenPerms, setScreenPerms] = useState<ScreenAccessMap>({});
  const [screensLoaded, setScreensLoaded] = useState(false);

  const perms = useMemo(() => {
    if (!user?.role) return new Set<PermissionKey>();
    return getRolePermissions(user.role);
  }, [user?.role]);

  const persist = (token: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
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

  const logout = () => {
    clearSession();
    setUser(null);
    setScreenPerms({});
    setScreensLoaded(false);
  };

  // Cross-tab synchronization: when auth state changes in ANY tab (login, logout,
  // or a token being cleared by a 401 timeout), all other tabs react so a stale tab
  // can never keep showing the previous user's data.
  //
  // The `storage` event fires only in OTHER tabs of the same origin when localStorage
  // changes. localStorage is shared, so both login (persist) and logout (clearSession)
  // trigger it everywhere. This directly fixes "old tab still shows user1 after user2 logs in".
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY && e.key !== USER_KEY) return;

      const tokenCleared = e.key === TOKEN_KEY ? (e.newValue == null) : (e.key === USER_KEY && e.newValue == null);

      if (tokenCleared) {
        // Another tab logged out / session expired -> force this tab to log out too.
        clearSession();
        setUser(null);
        setScreenPerms({});
        setScreensLoaded(false);
      } else if (e.key === TOKEN_KEY && e.newValue && e.newValue !== localStorage.getItem(TOKEN_KEY)) {
        // Another tab logged in as a different user -> don't show stale data from this
        // tab's previous user. Reload so the app bootstraps with the new token/user.
        window.location.reload();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, screenPerms, screensLoaded, can, canAny, hasModule, canScreen, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
