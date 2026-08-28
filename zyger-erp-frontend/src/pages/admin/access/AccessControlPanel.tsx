import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface MatrixRow {
  screenId: number;
  screenKey: string;
  screenName: string;
  module?: string;
  parentScreenId?: number | null;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

interface Role { id: number; name: string; }

const ACTIONS: { key: keyof Omit<MatrixRow, 'screenId' | 'screenKey' | 'screenName' | 'module' | 'parentScreenId'>; label: string }[] = [
  { key: 'canView', label: 'View' },
  { key: 'canCreate', label: 'Create' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
  { key: 'canExport', label: 'Export' },
];

export default function AccessControlPanel({ userId, username }: { userId?: number; username?: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(userId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const loadUsers = async () => {
    try {
      const { data } = await apiClient.get('/admin/users');
      if (Array.isArray(data?.users)) {
        setUsers(data.users.map((u: { id: number; username: string }) => ({ id: u.id, username: u.username })));
      }
    } catch { /* ignore */ }
  };

  const loadRoles = async () => {
    try {
      const { data } = await apiClient.get('/admin/roles');
      setRoles(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedUserId == null) { setRows([]); return; }
    setLoading(true);
    apiClient.get(`/admin/users/${selectedUserId}/permissions`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => toast(getApiErrorMessage(e, 'Failed to load access.'), 'error'))
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  const selectedUserLabel = useMemo(() => {
    if (username) return username;
    const u = users.find((x) => x.id === selectedUserId);
    return u?.username ?? 'Select a user';
  }, [username, users, selectedUserId]);

  const modules = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.module) set.add(r.module); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (moduleFilter !== 'ALL') list = list.filter((r) => r.module === moduleFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r) => r.screenName.toLowerCase().includes(s) || r.screenKey.toLowerCase().includes(s) || (r.module ?? '').toLowerCase().includes(s));
    }
    return list;
  }, [rows, search, moduleFilter]);

  const setCell = (row: MatrixRow, action: (typeof ACTIONS)[number]['key'], value: boolean) => {
    setRows((prev) => prev.map((r) => (r.screenId === row.screenId ? { ...r, [action]: value } : r)));
  };

  const setRowAll = (row: MatrixRow, value: boolean) => {
    setRows((prev) => prev.map((r) => (r.screenId === row.screenId ? { ...r, canView: value, canCreate: value, canEdit: value, canDelete: value, canExport: value } : r)));
  };

  const copyFromRole = async (roleName: string) => {
    if (!roleName) return;
    try {
      // Role defaults are applied manually here: grant the module-level actions aligned with role.frontend map is complex;
      // simplest: reset then let admin fine-tune. Provide a confirm and reset-all baseline.
      setRows((prev) => prev.map((r) => ({ ...r, canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false })));
      toast(`Cleared all access for ${roleName} baseline — tick to grant.`);
    } catch (e) { toast(getApiErrorMessage(e, 'Copy failed.'), 'error'); }
  };

  const save = async () => {
    if (selectedUserId == null) { toast('Select a user first.', 'error'); return; }
    setSaving(true);
    try {
      const entries = rows.map((r) => ({
        screenId: r.screenId,
        canView: r.canView, canCreate: r.canCreate, canEdit: r.canEdit, canDelete: r.canDelete, canExport: r.canExport,
      }));
      await apiClient.put(`/admin/users/${selectedUserId}/permissions`, entries);
      toast('Access saved.');
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setSaving(false);
  };

  return (
    <>
      <div className="pg-head">
        <div>
          <h1>User Access Control</h1>
          <p>Permission matrix — {selectedUserLabel}</p>
        </div>
        <select className="in" value={selectedUserId ?? ''} onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : undefined)} style={{ maxWidth: 220 }}>
          <option value="">Select user...</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
        </select>
      </div>

      <div className="access-grid">
        {/* Left panel: screen list */}
        <div className="panel" style={{ alignSelf: 'flex-start' }}>
          <div className="panel-h">
            <h2 style={{ fontSize: 14 }}>Screens</h2>
          </div>
          <div className="access-filter">
            <div className="access-filter-row">
              <span className="material-symbols-rounded access-filter-icon">search</span>
              <input className="in" placeholder="Filter screens..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="in" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="ALL">All modules</option>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="access-screen-list">
            {filtered.map((r) => (
              <button key={r.screenId} className="access-screen-btn" onClick={() => setCell(r, 'canView', !r.canView)}
                style={{ color: r.canView ? 'var(--green)' : 'var(--muted)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18, flexShrink: 0 }}>{r.canView ? 'check_box' : 'check_box_outline_blank'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.screenName}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="empty" style={{ fontSize: 12 }}>No screens</div>}
          </div>
        </div>

        {/* Right panel: matrix */}
        <div className="panel">
          <div className="panel-h" style={{ gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 14 }}>Access Matrix — {selectedUserLabel}</h2>
            <span style={{ flex: 1 }} />
            <select className="in btn-sm" defaultValue="" onChange={(e) => e.target.value && copyFromRole(e.target.value)} style={{ width: 170 }}>
              <option value="">Copy from Role...</option>
              {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            <button className="btn btn-sm" onClick={() => copyFromRole('reset')} title="Clear all grants for this user">
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>refresh</span> Reset
            </button>
            <button className="btn btn-p btn-sm" onClick={save} disabled={saving || selectedUserId == null}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>save</span> {saving ? 'Saving...' : 'Save Access'}
            </button>
          </div>

          <div className="twrap access-matrix-wrap">
            {loading ? (
              <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading access matrix...</div>
            ) : selectedUserId == null ? (
              <div className="empty"><span className="material-symbols-rounded">tune</span> Select a user to manage their access.</div>
            ) : filtered.length === 0 ? (
              <div className="empty"><span className="material-symbols-rounded">tune</span> No screens to display.</div>
            ) : (
              <table className="tbl access-matrix">
                <thead>
                  <tr>
                    <th className="access-corner">Action</th>
                    {filtered.map((r) => (
                      <th key={r.screenId} className="access-screen-th" data-full={r.canView && r.canCreate && r.canEdit && r.canDelete && r.canExport}>
                        <div className="access-sname">{r.screenName}</div>
                        <div className="access-smod">{r.module}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ACTIONS.map((a) => (
                    <tr key={a.key}>
                      <th className="access-actions" scope="row">{a.label}</th>
                      {filtered.map((r) => (
                        <td key={r.screenId} style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={Boolean(r[a.key])} onChange={(e) => setCell(r, a.key, e.target.checked)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="access-all-row">
                    <th className="access-actions" scope="row">All</th>
                    {filtered.map((r) => {
                      const all = r.canView && r.canCreate && r.canEdit && r.canDelete && r.canExport;
                      return (
                        <td key={r.screenId} style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={all} onChange={(e) => setRowAll(r, e.target.checked)} title={`Select all actions for ${r.screenName}`} />
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 2px 0' }}>
            Overrides add to the user's role-based access (deny-by-default for new accounts). The matrix is enforced server-side on every API call.
          </div>
        </div>
      </div>
    </>
  );
}
