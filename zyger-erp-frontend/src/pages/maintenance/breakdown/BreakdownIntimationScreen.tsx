import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

interface Breakdown {
  id: number;
  breakdownNumber: string;
  breakdownDate: string;
  breakdownTime: string;
  machineCode: string;
  machineStatus: string;
  reportedBy: string;
  cncAlarmCode: string;
  problemDescription: string;
  priority: string;
  status: string;
}

interface Machine { id: number; code: string; name: string; status: string; }

const SC: Record<string, { color: string; bg: string }> = {
  OPEN: { color: '#2563eb', bg: '#dbeafe' },
  ASSIGNED: { color: '#f59e0b', bg: '#fef3c7' },
  DIAGNOSED: { color: '#0d9488', bg: '#ccfbf1' },
  CLOSED: { color: '#22c55e', bg: '#d4edda' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
};

const MACHINE_STATUSES = ['RUNNING', 'STOPPED', 'DEGRADED'];

export default function BreakdownIntimationScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Breakdown[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Breakdown | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [actionTarget, setActionTarget] = useState<{ id: number; action: string; label: string } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [createdNotice, setCreatedNotice] = useState<{
    breakdownNumber: string;
    machineCode: string;
    machineName: string;
    cncAlarmCode: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/maintenance/breakdowns');
      setRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    apiClient.get('/master/machines').then(({ data }) => setMachines(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const openNew = async () => {
    setForm({}); setEditId(null);
    try {
      const { data } = await apiClient.get('/v1/maintenance/breakdowns/next-code');
      setForm((c) => ({ ...c, breakdownNumber: data?.code || 'BDI-', autoNumber: true }));
    } catch { setForm((c) => ({ ...c, breakdownNumber: '', autoNumber: true })); }
    setTab('form');
  };

  const save = async () => {
    if (!String(form.machineCode ?? '').trim()) { toast('Machine is required.', 'error'); return; }
    if (!String(form.problemDescription ?? '').trim()) { toast('Problem description is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/v1/maintenance/breakdowns/${editId}`, form);
        toast('Breakdown updated.');
      } else {
        const { data } = await apiClient.post('/v1/maintenance/breakdowns', form);
        const mCode = data?.machineCode || String(form.machineCode || 'N/A');
        const mObj = machines.find((m) => m.code === mCode);
        const mName = mObj?.name ?? '-';
        const mDisplay = mObj ? `${mCode} (${mName})` : mCode;
        const alarmCode = data?.cncAlarmCode || form.cncAlarmCode || 'N/A';
        const bdNo = data?.breakdownNumber || form.breakdownNumber || 'BDI-';

        toast(`Breakdown Created! No: ${bdNo} | Machine: ${mDisplay} | Alarm Code: ${alarmCode}`);
        setCreatedNotice({
          breakdownNumber: bdNo,
          machineCode: mCode,
          machineName: mName,
          cncAlarmCode: String(alarmCode),
        });
      }
      setForm({}); setEditId(null); setTab('list'); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try { await apiClient.delete(`/v1/maintenance/breakdowns/${deleteTarget.id}`); toast('Deleted.'); setDeleteTarget(null); load(); }
    catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const action = async (id: number, act: string, note?: string) => {
    setBusy(true);
    try {
      await apiClient.post(`/v1/maintenance/breakdowns/${id}/actions/${act}`, note ? { note } : undefined);
      toast(`Breakdown ${act}.`); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
    setBusy(false);
  };

  const backToList = () => { setForm({}); setEditId(null); setTab('list'); };
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));
  const filtered = rows.filter((r) => !search || (r.breakdownNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (r.machineCode ?? '').toLowerCase().includes(search.toLowerCase()));

  const machineName = (code: string) => machines.find((m) => m.code === code)?.name ?? '-';

  const inlineActions = (r: Breakdown) => {
    const btns: { label: string; cls: string; onClick: () => void }[] = [];
    if (r.status === 'OPEN') btns.push({ label: 'Assign', cls: '', onClick: () => setActionTarget({ id: r.id, action: 'assign', label: 'Assign' }) });
    if (r.status === 'ASSIGNED') btns.push({ label: 'Diagnose', cls: '', onClick: () => setActionTarget({ id: r.id, action: 'diagnose', label: 'Diagnose' }) });
    if (r.status === 'OPEN' || r.status === 'ASSIGNED' || r.status === 'DIAGNOSED') {
      btns.push({ label: 'Close', cls: 'btn-g', onClick: () => action(r.id, 'close') });
      btns.push({ label: 'Cancel', cls: 'btn-d', onClick: () => action(r.id, 'cancel') });
    }
    return btns;
  };

  return (
    <>
      <div className="pg-head"><h1>Breakdown Intimation</h1><p>Record and track machine breakdowns</p></div>

      {createdNotice && (
        <div style={{
          background: 'var(--blue-bg, #eff6ff)',
          border: '1px solid var(--blue-border, #bfdbfe)',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)'
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '32px' }}>
              notifications_active
            </span>
            <div>
              <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '15px', marginBottom: '4px' }}>
                Breakdown Intimation Created
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px', color: '#1e293b' }}>
                <span><strong>Breakdown No:</strong> <span style={{ color: '#2563eb', fontWeight: 600 }}>{createdNotice.breakdownNumber}</span></span>
                <span><strong>Machine Name:</strong> <span>{createdNotice.machineCode} {createdNotice.machineName !== '-' ? `(${createdNotice.machineName})` : ''}</span></span>
                <span><strong>Alarm Code:</strong> <span style={{ fontFamily: 'monospace', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{createdNotice.cncAlarmCode || 'N/A'}</span></span>
              </div>
            </div>
          </div>
          <button className="ibtn" onClick={() => setCreatedNotice(null)} title="Dismiss notification" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      )}

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Breakdown</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Breakdown No. (Auto)</span>
              <input className="in" value={String(form.breakdownNumber ?? '')} disabled placeholder="Auto-generated" />
            </label>
            <label className="fld"><span>Machine *</span>
              <select className="in" value={String(form.machineCode ?? '')} onChange={(e) => set('machineCode', e.target.value)}>
                <option value="">Select machine...</option>
                {machines.map((m) => <option key={m.code} value={m.code}>{m.code} — {m.name}</option>)}
              </select>
            </label>
            <label className="fld"><span>Breakdown Time</span><input className="in" type="time" value={String(form.breakdownTime ?? '').slice(0, 5)} onChange={(e) => set('breakdownTime', e.target.value)} /></label>
            <label className="fld"><span>Machine Status</span>
              <select className="in" value={String(form.machineStatus ?? '')} onChange={(e) => set('machineStatus', e.target.value)}>
                <option value="">Select...</option>
                {MACHINE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>CNC Alarm Code</span><input className="in" value={String(form.cncAlarmCode ?? '')} onChange={(e) => set('cncAlarmCode', e.target.value)} /></label>
            <label className="fld" style={{ gridColumn: 'span 2' }}><span>Problem Description *</span><textarea className="in" rows={3} value={String(form.problemDescription ?? '')} onChange={(e) => set('problemDescription', e.target.value)} /></label>
          </div>
          <div className="actbar">
            <span className="lft"><button className="btn btn-sm" onClick={backToList}><span className="material-symbols-rounded">arrow_back</span> Back</button></span>
            <span className="rgt">
              {editId && <button className="btn btn-sm" onClick={backToList}>Cancel</button>}
              <button className="btn btn-sm btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
            </span>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar" style={{ gap: '8px', justifyContent: 'flex-start' }}>
            <input className="in" placeholder="Search breakdowns..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '250px' }} />
            <button className="btn btn-p" onClick={openNew}>+ New Breakdown</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Breakdown No.</th><th>Machine</th><th>Machine Status</th><th>Breakdown Time</th><th>CNC Alarm</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No breakdowns.</div></td></tr> : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.breakdownNumber}</b></td>
                      <td>{r.machineCode}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{machineName(r.machineCode)}</div></td>
                      <td>{r.machineStatus ?? '-'}</td>
                      <td>{r.breakdownTime ? r.breakdownTime.slice(0, 5) : '-'}</td>
                      <td>{r.cncAlarmCode ?? '-'}</td>
                      <td><StatusBadge status={r.status} variant={SC} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {inlineActions(r).length === 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                          {inlineActions(r).map((b) => (
                            <button key={b.label} className={`btn btn-sm ${b.cls}`} onClick={b.onClick} disabled={busy}>{b.label}</button>
                          ))}
                          <button className="ibtn" title="Edit" onClick={() => { setForm(r as unknown as Record<string, unknown>); setEditId(r.id); setTab('form'); }}>
                            <span className="material-symbols-rounded">edit</span>
                          </button>
                          {r.status === 'OPEN' && (
                            <button className="ibtn" title="Delete" onClick={() => setDeleteTarget(r)}>
                              <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {actionTarget && (
        <div className="search-pop" onClick={() => setActionTarget(null)}>
          <div className="search-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ margin: '0 0 12px' }}>{actionTarget.label} Breakdown</h3>
            <label className="fld"><span>Note (optional)</span>
              <input className="in" value={actionNote} onChange={(e) => setActionNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { action(actionTarget.id, actionTarget.action, actionNote); setActionTarget(null); setActionNote(''); } }} autoFocus />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => { setActionTarget(null); setActionNote(''); }}>Cancel</button>
              <button className="btn btn-p" onClick={() => { action(actionTarget.id, actionTarget.action, actionNote); setActionTarget(null); setActionNote(''); }} disabled={busy}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.breakdownNumber ?? ''}`} body="Permanently delete?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
