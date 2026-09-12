export type PermissionAction = 'View' | 'Create' | 'Edit' | 'Delete' | 'Approve' | 'Reject' | 'Cancel' | 'Print' | 'Export';

export type PermissionModule =
  | 'master' | 'inventory' | 'purchase' | 'sales' | 'planning'
  | 'production' | 'quality' | 'maintenance' | 'reports' | 'crm' | 'accounts' | 'admin';

export type PermissionKey = `${PermissionModule}:${PermissionAction}`;

export type RoleName =
  | 'Admin' | 'Management' | 'Purchase' | 'Store' | 'Sales'
  | 'Planning' | 'Production' | 'Quality' | 'Maintenance'
  | 'Accounts' | 'Supervisor' | 'Operator' | 'Inspector';

export type RolePermissionMap = Record<RoleName, Set<PermissionKey>>;

const ALL_ACTIONS: PermissionAction[] = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Reject', 'Cancel', 'Print', 'Export'];
const CRUD: PermissionAction[] = ['View', 'Create', 'Edit', 'Delete'];
const CRUD_PE: PermissionAction[] = [...CRUD, 'Print', 'Export'];
const FULL: PermissionAction[] = [...ALL_ACTIONS];

function perms(modules: PermissionModule[], actions: PermissionAction[]): PermissionKey[] {
  return modules.flatMap((m) => actions.map((a) => `${m}:${a}` as PermissionKey));
}

export const ROLE_PERMISSIONS: RolePermissionMap = {
  Admin: new Set([
    ...perms(['master', 'inventory', 'purchase', 'sales', 'planning', 'production', 'quality', 'maintenance', 'reports', 'crm', 'accounts', 'admin'], FULL),
  ]),

  Management: new Set([
    ...perms(['master', 'reports', 'admin'], CRUD_PE),
    ...perms(['purchase', 'sales', 'planning', 'production', 'quality', 'maintenance'], ['View', 'Print', 'Export']),
    ...perms(['purchase', 'sales'], ['Approve', 'Reject']),
    ...perms(['inventory'], ['View', 'Export']),
    ...perms(['crm'], CRUD_PE),
  ]),

  Purchase: new Set([
    ...perms(['master'], ['View']),
    ...perms(['purchase'], FULL),
    ...perms(['inventory'], ['View', 'Create', 'Print']),
    ...perms(['reports'], ['View', 'Print', 'Export']),
  ]),

  Store: new Set([
    ...perms(['master'], ['View']),
    ...perms(['inventory'], FULL),
    ...perms(['purchase'], ['View']),
    ...perms(['reports'], ['View', 'Print', 'Export']),
  ]),

  Sales: new Set([
    ...perms(['master'], ['View']),
    ...perms(['sales'], FULL),
    ...perms(['inventory'], ['View', 'Create', 'Print']),
    ...perms(['crm'], CRUD_PE),
    ...perms(['reports'], ['View', 'Print', 'Export']),
  ]),

  Planning: new Set([
    ...perms(['master'], ['View']),
    ...perms(['planning'], FULL),
    ...perms(['inventory'], ['View']),
    ...perms(['production'], ['View']),
    ...perms(['reports'], ['View', 'Print', 'Export']),
  ]),

  Production: new Set([
    ...perms(['master'], ['View']),
    ...perms(['production'], FULL),
    ...perms(['inventory'], ['View', 'Create']),
    ...perms(['planning'], ['View']),
    ...perms(['reports'], ['View', 'Print', 'Export']),
  ]),

  Quality: new Set([
    ...perms(['master'], ['View']),
    ...perms(['quality'], FULL),
    ...perms(['inventory'], ['View']),
    ...perms(['reports'], ['View', 'Print', 'Export']),
  ]),

  Maintenance: new Set([
    ...perms(['master'], ['View']),
    ...perms(['maintenance'], FULL),
    ...perms(['inventory'], ['View']),
    ...perms(['reports'], ['View', 'Print', 'Export']),
  ]),

  Accounts: new Set([
    ...perms(['master'], ['View']),
    ...perms(['purchase', 'sales'], ['View', 'Print', 'Export']),
    ...perms(['reports'], ['View', 'Print', 'Export']),
    ...perms(['inventory'], ['View']),
  ]),

  Supervisor: new Set([
    ...perms(['master'], ['View']),
    ...perms(['inventory', 'purchase', 'sales', 'planning', 'production', 'quality', 'maintenance'], ['View']),
    ...perms(['inventory', 'production'], ['Create', 'Edit']),
    ...perms(['quality'], ['Approve', 'Reject']),
    ...perms(['reports'], ['View', 'Print', 'Export']),
  ]),

  Operator: new Set([
    ...perms(['master'], ['View']),
    ...perms(['production'], ['View', 'Create']),
    ...perms(['inventory'], ['View']),
    ...perms(['quality'], ['View']),
  ]),

  Inspector: new Set([
    ...perms(['master'], ['View']),
    ...perms(['quality'], ['View', 'Create', 'Edit', 'Approve', 'Reject']),
    ...perms(['inventory'], ['View']),
    ...perms(['reports'], ['View', 'Print', 'Export']),
  ]),
};

const LEGACY_ROLE_MAP: Record<string, RoleName> = {
  ADMIN: 'Admin',
  MANAGER: 'Management',
  USER: 'Supervisor',
  VIEWER: 'Operator',
  ROLE_ADMIN: 'Admin',
  ROLE_MANAGER: 'Management',
  ROLE_USER: 'Supervisor',
  ROLE_VIEWER: 'Operator',
};

export function normalizeRole(role: string): RoleName {
  return LEGACY_ROLE_MAP[role] || (role as RoleName);
}

export function getRolePermissions(role: string): Set<PermissionKey> {
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized] ?? ROLE_PERMISSIONS['Operator'];
}
