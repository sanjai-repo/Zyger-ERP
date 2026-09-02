import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from '../navigation';
import { SCREEN_REGISTRY } from '../screenRegistry';

describe('NAV_ITEMS', () => {
  it('has all top-level modules', () => {
    const ids = NAV_ITEMS.map(item => item.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('master');
    expect(ids).toContain('sales');
    expect(ids).toContain('purchase');
    expect(ids).toContain('inventory');
    expect(ids).toContain('planning');
    expect(ids).toContain('production');
    expect(ids).toContain('quality');
    expect(ids).toContain('maintenance');
  });

  it('every top-level item has label and icon', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label, `Item "${item.id}" missing label`).toBeTruthy();
      expect(item.icon, `Item "${item.id}" missing icon`).toBeTruthy();
    }
  });

  it('has no duplicate top-level IDs', () => {
    const ids = NAV_ITEMS.map(item => item.id);
    const unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
  });

  it('all screen items have screenId', () => {
    function checkNodes(nodes: unknown[]) {
      for (const node of nodes as Record<string, unknown>[]) {
        if (node.type === 'item' && node.screenId) {
          expect(typeof node.screenId).toBe('string');
        }
        if (Array.isArray(node.children)) {
          checkNodes(node.children);
        }
      }
    }
    for (const item of NAV_ITEMS) {
      if (item.children) {
        checkNodes(item.children);
      }
    }
  });

  it('deep-links cover all registered screens', () => {
    const screenIds = new Set(Object.keys(SCREEN_REGISTRY));

    function collectScreenIds(nodes: unknown[]): string[] {
      const ids: string[] = [];
      for (const node of nodes as Record<string, unknown>[]) {
        if (node.type === 'item' && node.screenId) {
          ids.push(String(node.screenId));
        }
        if (Array.isArray(node.children)) {
          ids.push(...collectScreenIds(node.children));
        }
      }
      return ids;
    }

    const navScreenIds = new Set<string>();
    for (const item of NAV_ITEMS) {
      if (item.children) {
        collectScreenIds(item.children).forEach(id => navScreenIds.add(id));
      }
      if (item.screenId) navScreenIds.add(item.screenId);
    }

    // Every nav screen should have a registry entry
    for (const navId of navScreenIds) {
      expect(screenIds, `Nav screen "${navId}" has no registry entry`).toContain(navId);
    }
  });
});
