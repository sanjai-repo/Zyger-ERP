import { useCallback, useMemo } from 'react';
import { useAuth, type ScreenAction } from '../contexts/AuthContext';
import { getRolePermissions, type PermissionModule, type PermissionAction, type PermissionKey } from '../config/rbac';

export function usePermissions() {
  const { user, canScreen } = useAuth();

  const perms = useMemo(() => {
    if (!user?.role) return new Set<PermissionKey>();
    return getRolePermissions(user.role);
  }, [user?.role]);

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

  const canAll = useCallback(
    (mod: PermissionModule, actions: PermissionAction[]): boolean => {
      return actions.every((a) => perms.has(`${mod}:${a}` as PermissionKey));
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

  return { can, canAny, canAll, hasModule, canScreen };
}

export type { ScreenAction };
