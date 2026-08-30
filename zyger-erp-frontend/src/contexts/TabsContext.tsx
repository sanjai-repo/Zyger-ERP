import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getScreenComponent } from '../config/screenRegistry';
import { NAV_ITEMS } from '../config/navigation';
import { useAuth } from './AuthContext';

export interface Tab {
  id: string;
  label: string;
  icon: string;
  pin?: boolean;
  component: React.ComponentType<any>;
  props?: any;
  reopen?: boolean;
  stamp?: number;
}

interface TabsContextType {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Omit<Tab, 'component'> & { component: React.ComponentType<any> }) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const STORAGE_KEY = 'zyger-tabs';
const DASHBOARD_TAB: Tab = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: 'space_dashboard',
  pin: true,
  component: getScreenComponent('dashboard'),
};

function findNavMeta(screenId: string): { label: string; icon: string } | null {
  function walk(nodes: unknown[]): { label: string; icon: string } | null {
    for (const n of nodes as Record<string, unknown>[]) {
      if (n.type === 'item' && n.screenId === screenId) {
        return { label: String(n.label), icon: String(n.icon ?? 'article') };
      }
      if (Array.isArray(n.children)) {
        const found = walk(n.children);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(NAV_ITEMS);
}

function loadSavedState(): { tabIds: string[]; activeTabId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tabIds) && typeof parsed.activeTabId === 'string') {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveState(tabIds: string[], activeTabId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabIds, activeTabId }));
  } catch { /* ignore */ }
}

function buildTabsFromIds(ids: string[]): Tab[] {
  const tabs: Tab[] = [];
  for (const id of ids) {
    if (id === 'dashboard') {
      tabs.push(DASHBOARD_TAB);
      continue;
    }
    const component = getScreenComponent(id);
    const meta = findNavMeta(id);
    tabs.push({
      id,
      label: meta?.label ?? id,
      icon: meta?.icon ?? 'article',
      component,
    });
  }
  return tabs;
}

export function TabsProvider({ children }: { children: ReactNode }) {
  const { screensLoaded, canScreen } = useAuth();
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const saved = loadSavedState();
    if (saved && saved.tabIds.length > 0) {
      return buildTabsFromIds(saved.tabIds);
    }
    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const saved = loadSavedState();
    if (saved && saved.tabIds.includes(saved.activeTabId)) {
      return saved.activeTabId;
    }
    return null;
  });

  const isInitialMount = useRef(true);

  // Once the user's screen matrix is loaded, drop restored tabs the user can no longer view.
  useEffect(() => {
    if (!screensLoaded) return;
    setTabs(prev => {
      const next = prev.filter(t => t.id === 'dashboard' || canScreen(t.id, 'View'));
      setActiveTabId(active => (active === null || next.some(t => t.id === active) ? active : (next.length > 0 ? next[next.length - 1].id : null)));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screensLoaded]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveState(tabs.map(t => t.id), activeTabId);
  }, [tabs, activeTabId]);

  const openTab = useCallback((newTab: Tab) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === newTab.id);
      if (idx === -1) return [...prev, newTab];
      if (newTab.reopen) {
        const copy = [...prev];
        copy[idx] = { ...newTab, stamp: (prev[idx].stamp ?? 0) + 1 };
        return copy;
      }
      return prev;
    });
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback((id: string) => {
    let newActive: string | null = activeTabId;
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        newActive = next.length > 0 ? next[next.length - 1].id : null;
      }
      return next;
    });
    if (newActive !== activeTabId) setActiveTabId(newActive);
  }, [activeTabId]);

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  return (
    <TabsContext.Provider value={{ tabs, activeTabId, openTab, closeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

export const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('useTabs must be used within TabsProvider');
  return context;
};
