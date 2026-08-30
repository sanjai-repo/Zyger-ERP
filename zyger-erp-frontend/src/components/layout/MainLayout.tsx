import { Suspense, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTabs } from '../../contexts/TabsContext';
import Navigation, { type NavigationNavigatePayload } from './Navigation';
import { getScreenComponent } from '../../config/screenRegistry';
import { NAV_ITEMS, type NavNode, type NavTopItem } from '../../config/navigation';
import DashboardPage from '../../pages/dashboard/DashboardPage';
import apiClient from '../../api/axiosClient';

interface SearchResult {
  id: string;
  label: string;
  icon: string;
  screenId: string;
}

interface RecordResult {
  key: string;
  typeLabel: string;
  screenId: string;
  icon: string;
  title: string;
  subtitle: string;
}

const RECORD_SEARCH_MIN_CHARS = 3;

const ITEM_SCREEN_BY_TYPE: Record<string, string> = {
  PURCHASABLE: 'purchasable-item',
  CUSTOMER_SUPPLIED: 'customer-supplied-item',
  MANUFACTURING: 'manufacturing-item',
};

function unwrapContent(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const d = data as Record<string, unknown> | null | undefined;
  return Array.isArray(d?.content) ? (d.content as Record<string, unknown>[]) : [];
}

function field(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function docRecord(typeLabel: string, screenId: string, icon: string, row: Record<string, unknown>): RecordResult {
  return {
    key: `${screenId}-${field(row, 'id', 'docNo')}`,
    typeLabel,
    screenId,
    icon,
    title: field(row, 'docNo') || '(no number)',
    subtitle: [field(row, 'supplier', 'buyer'), field(row, 'date'), field(row, 'status')].filter(Boolean).join(' · '),
  };
}

interface Notification {
  id: string;
  message: string;
  detail: string;
  icon: string;
  color: string;
  timestamp: number;
  screenId?: string;
}

function flattenNav(nodes: unknown[], icon?: string): SearchResult[] {
  const out: SearchResult[] = [];
  for (const n of nodes as Record<string, unknown>[]) {
    if (n.type === 'item' && n.screenId) {
      out.push({ id: String(n.id), label: String(n.label), icon: String(n.icon ?? icon ?? 'article'), screenId: String(n.screenId) });
    }
    if (n.type === 'group' && Array.isArray(n.children)) {
      out.push(...flattenNav(n.children, String(n.icon ?? icon)));
    }
  }
  return out;
}

function filterNavByPermission(nodes: NavNode[], canView: (screenId: string) => boolean): NavNode[] {
  const result: NavNode[] = [];
  for (const node of nodes) {
    if (node.type === 'heading') {
      result.push(node);
      continue;
    }
    if (node.type === 'item') {
      if (node.screenId) {
        if (canView(node.screenId)) result.push(node);
      } else {
        result.push(node);
      }
      continue;
    }
    if (node.type === 'group') {
      const filtered = filterNavByPermission(node.children, canView);
      if (filtered.length > 0) {
        result.push({ ...node, children: filtered });
      }
    }
  }
  return result;
}

function filterTopItems(items: NavTopItem[], canView: (screenId: string) => boolean): NavTopItem[] {
  const result: NavTopItem[] = [];
  for (const item of items) {
    const hasChildren = item.children && item.children.length > 0;
    if (!hasChildren) {
      if (item.id === 'dashboard') { result.push(item); continue; }
      if (item.screenId) { if (canView(item.screenId)) result.push(item); }
      else { result.push(item); }
      continue;
    }
    const filtered = filterNavByPermission(item.children!, canView);
    if (filtered.length > 0) {
      result.push({ ...item, children: filtered });
    }
  }
  return result;
}

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('zyger-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  }
  return 'light';
}

const NOTIF_POLL_MS = 60_000;

export default function MainLayout() {
  const { user, logout, can, canScreen } = useAuth();
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useTabs();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [recordResults, setRecordResults] = useState<RecordResult[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('Zyger ERP');
  const [now, setNow] = useState(() => new Date());

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Live clock for the top bar.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zyger-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const refreshCompanyInfo = useCallback(() => {
    apiClient.get('/master/company-info').then(res => {
      const d = res.data;
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      if (d?.companyLogoUrl) {
        // Cache-buster from the stored URL so a freshly uploaded logo shows immediately.
        setCompanyLogo(baseUrl.replace(/\/$/, '') + '/master/company-info/logo/company?v=' + encodeURIComponent(d.companyLogoUrl));
      } else {
        setCompanyLogo(null);
      }
      if (d?.companyName) setCompanyName(d.companyName);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCompanyInfo();
  }, [refreshCompanyInfo]);

  // Refresh the branding immediately after a logo/company-info update (no page reload).
  useEffect(() => {
    const handler = () => refreshCompanyInfo();
    window.addEventListener('company-info-updated', handler);
    return () => window.removeEventListener('company-info-updated', handler);
  }, [refreshCompanyInfo]);

  // Show the uploaded company logo as the browser favicon.
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = companyLogo ?? '/favicon.svg';
  }, [companyLogo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setSearchQuery('');
    }
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredNavItems = useMemo(
    () => filterTopItems(NAV_ITEMS, (sid) => canScreen(sid, 'View')),
    [canScreen]
  );

  const filteredScreens = useMemo(() => {
    const allScreens = flattenNav(NAV_ITEMS);
    return allScreens.filter((s) => canScreen(s.screenId, 'View'));
  }, [canScreen]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return filteredScreens.filter((s) => {
      const label = s.label.toLowerCase();
      const id = s.id.toLowerCase();
      return words.every((w) => label.includes(w) || id.includes(w));
    });
  }, [searchQuery, filteredScreens]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < RECORD_SEARCH_MIN_CHARS) {
      setRecordResults([]);
      setRecordsLoading(false);
      return;
    }
    const controller = new AbortController();
    setRecordsLoading(true);
    const timer = setTimeout(() => {
      const jobs: Promise<RecordResult[]>[] = [];
      if (can('purchase', 'View')) {
        jobs.push(
          apiClient
            .get('/v1/purchase/purchase-order', { params: { search: q, size: 5 }, signal: controller.signal })
            .then((res) => unwrapContent(res.data).map((row) => docRecord('PO', 'purchase-order', 'receipt_long', row)))
            .catch(() => [])
        );
      }
      if (can('sales', 'View')) {
        jobs.push(
          apiClient
            .get('/v1/sales/sales-order', { params: { search: q, size: 5 }, signal: controller.signal })
            .then((res) => unwrapContent(res.data).map((row) => docRecord('SO', 'sales-order', 'shopping_cart', row)))
            .catch(() => [])
        );
      }
      if (can('master', 'View')) {
        jobs.push(
          apiClient
            .get('/master/parties', { params: { kind: 'CUSTOMER', search: q, size: 5 }, signal: controller.signal })
            .then((res) =>
              unwrapContent(res.data).map((row) => ({
                key: `customer-${field(row, 'id', 'code')}`,
                typeLabel: 'Customer',
                screenId: 'customer-list',
                icon: 'contacts',
                title: field(row, 'code') || field(row, 'name') || '(no code)',
                subtitle: [field(row, 'name'), field(row, 'contactPerson')].filter(Boolean).join(' · '),
              }))
            )
            .catch(() => [])
        );
        jobs.push(
          apiClient
            .get('/master/parties', { params: { kind: 'SUPPLIER', search: q, size: 5 }, signal: controller.signal })
            .then((res) =>
              unwrapContent(res.data).map((row) => ({
                key: `supplier-${field(row, 'id', 'code')}`,
                typeLabel: 'Supplier',
                screenId: 'supplier-list',
                icon: 'local_shipping',
                title: field(row, 'code') || field(row, 'name') || '(no code)',
                subtitle: [field(row, 'name'), field(row, 'contactPerson')].filter(Boolean).join(' · '),
              }))
            )
            .catch(() => [])
        );
        jobs.push(
          apiClient
            .get('/master/items', { params: { search: q, size: 5 }, signal: controller.signal })
            .then((res) =>
              unwrapContent(res.data).map((row) => ({
                key: `item-${field(row, 'id', 'code')}`,
                typeLabel: 'Item',
                screenId: ITEM_SCREEN_BY_TYPE[field(row, 'itemType').toUpperCase()] ?? 'purchasable-item',
                icon: 'category',
                title: field(row, 'code') || '(no code)',
                subtitle: field(row, 'description'),
              }))
            )
            .catch(() => [])
        );
      }
      Promise.all(jobs).then((groups) => {
        if (controller.signal.aborted) return;
        setRecordResults(groups.flat());
        setRecordsLoading(false);
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, can]);

  useEffect(() => {
    if (tabs.length === 0) {
      openTab({ id: 'dashboard', label: 'Dashboard', icon: 'space_dashboard', pin: true, component: DashboardPage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openScreen = (payload: NavigationNavigatePayload) => {
    openTab({
      id: payload.id,
      label: payload.label,
      icon: payload.icon,
      component: getScreenComponent(payload.id),
      props: { title: payload.label, screenId: payload.id },
    });
    setSearchOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
  };

  const openSearchResult = (result: SearchResult) => {
    openScreen({ id: result.screenId, label: result.label, icon: result.icon });
  };

  const openRecord = (record: RecordResult) => {
    openScreen({ id: record.screenId, label: record.typeLabel, icon: record.icon });
  };

  const openNotifScreen = (screenId: string) => {
    openScreen({ id: screenId, label: screenId, icon: 'notifications' });
  };

  const fetchNotifications = useCallback(async () => {
    const items: Notification[] = [];
    const now = Date.now();
    try {
      if (can('inventory', 'View')) {
        const res = await apiClient.get('/inventory/reports/overview');
        const d = res.data as Record<string, unknown>;
        if ((d.pendingApprovalCount as number) > 0) {
          items.push({
            id: 'pending-approval',
            message: `${d.pendingApprovalCount} documents pending approval`,
            detail: 'Review and approve pending inventory documents',
            icon: 'pending_actions',
            color: 'var(--yellow)',
            timestamp: now,
            screenId: 'reports',
          });
        }
        if ((d.pendingInwardCount as number) > 0) {
          items.push({
            id: 'pending-inward',
            message: `${d.pendingInwardCount} items awaiting inward`,
            detail: 'Complete pending store receipt entries',
            icon: 'move_to_inbox',
            color: 'var(--blue)',
            timestamp: now,
            screenId: 'inward-entry',
          });
        }
        if ((d.lowStockCount as number) > 0) {
          items.push({
            id: 'low-stock',
            message: `${d.lowStockCount} items below reorder level`,
            detail: 'Review low-stock items and create purchase requests',
            icon: 'warning',
            color: 'var(--red)',
            timestamp: now,
            screenId: 'current-stock',
          });
        }
      }
    } catch { /* best-effort */ }

    try {
      if (can('quality', 'View')) {
        const res = await apiClient.get('/v1/quality/inspections');
        const data = res.data as Record<string, unknown>;
        const list = (data.content ?? data) as unknown[];
        if (Array.isArray(list)) {
          const pending = (list as Record<string, unknown>[]).filter((i) => i.status === 'PENDING');
          if (pending.length > 0) {
            items.push({
              id: 'quality-pending',
              message: `${pending.length} inspections pending`,
              detail: 'Quality inspections require attention',
              icon: 'fact_check',
              color: 'var(--purple)',
              timestamp: now,
              screenId: 'inspection-pending',
            });
          }
        }
      }
    } catch { /* best-effort */ }

    try {
      const res = await apiClient.get('/api/v1/notifications');
      const list = Array.isArray(res.data) ? (res.data as Record<string, unknown>[]) : [];
      for (const n of list) {
        const sev = String(n.severity ?? 'INFO');
        const color = sev === 'CRITICAL' ? 'var(--red)' : sev === 'WARNING' ? 'var(--yellow)' : 'var(--blue)';
        const evt = String(n.eventType ?? '');
        const icon = evt.startsWith('BREAKDOWN') ? 'report' : evt.startsWith('CALIBRATION') ? 'science' : evt.startsWith('PM_') || evt.includes('PM') ? 'build' : 'notifications';
        items.push({
          id: `notif-${String(n.id)}`,
          message: String(n.message ?? ''),
          detail: String(n.entityRef ?? '') || 'New notification',
          icon,
          color,
          timestamp: typeof n.createdAt === 'number' ? n.createdAt : now,
          screenId: 'notification-log',
        });
      }
    } catch { /* best-effort */ }

    setNotifications(items);
  }, [can]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, NOTIF_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <>
      {searchOpen && (
        <div className="search-pop" onClick={() => setSearchOpen(false)}>
          <div className="search-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--muted)', fontSize: 22 }}>search</span>
              <input
                ref={searchRef}
                className="in"
                placeholder="Type to search screens and records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  if (searchResults.length > 0) openSearchResult(searchResults[0]);
                  else if (recordResults.length > 0) openRecord(recordResults[0]);
                }}
                style={{ flex: 1, fontSize: 15 }}
              />
              <button className="btn btn-sm" onClick={() => setSearchOpen(false)}>ESC</button>
            </div>
            <div style={{ maxHeight: 360, overflow: 'auto' }}>
              {!searchQuery.trim() ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 28, display: 'block', margin: '0 auto 6px', opacity: 0.4 }}>search</span>
                  Type to search screens and records...
                </div>
              ) : (
                <>
                  {searchResults.map((r, i) => (
                    <button
                      key={r.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
                        border: 'none', background: i === 0 ? 'var(--blue-bg)' : 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        fontSize: 14, color: 'var(--text)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i === 0 ? 'var(--blue-bg)' : 'none')}
                      onClick={() => openSearchResult(r)}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--muted)' }}>{r.icon}</span>
                      {r.label}
                      {i === 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>Enter ↵</span>}
                    </button>
                  ))}
                  {(recordResults.length > 0 || recordsLoading) && (
                    <div style={{ padding: searchResults.length > 0 ? '12px 12px 4px' : '4px 12px', fontSize: 11, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      Records{recordsLoading ? '…' : ''}
                    </div>
                  )}
                  {recordResults.map((r, i) => (
                    <button
                      key={r.key}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '8px 12px',
                        border: 'none', background: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      onClick={() => openRecord(r)}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--muted)', marginTop: 2 }}>{r.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <b style={{ fontSize: 13, color: 'var(--text)' }}>{r.title}</b>
                          <span style={{ fontSize: 10, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '1px 7px' }}>{r.typeLabel}</span>
                          {searchResults.length === 0 && i === 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>Enter ↵</span>}
                        </div>
                        {r.subtitle && (
                          <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subtitle}</small>
                        )}
                      </div>
                    </button>
                  ))}
                  {searchResults.length === 0 && recordResults.length === 0 && !recordsLoading && (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 32, display: 'block', margin: '0 auto 8px', opacity: 0.3 }}>search_off</span>
                      No results for "<b>{searchQuery}</b>"
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          {companyLogo ? (
            <div className="brand-logo" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', boxShadow: 'none' }}>
              <img src={companyLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'transparent' }} />
            </div>
          ) : (
            <div className="brand-logo">Z</div>
          )}
          <div className="brand-titles">
            <b>{companyName}</b>
            <small>Precision Manufacturing ERP</small>
          </div>
        </div>

        <div className="top-actions">
          <button className="icon-btn" title="Search (Ctrl+K)" onClick={() => setSearchOpen(true)}>
            <span className="material-symbols-rounded">search</span>
          </button>

          <button className="icon-btn" title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} onClick={toggleTheme}>
            <span className="material-symbols-rounded">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>

          <div ref={notifRef} style={{ position: 'relative' }}>
            <button className="icon-btn" title="Notifications" onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false); }}>
              <span className="material-symbols-rounded">notifications</span>
              {notifications.length > 0 && <span className="n-badge">{notifications.length}</span>}
            </button>
            {notifOpen && (
              <div className="pop show">
                <div className="p-head">
                  <b style={{ fontSize: 13 }}>Notifications</b>
                  <small>{notifications.length} unread</small>
                </div>
                <hr />
                {notifications.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 28, display: 'block', margin: '0 auto 6px', opacity: 0.4 }}>notifications_off</span>
                    No pending notifications
                  </div>
                ) : notifications.map((n) => (
                  <a
                    key={n.id}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (n.screenId) openNotifScreen(n.screenId);
                      setNotifOpen(false);
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ color: n.color }}>{n.icon}</span>
                    <div>
                      <b style={{ fontSize: 12 }}>{n.message}</b>
                      <small style={{ display: 'block', color: 'var(--muted)', fontSize: 11 }}>{n.detail}</small>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="top-clock">
            <b>{now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b>
            <small>{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small>
          </div>

          <div ref={profileRef} className="pop-wrap">
            <button className="profile-btn" onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false); }}>
              <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
              <span className="p-name">{user?.username || 'User'}</span>
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>expand_more</span>
            </button>
            {profileOpen && (
              <div className="pop show">
                <div className="p-head">
                  <div className="avatar big">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
                  <div>
                    <b style={{ fontSize: 13 }}>{user?.username || 'User'}</b>
                    <small style={{ textTransform: 'capitalize' }}>{user?.role || 'User'}</small>
                  </div>
                </div>
                <hr />
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  openScreen({ id: 'user-management', label: 'My Profile', icon: 'person' });
                }}>
                  <span className="material-symbols-rounded">person</span>
                  My Profile
                </a>
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  toggleTheme();
                }}>
                  <span className="material-symbols-rounded">settings</span>
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); }}>
                  <span className="material-symbols-rounded">help</span>
                  Help & Support
                </a>
                <hr />
                <a href="#" className="out" onClick={(e) => { e.preventDefault(); logout(); }}>
                  <span className="material-symbols-rounded">logout</span>
                  Sign Out
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <Navigation items={filteredNavItems} onNavigate={openScreen} />

      <div className="tabbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${tab.id === activeTabId ? 'on' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {!tab.pin && (
              <span className="x" onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }}>✕</span>
            )}
          </button>
        ))}
      </div>

      <main className="view-container">
        {tabs.map((tab) => {
          const Comp = tab.component;
          return (
            <div key={tab.stamp != null ? `${tab.id}:${tab.stamp}` : tab.id} style={{ display: tab.id === activeTabId ? 'block' : 'none' }}>
              <Suspense fallback={<div className="empty" style={{ padding: 32 }}>Loading…</div>}>
                <Comp {...(tab.props ?? {})} />
              </Suspense>
            </div>
          );
        })}
      </main>
    </>
  );
}
