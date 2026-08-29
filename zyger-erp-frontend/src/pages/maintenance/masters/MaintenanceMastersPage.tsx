import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface Master { id: number; code: string; name: string; active: boolean; description?: string; skillCategory?: string; machineType?: string; defaultFrequency?: string; breakdownCategoryId?: number; contactPerson?: string; contactPhone?: string; email?: string; serviceCategory?: string; }

const TABS = ['Departments', 'Technicians', 'Breakdown Categories', 'Failure Codes', 'Root Cause Codes', 'Activities', 'PM Checklist Templates', 'Service Vendors'] as const;
type TabKey = typeof TABS[number];

const ENDPOINTS: Record<TabKey, { list: string; create: string; fields: string[] }> = {
  'Departments':            { list: '/v1/maintenance/departments',            create: '/v1/maintenance/departments',            fields: ['code', 'name'] },
  'Technicians':            { list: '/v1/maintenance/technicians',            create: '/v1/maintenance/technicians',            fields: ['code', 'name', 'skillCategory', 'userId'] },
  'Breakdown Categories':   { list: '/v1/maintenance/breakdown-categories',   create: '/v1/maintenance/breakdown-categories',   fields: ['code', 'name'] },
  'Failure Codes':          { list: '/v1/maintenance/failure-codes',          create: '/v1/maintenance/failure-codes',          fields: ['code', 'description'] },
  'Root Cause Codes':       { list: '/v1/maintenance/root-cause-codes',       create: '/v1/maintenance/root-cause-codes',       fields: ['code', 'description'] },
  'Activities':             { list: '/v1/maintenance/activities',             create: '/v1/maintenance/activities',             fields: ['code', 'name', 'defaultFrequency'] },
  'PM Checklist Templates': { list: '/v1/maintenance/pm-checklist-templates', create: '/v1/maintenance/pm-checklist-templates', fields: ['code', 'name', 'machineType'] },
  'Service Vendors':        { list: '/v1/maintenance/vendors',                create: '/v1/maintenance/vendors',                fields: ['code', 'name', 'contactPerson', 'contactPhone', 'email', 'serviceCategory'] },
};

const FIELD_LABELS: Record<string, string> = { code: 'Code', name: 'Name', description: 'Description', skillCategory: 'Skill Category', userId: 'User ID', defaultFrequency: 'Default Frequency', machineType: 'Machine Type', contactPerson: 'Contact Person', contactPhone: 'Contact Phone', email: 'Email', serviceCategory: 'Service Category' };

export default function MaintenanceMastersPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('Departments');
  const [rows, setRows] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const ep = ENDPOINTS[activeTab];

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(ep.list);
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); setForm({}); setEditId(null); setSearch(''); }, [activeTab]);

  const save = async () => {
    if (!String(form.code ?? '').trim()) { toast('Code is required.', 'error'); return; }
    if (!String(form.name ?? '').trim() && !String(form.description ?? '').trim()) { toast('Name/Description is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) { await apiClient.put(`${ep.create}/${editId}`, form); toast('Updated.'); }
      else { await apiClient.post(ep.create, form); toast('Created.'); }
      setForm({}); setEditId(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async (id: number) => {
    if (!confirm('Delete this record?')) return;
    setBusy(true);
    try { await apiClient.delete(`${ep.create}/${id}`); toast('Deleted.'); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const edit = (r: Master) => { setEditId(r.id); setForm({ code: r.code ?? '', name: r.name ?? '', description: r.description ?? '', skillCategory: r.skillCategory ?? '', userId: (r as any).userId ?? '', defaultFrequency: r.defaultFrequency ?? '', machineType: r.machineType ?? '', contactPerson: r.contactPerson ?? '', contactPhone: r.contactPhone ?? '', email: r.email ?? '', serviceCategory: r.serviceCategory ?? '' }); };

  const set = (k: string, v: string) => setForm((c) => ({ ...c, [k]: v }));
  const filtered = rows.filter((r) => !search || (r.code ?? '').toLowerCase().includes(search.toLowerCase()) || (r.name ?? '').toLowerCase().includes(search.toLowerCase()) || (r.description ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="pg-head">
      <h3>Maintenance Masters</h3>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {TABS.map((t) => (
          <button key={t} className={`btn ${activeTab === t ? 'primary' : ''}`} onClick={() => setActiveTab(t)} style={{ fontSize: 12 }}>{t}</button>
        ))}
      </div>

      <div className="toolbar">
        <input className="in" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
        <button className="btn primary" onClick={() => { setForm({}); setEditId(null); }}>+ New</button>
      </div>

      {(editId !== null || Object.keys(form).length > 0) && (
        <div className="panel" style={{ marginBottom: 12, padding: 12 }}>
          <strong>{editId ? 'Edit' : 'New'} {activeTab}</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: 8 }}>
            {ep.fields.map((f) => (
              <div key={f}>
                <label style={{ fontSize: 11, color: '#666' }}>{FIELD_LABELS[f] ?? f}</label>
                <input className="in" value={form[f] ?? ''} onChange={(e) => set(f, e.target.value)} style={{ width: '100%' }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <button className="btn primary" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
            <button className="btn" onClick={() => { setForm({}); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Code</th>
              <th>{activeTab === 'Failure Codes' || activeTab === 'Root Cause Codes' ? 'Description' : 'Name'}</th>
              {activeTab === 'Technicians' && <th>Skill Category</th>}
              {activeTab === 'PM Checklist Templates' && <th>Machine Type</th>}
              {activeTab === 'Activities' && <th>Default Frequency</th>}
              {activeTab === 'Service Vendors' && <th>Contact</th>}
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 16, color: '#999' }}>No records</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.code}</td>
                <td>{activeTab === 'Failure Codes' || activeTab === 'Root Cause Codes' ? r.description : r.name}</td>
                {activeTab === 'Technicians' && <td>{r.skillCategory}</td>}
                {activeTab === 'PM Checklist Templates' && <td>{r.machineType}</td>}
                {activeTab === 'Activities' && <td>{r.defaultFrequency}</td>}
                {activeTab === 'Service Vendors' && <td>{r.contactPerson || r.contactPhone || r.email || '-'}</td>}
                <td><span style={{ color: r.active ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{r.active ? 'Yes' : 'No'}</span></td>
                <td>
                  <button className="btn" onClick={() => edit(r)} style={{ marginRight: 4 }}>Edit</button>
                  <button className="btn" onClick={() => del(r.id)} style={{ color: '#ef4444' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
