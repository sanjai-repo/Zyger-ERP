import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTabs } from '../../../contexts/TabsContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';
import { exportToCsv } from '../../../utils/csvExport';
import {
  listBatchCards,
  createBatchCard,
  updateBatchCard,
  runBatchCardAction,
} from '../../../services/batchCardApi';
import type { BatchCard, BatchCardAllocation, EntryOption } from '../../../services/batchCardApi';

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  OPEN: { color: '#2563eb', bg: '#dbeafe' },
  HELD: { color: '#92400e', bg: '#fef3c7' },
  CLOSED: { color: '#22c55e', bg: '#d4edda' },
};

let rowSeq = 0;

function emptyAllocation(): BatchCardAllocation {
  rowSeq += 1;
  return { lineNo: rowSeq, batchNumber: '', lotNumber: '', heatNumber: '', quantity: 0, location: 'STORE' };
}

export function BatchCardScreen({ screenId }: { screenId: string }) {
  const { toast } = useToast();
  const { can } = useAuth();
  const { closeTab } = useTabs();

  const [rows, setRows] = useState<BatchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [allocations, setAllocations] = useState<BatchCardAllocation[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [entryOptions, setEntryOptions] = useState<EntryOption[]>([]);
  const [reversalTarget, setReversalTarget] = useState<BatchCard | null>(null);

  const backToList = () => closeTab(screenId);
  const set = (k: string, v: unknown) => setForm((c) => ({ ...c, [k]: v }));

  const fetchEntries = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/v1/production/entries', { params: { size: 50 } });
      setEntryOptions(Array.isArray(data) ? data : data.content ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listBatchCards());
    } catch (e) {
      toast(getApiErrorMessage(e, 'Load failed.'), 'error');
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    fetchEntries();
    setForm({ entryId: undefined, itemCode: '', quantity: 0, physicalBatchNumber: '', lotNumber: '', heatNumber: '', remarks: '' });
    setAllocations([emptyAllocation()]);
    setEditId(null);
    setTab('form');
  };

  const startEdit = (r: BatchCard) => {
    setForm({ ...r });
    setAllocations((r.allocations ?? []).length ? r.allocations!.map((a) => ({ ...a })) : [emptyAllocation()]);
    setEditId(r.id);
    setTab('form');
  };

  const handleEntrySelect = (entryId: string) => {
    const entry = entryOptions.find((e) => String(e.id) === entryId);
    if (entry) {
      set('entryId', Number(entryId));
      set('entryNumber', entry.entryNumber);
      set('jobCardNumber', entry.jobCardNumber ?? '');
      if (!form.itemCode) set('itemCode', entry.partCode ?? '');
      toast(`Entry ${entry.entryNumber} linked.`);
    } else {
      set('entryId', undefined);
      set('entryNumber', '');
      set('jobCardNumber', '');
    }
  };

  const setAllocation = (idx: number, patch: Partial<BatchCardAllocation>) =>
    setAllocations((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));

  const save = async () => {
    const entryId = Number(form.entryId ?? 0);
    if (!entryId) {
      toast('Select a production entry.', 'error');
      return;
    }
    const payload = {
      entryId,
      itemCode: form.itemCode,
      physicalBatchNumber: form.physicalBatchNumber,
      lotNumber: form.lotNumber,
      heatNumber: form.heatNumber,
      quantity: form.quantity,
      remarks: form.remarks,
      allocations,
    };
    setBusy(true);
    try {
      if (editId) {
        await updateBatchCard(editId, payload);
        toast('Batch Card updated.');
      } else {
        await createBatchCard(payload);
        toast('Batch Card created.');
      }
      setForm({}); setAllocations([]); setEditId(null); setTab('list'); load();
    } catch (e) {
      toast(getApiErrorMessage(e, editId ? 'Update failed.' : 'Create failed.'), 'error');
    }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    if (actionBusyId !== null) return;
    setActionBusyId(id);
    try {
      await runBatchCardAction(id, act);
      toast(`Batch Card ${act}.`);
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Action failed.'), 'error');
    }
    setActionBusyId(null);
  };

  const doReversal = async (note: string) => {
    if (!reversalTarget) return;
    setBusy(true);
    try {
      await runBatchCardAction(reversalTarget.id, 'reverse', { reversalReason: note || 'Manual reversal' });
      toast('Batch Card reversed.');
      setReversalTarget(null);
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Reversal failed.'), 'error');
    }
    setBusy(false);
  };

  const filtered = rows.filter(
    (r) =>
      !search ||
      (r.docNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.physicalBatchNumber ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const csvColumns = [
    { key: 'docNumber', label: 'Doc No' },
    { key: 'entryNumber', label: 'Entry' },
    { key: 'itemCode', label: 'Item' },
    { key: 'physicalBatchNumber', label: 'Batch' },
    { key: 'quantity', label: 'Qty' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <>
      <div className="pg-head"><h1>Batch Cards</h1><p>Manual allocation of production output to physical batch runs (CLAR-PROD-011)</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} Batch Card</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Production Entry *</span>
              <select className="in" value={String(form.entryId ?? '')} onChange={(e) => handleEntrySelect(e.target.value)}>
                <option value="">Select entry...</option>
                {entryOptions.map((e) => (
                  <option key={e.id} value={e.id}>{e.entryNumber} | {e.partCode}</option>
                ))}
              </select>
            </label>
            <label className="fld"><span>Item Code *</span><input className="in" value={String(form.itemCode ?? '')} onChange={(e) => set('itemCode', e.target.value)} /></label>
            <label className="fld"><span>Physical Batch No *</span><input className="in" value={String(form.physicalBatchNumber ?? '')} onChange={(e) => set('physicalBatchNumber', e.target.value)} /></label>
            <label className="fld"><span>Lot No</span><input className="in" value={String(form.lotNumber ?? '')} onChange={(e) => set('lotNumber', e.target.value)} /></label>
            <label className="fld"><span>Heat No</span><input className="in" value={String(form.heatNumber ?? '')} onChange={(e) => set('heatNumber', e.target.value)} /></label>
            <label className="fld"><span>Quantity *</span><input className="in" type="number" min="0" step="any" value={String(form.quantity ?? '')} onChange={(e) => set('quantity', Number(e.target.value))} /></label>
            <label className="fld"><span>Remarks</span><input className="in" value={String(form.remarks ?? '')} onChange={(e) => set('remarks', e.target.value)} /></label>
          </div>

          <div className="panel-h" style={{ marginTop: 16 }}><h2>Allocations</h2></div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Batch Number *</th>
                  <th>Lot No</th>
                  <th>Heat No</th>
                  <th>Qty *</th>
                  <th>Location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a, i) => (
                  <tr key={a.lineNo}>
                    <td>{i + 1}</td>
                    <td><input className="in" value={a.batchNumber} onChange={(e) => setAllocation(i, { batchNumber: e.target.value })} /></td>
                    <td><input className="in" value={a.lotNumber ?? ''} onChange={(e) => setAllocation(i, { lotNumber: e.target.value })} /></td>
                    <td><input className="in" value={a.heatNumber ?? ''} onChange={(e) => setAllocation(i, { heatNumber: e.target.value })} /></td>
                    <td><input className="in" type="number" min="0" step="any" value={String(a.quantity ?? '')} onChange={(e) => setAllocation(i, { quantity: Number(e.target.value) })} /></td>
                    <td><input className="in" value={a.location ?? 'STORE'} onChange={(e) => setAllocation(i, { location: e.target.value })} /></td>
                    <td>
                      <button className="ibtn danger" title="Remove line" disabled={allocations.length <= 1} onClick={() => setAllocations((prev) => prev.filter((_, x) => x !== i))}>
                        <span className="material-symbols-rounded">remove_circle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actbar">
            <div className="lft">
              <button className="btn btn-sm" onClick={() => setAllocations((prev) => [...prev, emptyAllocation()])}><span className="material-symbols-rounded">add</span> Add Allocation</button>
            </div>
            <div className="rgt">
              <button className="btn btn-sm" onClick={backToList} disabled={busy}><span className="material-symbols-rounded">arrow_back</span> Back</button>
              {editId && <button className="btn btn-sm" onClick={() => { setForm({}); setAllocations([]); setEditId(null); setTab('list'); }} disabled={busy}>Cancel</button>}
              <button className="btn btn-sm btn-p" onClick={save} disabled={busy || !can('production', 'Edit')}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar">
            <input className="in" placeholder="Search by doc no or batch..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="ibtn" title="Export CSV" onClick={() => exportToCsv(filtered as unknown as Record<string, unknown>[], csvColumns, screenId)}>
              <span className="material-symbols-rounded">download</span>
            </button>
            <button className="btn btn-p" onClick={startNew} disabled={!can('production', 'Edit')}>+ New Batch Card</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Doc No</th><th>Entry</th><th>Item</th><th>Batch</th><th>Qty</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No batch cards.</div></td></tr>
                  ) : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.docNumber}</b>{r.isReversal && <span className="pill" style={{ marginLeft: 6, color: '#e11d48', background: '#ffe4e6', padding: '1px 6px', borderRadius: 10, fontSize: 11 }}>REVERSAL</span>}</td>
                      <td>{r.entryNumber ?? '-'}</td>
                      <td>{r.itemCode ?? '-'}</td>
                      <td>{r.physicalBatchNumber ?? '-'}</td>
                      <td>{r.quantity ?? 0}</td>
                      <td><StatusBadge status={r.status} variant={STATUS_STYLE} /></td>
                      <td>
                        {r.status === 'OPEN' && can('production', 'Approve') && <button className="ibtn" title="Hold" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'hold')}><span className="material-symbols-rounded">pause_circle</span></button>}
                        {r.status === 'HELD' && can('production', 'Approve') && <button className="ibtn" title="Reopen" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'reopen')}><span className="material-symbols-rounded">play_circle</span></button>}
                        {(r.status === 'OPEN' || r.status === 'HELD') && can('production', 'Approve') && <button className="ibtn" title="Close" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'close')}><span className="material-symbols-rounded">check_circle</span></button>}
                        {r.status === 'OPEN' && can('production', 'Edit') && <button className="ibtn" title="Edit" onClick={() => startEdit(r)}><span className="material-symbols-rounded">edit</span></button>}
                        {r.status === 'CLOSED' && !r.isReversal && can('production', 'Cancel') && <button className="ibtn" title="Reverse" disabled={actionBusyId === r.id} onClick={() => setReversalTarget(r)}><span className="material-symbols-rounded">undo</span></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(reversalTarget)}
        title={`Reverse ${reversalTarget?.docNumber ?? ''}`}
        body="Create a reversal mirror Batch Card with negated quantities?"
        okLabel="Reverse"
        busy={busy}
        onClose={() => setReversalTarget(null)}
        onConfirm={doReversal}
      />
    </>
  );
}

export default BatchCardScreen;