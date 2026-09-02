import { describe, it, expect } from 'vitest';
import { getRolePermissions, normalizeRole, ROLE_PERMISSIONS } from '../rbac';

describe('RBAC', () => {
  describe('normalizeRole', () => {
    it('maps ADMIN to Admin', () => {
      expect(normalizeRole('ADMIN')).toBe('Admin');
    });

    it('maps MANAGER to Management', () => {
      expect(normalizeRole('MANAGER')).toBe('Management');
    });

    it('maps USER to Supervisor', () => {
      expect(normalizeRole('USER')).toBe('Supervisor');
    });

    it('maps VIEWER to Operator', () => {
      expect(normalizeRole('VIEWER')).toBe('Operator');
    });

    it('passes through known role names', () => {
      expect(normalizeRole('Purchase')).toBe('Purchase');
      expect(normalizeRole('Quality')).toBe('Quality');
      expect(normalizeRole('Maintenance')).toBe('Maintenance');
    });
  });

  describe('getRolePermissions', () => {
    it('Admin has all permissions', () => {
      const perms = getRolePermissions('ADMIN');
      const expectedModules = ['master', 'inventory', 'purchase', 'sales', 'planning', 'production', 'quality', 'maintenance'];
      for (const mod of expectedModules) {
        expect(perms.has(`${mod}:View` as const), `Admin missing ${mod}:View`).toBe(true);
        expect(perms.has(`${mod}:Create` as const), `Admin missing ${mod}:Create`).toBe(true);
        expect(perms.has(`${mod}:Delete` as const), `Admin missing ${mod}:Delete`).toBe(true);
      }
    });

    it('Operator has minimal permissions', () => {
      const perms = getRolePermissions('Operator');
      expect(perms.has('production:View')).toBe(true);
      expect(perms.has('production:Create')).toBe(true);
      expect(perms.has('production:Delete')).toBe(false);
      expect(perms.has('sales:View')).toBe(false);
    });

    it('Quality role can manage quality module', () => {
      const perms = getRolePermissions('Quality');
      expect(perms.has('quality:View')).toBe(true);
      expect(perms.has('quality:Create')).toBe(true);
      expect(perms.has('quality:Edit')).toBe(true);
      expect(perms.has('quality:Approve')).toBe(true);
    });

    it('returns Operator permissions for unknown role', () => {
      const perms = getRolePermissions('NonexistentRole');
      const operatorPerms = getRolePermissions('Operator');
      expect(perms.size).toBe(operatorPerms.size);
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('has all 13 defined roles', () => {
      const expectedRoles = [
        'Admin', 'Management', 'Purchase', 'Store', 'Sales',
        'Planning', 'Production', 'Quality', 'Maintenance',
        'Accounts', 'Supervisor', 'Operator', 'Inspector',
      ];
      for (const role of expectedRoles) {
        expect(ROLE_PERMISSIONS, `Missing role: ${role}`).toHaveProperty(role);
      }
    });

    it('every role has at least master:View', () => {
      for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
        expect(perms.has('master:View'), `Role "${role}" missing master:View`).toBe(true);
      }
    });
  });
});
