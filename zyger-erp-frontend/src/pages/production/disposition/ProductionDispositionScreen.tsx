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
  DISPOSITION_FAMILIES,
  listDispositionDocs,
  createDispositionDoc,
  updateDispositionDoc,
  runDispositionAction,
} from '../../../services/productionDispositionApi';
import type {
  DispositionKind,
  DispositionDoc,
  DispositionLine,
  EntryOption,
} from '../../../services/productionDispositionApi';

interface Props {
  kind: DispositionKind;
  screenId: string;
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  DRAFT: { color: '#888', bg: '#e9ecef' },
  SUBMITTED: { color: '#6f42c1', bg: '#e8daef' },
  APPROVED: { color: '#2563eb', bg: '#dbeafe' },
  POSTED: { color: '#22c55e', bg: '#d4edda' },
  CLOSED: { color: '#0b7285', bg: '#c5f6fa' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
  REVERSED: { color: '#e11d48', bg: '#ffe4e6' },
};

const DISPOSITION_OPTIONS: Record<string, string[]> = {
  REJECTION: ['REWORKABLE', 'SCRAP', 'HOLD_MRB'],
  SCRAP: ['SCRAP', 'HOLD_MRB'],
  REWORK: [],
};

const TITLES: Record<string, { title: string; subtitle: string }> = {
  REJECTION: { title: 'Rejection Records', subtitle: 'Classify rejected quantities reported on a production entry' },
  SCRAP: { title: 'Scrap Records', subtitle: 'Classify scrap quantities reported on a production entry' },
  REWORK: { title: 'Rework Records', subtitle: 'Record rework operations required for rejected quantities' },
};

let rowSeq = 0;

function emptyLine(): DispositionLine {
  rowSeq += 1;
  return { lineNo: rowSeq, itemCode: '', quantity: 0, uom: '', reasonCode: '', reasonDescription: '', location: 'STORE' };
}

function DispositionRecords({ kind, screenId }: Props) {
  const { toast } = useToast();
  const { can } = useAuth();
  const { closeTab } = useTabs();
  const family = DISPOSITION_FAMILIES[kind];
  const { title, subtitle } = TITLES[kind];

  const [rows, setRows] = useState<DispositionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<DispositionLine[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [tab, setTab] = useState<'list' | 'form'>('list');
  const [entryOptions, setEntryOptions] = useState<EntryOption[]>([]);
  const [reversalTarget, setReversalTarget] = useState<DispositionDoc | null>(null);

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
      setRows(await listDispositionDocs(family.basePath));
    } catch (e) {
      toast(getApiErrorMessage(e, 'Load failed.'), 'error');
    }
    setLoading(false);
  }, [family.basePath, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    if (!editId) fetchEntries();
    setForm({ inspectionDate: new Date().toISOString().slice(0, 10), inspector: '', entryId: undefined, remarks: '' });
    setLines([emptyLine()]);
    setEditId(null);
    setTab('form');
  };

  const startEdit = (r: DispositionDoc) => {
    const f = (r as unknown as Record<string, unknown>);
    setForm({ ...f, inspectionDate: String(r.inspectionDate ?? '').slice(0, 10) });
    setLines((r.lines ?? []).length ? r.lines!.map((l) => ({ ...l })) : [emptyLine()]);
    setEditId(r.id);
    setTab('form');
  };

  const handleEntrySelect = (entryId: string) => {
    const entry = entryOptions.find((e) => String(e.id) === entryId);
    if (entry) {
      set('entryId', Number(entryId));
      set('entryNumber', entry.entryNumber);
      set('workOrderNumber', entry.workOrderNumber ?? '');
      set('jobCardNumber', entry.jobCardNumber ?? '');
      toast(`Entry ${entry.entryNumber} linked.`);
    } else {
      set('entryId', undefined);
      set('entryNumber', '');
      set('workOrderNumber', '');
      set('jobCardNumber', '');
    }
  };

  const setLine = (idx: number, patch: Partial<DispositionLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const save = async () => {
    const entryId = Number(form.entryId ?? 0);
    if (!entryId) {
      toast('Select a production entry.', 'error');
      return;
    }
    if (editId) {
      setForm((c) => ({ ...c, lines }));
      setBusy(true);
      try {
        await updateDispositionDoc(family.basePath, editId, { entryId, inspectionDate: form.inspectionDate, inspector: form.inspector, lines, remarks: form.remarks });
        toast(`${title} updated.`);
        setForm({}); setLines([]); setEditId(null); setTab('list'); load();
      } catch (e) {
        toast(getApiErrorMessage(e, 'Update failed.'), 'error');
      }
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      await createDispositionDoc(family.basePath, { entryId, inspectionDate: form.inspectionDate, inspector: form.inspector, lines, remarks: form.remarks });
      toast(`${title} created.`);
      setForm({}); setLines([]); setTab('list'); load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Create failed.'), 'error');
    }
    setBusy(false);
  };

  const action = async (id: number, act: string) => {
    if (actionBusyId !== null) return;
    setActionBusyId(id);
    try {
      await runDispositionAction(family.basePath, id, act);
      toast(`${title} ${act}.`);
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
      await runDispositionAction(family.basePath, reversalTarget.id, 'reverse', { reversalReason: note || 'Manual reversal' });
      toast(`${title} reversed.`);
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
      (r.lines ?? []).some((l) => (l.itemCode ?? '').toLowerCase().includes(search.toLowerCase())),
  );

  const csvColumns = [
    { key: 'docNumber', label: 'Doc No' },
    { key: 'inspectionDate', label: 'Date' },
    { key: 'entryNumber', label: 'Entry' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <>
      <div className="pg-head"><h1>{title}</h1><p>{subtitle}</p></div>

      {tab === 'form' && (
        <div className="panel">
          <div className="panel-h"><h2>{editId ? 'Edit' : 'New'} {title}</h2></div>
          <div className="fgrid">
            <label className="fld"><span>Production Entry *</span>
              <select className="in" value={editId ? String(form.entryId ?? '') : String(form.entryId ?? '')} onChange={(e) => handleEntrySelect(e.target.value)}>
                <option value="">Select entry...</option>
                {entryOptions.map((e) => (
                  <option key={e.id} value={e.id}>{e.entryNumber} | {e.partCode}</option>
                ))}
              </select>
            </label>
            <label className="fld"><span>Work Order</span><input className="in" value={String(form.workOrderNumber ?? '')} readOnly /></label>
            <label className="fld"><span>Job Card</span><input className="in" value={String(form.jobCardNumber ?? '')} readOnly /></label>
            <label className="fld"><span>Inspection Date</span><input className="in" type="date" value={String(form.inspectionDate ?? '').slice(0, 10)} onChange={(e) => set('inspectionDate', e.target.value)} /></label>
            <label className="fld"><span>Inspector</span><input className="in" value={String(form.inspector ?? '')} onChange={(e) => set('inspector', e.target.value)} /></label>
          </div>

          <div className="panel-h" style={{ marginTop: 16 }}><h2>Lines</h2></div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Code *</th>
                  <th>Qty *</th>
                  <th>UOM</th>
                  <th>Reason Code</th>
                  <th>Reason Description</th>
                  {kind === 'REWORK' ? <th>Target Operation *</th> : <th>Disposition *</th>}
                  {kind === 'SCRAP' && <th>Warehouse</th>}
                  <th>Batch No</th>
                  <th>Location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.lineNo}>
                    <td>{i + 1}</td>
                    <td><input className="in" value={l.itemCode} onChange={(e) => setLine(i, { itemCode: e.target.value })} /></td>
                    <td><input className="in" type="number" min="0" step="any" value={String(l.quantity ?? '')} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} /></td>
                    <td><input className="in" value={l.uom ?? ''} onChange={(e) => setLine(i, { uom: e.target.value })} /></td>
                    <td><input className="in" value={l.reasonCode ?? ''} onChange={(e) => setLine(i, { reasonCode: e.target.value })} /></td>
                    <td><input className="in" value={l.reasonDescription ?? ''} onChange={(e) => setLine(i, { reasonDescription: e.target.value })} /></td>
                    {kind !== 'REWORK' && (
                      <td>
                        <select className="in" value={String(l.disposition ?? '')} onChange={(e) => setLine(i, { disposition: e.target.value })}>
                          <option value="">Select...</option>
                          {(DISPOSITION_OPTIONS[kind] ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                    )}
                    {kind === 'REWORK' && <td><input className="in" value={l.targetOperationCode ?? ''} onChange={(e) => setLine(i, { targetOperationCode: e.target.value })} /></td>}
                    {kind === 'SCRAP' && <td><input className="in" value={l.warehouse ?? 'STORE'} onChange={(e) => setLine(i, { warehouse: e.target.value })} /></td>}
                    <td><input className="in" value={l.batchNumber ?? ''} onChange={(e) => setLine(i, { batchNumber: e.target.value })} /></td>
                    <td><input className="in" value={l.location ?? 'STORE'} onChange={(e) => setLine(i, { location: e.target.value })} /></td>
                    <td>
                      <button className="ibtn danger" title="Remove line" disabled={lines.length <= 1} onClick={() => setLines((prev) => prev.filter((_, x) => x !== i))}>
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
              <button className="btn btn-sm" onClick={() => setLines((prev) => [...prev, emptyLine()])}><span className="material-symbols-rounded">add</span> Add Line</button>
            </div>
            <div className="rgt">
              <button className="btn btn-sm" onClick={backToList} disabled={busy}><span className="material-symbols-rounded">arrow_back</span> Back</button>
              {editId && <button className="btn btn-sm" onClick={() => { setForm({}); setLines([]); setEditId(null); setTab('list'); }} disabled={busy}>Cancel</button>}
              <button className="btn btn-sm btn-p" onClick={save} disabled={busy || !can('production', 'Edit')}>{editId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'list' && (
        <div className="panel">
          <div className="toolbar">
            <input className="in" placeholder="Search by doc no or item..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="ibtn" title="Export CSV" onClick={() => exportToCsv(filtered as unknown as Record<string, unknown>[], csvColumns, screenId)}>
              <span className="material-symbols-rounded">download</span>
            </button>
            <button className="btn btn-p" onClick={startNew} disabled={!can('production', 'Edit')}>+ New {title}</button>
          </div>
          <div className="twrap">
            {loading ? <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div> : (
              <table className="tbl">
                <thead><tr><th>Doc No</th><th>Date</th><th>Entry</th><th>Item</th><th>Qty</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty"><span className="material-symbols-rounded">description</span> No documents.</div></td></tr>
                  ) : filtered.map((r) => {
                    const firstLine = (r.lines ?? [])[0];
                    const qty = (r.lines ?? []).reduce((s, l) => s + Number(l.quantity ?? 0), 0);
                    return (
                      <tr key={r.id}>
                        <td><b>{r.docNumber}</b>{r.isReversal && <span className="pill" style={{ marginLeft: 6, color: '#e11d48', background: '#ffe4e6', padding: '1px 6px', borderRadius: 10, fontSize: 11 }}>REVERSAL</span>}</td>
                        <td>{r.inspectionDate ?? '-'}</td>
                        <td>{r.entryNumber ?? '-'}</td>
                        <td>{firstLine?.itemCode ?? '-'}</td>
                        <td>{qty}</td>
                        <td><StatusBadge status={r.status} variant={STATUS_STYLE} /></td>
                        <td>
                          {r.status === 'DRAFT' && can('production', 'Approve') && <button className="ibtn" title="Submit" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'submit')}><span className="material-symbols-rounded">send</span></button>}
                          {r.status === 'SUBMITTED' && can('production', 'Approve') && <button className="ibtn" title="Approve" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'approve')}><span className="material-symbols-rounded">how_to_reg</span></button>}
                          {(r.status === 'APPROVED' || r.status === 'DRAFT' || r.status === 'SUBMITTED') && can('production', 'Approve') && <button className="ibtn" title="Post" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'post')}><span className="material-symbols-rounded">check_circle</span></button>}
                          {r.status === 'DRAFT' && can('production', 'Edit') && <button className="ibtn" title="Edit" onClick={() => startEdit(r)}><span className="material-symbols-rounded">edit</span></button>}
                          {r.status === 'POSTED' && can('production', 'Cancel') && <button className="ibtn" title="Reverse" disabled={actionBusyId === r.id} onClick={() => setReversalTarget(r)}><span className="material-symbols-rounded">undo</span></button>}
                          {r.status === 'POSTED' && can('production', 'Approve') && <button className="ibtn" title="Close" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'close')}><span className="material-symbols-rounded">lock</span></button>}
                          {(r.status === 'DRAFT' || r.status === 'SUBMITTED' || r.status === 'APPROVED') && can('production', 'Cancel') && <button className="ibtn danger" title="Cancel" disabled={actionBusyId === r.id} onClick={() => action(r.id, 'cancel')}><span className="material-symbols-rounded">block</span></button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(reversalTarget)}
        title={`Reverse ${reversalTarget?.docNumber ?? ''}`}
        body="Create a reversal mirror document with negated quantities?"
        okLabel="Reverse"
        busy={busy}
        onClose={() => setReversalTarget(null)}
        onConfirm={doReversal}
      />
    </>
  );
}

export function ProductionRejectionsScreen() {
  return <DispositionRecords kind="REJECTION" screenId="production-rejections" />;
}

export function ProductionScrapsScreen() {
  return <DispositionRecords kind="SCRAP" screenId="production-scraps" />;
}

export function ProductionReworksScreen() {
  return <DispositionRecords kind="REWORK" screenId="production-reworks" />;
}