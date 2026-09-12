import type { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermissionModule, PermissionAction } from '../../config/rbac';

interface Props {
  module: PermissionModule;
  action: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function RequirePermission({ module, action, fallback = null, children }: Props) {
  const { can } = usePermissions();
  if (!can(module, action)) return <>{fallback}</>;
  return <>{children}</>;
}
