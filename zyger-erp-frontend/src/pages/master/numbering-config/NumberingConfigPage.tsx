import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

interface NumberingConfig {
  id?: number;
  docType: string;
  prefix: string;
  zeroPad: number;
  resetPerYear: boolean;
  separator: string;
  active: boolean;
}

const EMPTY_FORM: Partial<NumberingConfig> = { docType: '', prefix: '', zeroPad: 6, resetPerYear: true, separator: '-', active: true };

export default function NumberingConfigPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [configs, setConfigs] = useState<NumberingConfig[]>([]);
  const [form, setForm] = useState<Partial<NumberingConfig>>(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<NumberingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/v1/master/numbering-config');
      setConfigs(res.data ?? []);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load numbering configs.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setViewMode('FORM');
  };

  const save = async () => {
    if (!form.docType?.trim()) { toast('Doc Type is required.', 'error'); return; }
    if (!form.prefix?.trim()) { toast('Prefix is required.', 'error'); return; }
    setBusy(true);
    try {
      const payload = {
        docType: form.docType.trim().toLowerCase(),
        prefix: form.prefix.trim(),
        zeroPad: form.zeroPad && form.zeroPad >= 1 ? form.zeroPad : 6,
        resetPerYear: form.resetPerYear ?? true,
        separator: form.separator ?? '-',
        active: form.active ?? true,
      };
      if (editId) {
        await apiClient.put(`/v1/master/numbering-config/${editId}`, payload);
        toast('Numbering config updated.');
      } else {
        await apiClient.post('/v1/master/numbering-config', payload);
        toast('Numbering config created.');
      }
      setViewMode('LIST');
      loadAll();
    } catch (e) { toast(getApiErrorMessage(e, 'Failed to save numbering config.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/v1/master/numbering-config/${deleteTarget.id}`);
      toast('Numbering config deleted.');
      setDeleteTarget(null);
      loadAll();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const filtered = configs.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.docType?.toLowerCase().includes(q) || c.prefix?.toLowerCase().includes(q);
  });

  const preview = `${(form.prefix || 'PREFIX').toUpperCase()}${form.separator ?? '-'}${form.resetPerYear ?? true ? new Date().getFullYear() + '-' : ''}${'1'.padStart(form.zeroPad && form.zeroPad >= 1 ? form.zeroPad : 6, '0')}`;

  return (
    <>
      <div className="pg-head pg-head-flex" style={{ marginBottom: '20px' }}>
        <div className="pg-head-text" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {viewMode === 'FORM' && (
            <button type="button" className="btn btn-secondary" onClick={() => setViewMode('LIST')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-rounded">arrow_back</span> Back
            </button>
          )}
          <div>
            <h1>{viewMode === 'LIST' ? 'Numbering Config' : editId ? 'Edit Numbering Config' : 'Create Numbering Config'}</h1>
            <p>Master -&gt; Numbering Config. Configure document prefixes, zero-padding and yearly reset behaviour.</p>
          </div>
        </div>
        <div>
          {viewMode === 'LIST' ? (
            <button type="button" className="btn btn-primary" onClick={openNew}>+ Add Numbering Config</button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save Config'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setViewMode('LIST')}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'LIST' ? (
        <div className="panel">
          <div className="panel-h" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
            <input
              className="in"
              placeholder="Search by Doc Type or Prefix..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '320px' }}
            />
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{filtered.length} records</span>
          </div>

          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="num">S.No</th>
                  <th>DOC TYPE</th>
                  <th>PREFIX</th>
                  <th>ZERO PAD</th>
                  <th>RESET PER YEAR</th>
                  <th>SEPARATOR</th>
                  <th>PREVIEW</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="empty">Loading numbering configs...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="empty">No numbering configs found.</td></tr>
                ) : (
                  filtered.map((c, idx) => {
                    const sep = c.separator ?? '-';
                    const num = `${c.prefix.toUpperCase()}${sep}${c.resetPerYear ? new Date().getFullYear() + sep : ''}${'1'.padStart(c.zeroPad || 6, '0')}`;
                    return (
                      <tr key={c.id}>
                        <td className="num mut">{idx + 1}</td>
                        <td style={{ fontWeight: 700 }}>{c.docType}</td>
                        <td style={{ fontWeight: 700, color: '#1e3a8a' }}>{c.prefix.toUpperCase()}</td>
                        <td>{c.zeroPad}</td>
                        <td><span style={{ fontWeight: 700, color: c.resetPerYear ? '#166534' : '#b45309' }}>{c.resetPerYear ? 'Yes' : 'No'}</span></td>
                        <td>{sep}</td>
                        <td style={{ fontFamily: 'monospace', color: '#475569' }}>{num}</td>
                        <td><span style={{ fontWeight: 700, color: c.active ? '#166534' : '#dc2626' }}>{c.active ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" className="ibtn" title="Edit" onClick={() => { setForm(c); setEditId(c.id!); setViewMode('FORM'); }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                            </button>
                            <button type="button" className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(c)}>
                              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pager" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Showing 1–{filtered.length} of {filtered.length}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button type="button" className="btn btn-sm" disabled>&lt;</button>
              <button type="button" className="btn btn-sm btn-primary">1</button>
              <button type="button" className="btn btn-sm" disabled>&gt;</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel">
          <form onSubmit={e => { e.preventDefault(); save(); }} style={{ padding: '20px' }}>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <label className="fld">
                <span>DOC TYPE *</span>
                <input className="in" type="text" required value={form.docType || ''} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))} placeholder="purchase-order" />
              </label>
              <label className="fld">
                <span>PREFIX *</span>
                <input className="in" type="text" required maxLength={20} value={form.prefix || ''} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} placeholder="PO" />
              </label>
              <label className="fld">
                <span>ZERO PAD</span>
                <input className="in" type="number" min={1} max={12} value={form.zeroPad ?? 6} onChange={e => setForm(f => ({ ...f, zeroPad: e.target.value ? Number(e.target.value) : undefined }))} />
              </label>
              <label className="fld">
                <span>SEPARATOR</span>
                <input className="in" type="text" maxLength={10} value={form.separator ?? '-'} onChange={e => setForm(f => ({ ...f, separator: e.target.value }))} />
              </label>
              <label className="fld" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                <input type="checkbox" checked={form.resetPerYear ?? true} onChange={e => setForm(f => ({ ...f, resetPerYear: e.target.checked }))} />
                <span style={{ textTransform: 'none', fontWeight: 500 }}>Reset sequence each year</span>
              </label>
              <label className="fld" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                <input type="checkbox" checked={form.active ?? true} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                <span style={{ textTransform: 'none', fontWeight: 500 }}>Active</span>
              </label>
            </div>

            <div style={{ marginTop: '16px', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>NEXT NUMBER PREVIEW&nbsp;&nbsp;</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e3a8a' }}>{preview}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" disabled={busy}>Save Config</button>
              <button type="button" className="btn btn-secondary" onClick={() => setViewMode('LIST')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.docType ?? ''}`} body="Permanently delete this numbering config? Documents of this type will fall back to default numbering." okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
