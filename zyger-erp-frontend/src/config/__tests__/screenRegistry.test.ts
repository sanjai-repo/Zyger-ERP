import { describe, it, expect } from 'vitest';
import { SCREEN_REGISTRY, getScreenComponent } from '../screenRegistry';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

describe('SCREEN_REGISTRY', () => {
  it('contains all critical screens', () => {
    const criticalScreens = [
      'dashboard',
      'sales-order',
      'purchase-order',
      'quality-ncr',
      'production-entry',
      'maintenance-dashboard',
      'inward-entry',
      'work-order',
      'job-card',
      'user-management',
      'access-control',
    ];

    for (const screenId of criticalScreens) {
      expect(SCREEN_REGISTRY, `Missing screen: ${screenId}`).toHaveProperty(screenId);
    }
  });

  it('every screen has a component', () => {
    for (const [id, def] of Object.entries(SCREEN_REGISTRY)) {
      expect(def.component, `Screen "${id}" missing component`).toBeDefined();
      expect(typeof def.component, `Screen "${id}" component is not a function`).toBe('function');
    }
  });

  it('returns ModulePlaceholder for unknown screen', () => {
    const component = getScreenComponent('nonexistent-screen-xyz');
    expect(component).toBe(ModulePlaceholder);
  });

  it('returns a component for every registered screen', () => {
    for (const id of Object.keys(SCREEN_REGISTRY)) {
      const component = getScreenComponent(id);
      expect(component).toBeDefined();
      expect(component).not.toBe(ModulePlaceholder);
    }
  });

  it('has over 100 screens registered', () => {
    const count = Object.keys(SCREEN_REGISTRY).length;
    expect(count).toBeGreaterThan(100);
  });
});
