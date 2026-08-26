import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  usePlanningDoc,
  usePlanningDocAction,
  usePlanningDocCreate,
  usePlanningDocDelete,
  usePlanningDocList,
  usePlanningDocNextNumber,
  usePlanningDocUpdate,
} from '../../../hooks/usePlanningDocs';
import { WORK_ORDER_CONFIG, WORK_ORDER_MATERIAL_FIELDS } from '../planningDocConfigs';
import type { MaterialLineDef } from '../planningDocConfigs';
import { formatDate, formatNumber, toOptionalNumber } from '../../../utils/format';
import { getApiErrorMessage } from '../../../utils/apiError';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTabs } from '../../../contexts/TabsContext';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import AuditHistoryDrawer from '../../../components/common/AuditHistoryDrawer';
import { auditEntityTypeFor } from '../../../utils/auditEntity';
import apiClient from '../../../api/axiosClient';
import { exportToCsv } from '../../../utils/csvExport';
import { useFormKeyboard } from '../../../hooks/useFormKeyboard';
import { useUnsavedWarning } from '../../../hooks/useUnsavedWarning';
import { useFormValidation } from '../../../hooks/useFormValidation';

const PAGE_SIZE = 8;
const config = WORK_ORDER_CONFIG;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#3b82f6',
  APPROVED: '#0ea5e9',
  RELEASED: '#2563eb',
  IN_PROCESS: '#f59e0b',
  COMPLETED: '#10b981',
  CLOSED: '#059669',
  CANCELLED: '#ef4444',
  ON_HOLD: '#eab308',
  REJECTED: '#dc2626',
};

const sectionLabels: Record<string, string> = {
  overview: 'Overview',
  source: 'Source & Customer',
  bomRoute: 'BOM & Route Links',
  schedule: 'Schedule',
  quantities: 'Quantities',
  reasons: 'Reasons & Remarks',
};
const sectionIcons: Record<string, string> = {
  overview: 'info',
  source: 'person',
  bomRoute: 'account_tree',
  schedule: 'calendar_month',
  quantities: 'pin',
  reasons: 'edit_note',
};
const sectionFieldMap: Record<string, string[]> = {
  overview: ['woNo', 'woType', 'priority', 'itemCode', 'itemDescription', 'itemRevision', 'drawingNumber', 'drawingRev', 'uom', 'plant', 'productionLine', 'productionDepartment', 'batchLotNo'],
  source: ['sourceType', 'sourceDocNo', 'salesOrderId', 'salesOrderNo', 'soLineId', 'customerCode', 'customerOrderNo'],
  bomRoute: ['bomId', 'bomRevision', 'routeId', 'routeRevision'],
  schedule: ['dueDate', 'plannedStartDate', 'plannedEndDate', 'promisedDeliveryDate', 'actualStartDate', 'actualEndDate', 'approvedBy', 'releasedBy', 'startedBy', 'completedBy', 'closedBy'],
  quantities: ['orderQuantity', 'productionQty', 'releasedQty', 'completedQty', 'rejectedQty', 'scrapQty', 'balanceQty', 'pendingQty', 'fgReceiptQty', 'scrapAllowancePercent'],
  reasons: ['cancelReason', 'holdReason', 'shortCloseReason', 'remarks'],
};

type ActionModal = { action: string; danger: boolean; title?: string };

export default function WorkOrderScreen({ initialDocId, viewOnly = false }: { initialDocId?: string | number; viewOnly?: boolean }) {
  const { toast } = useToast();
  const { can } = useAuth();
  const { openTab } = useTabs();
  const [mode, setMode] = useState<'list' | 'form'>(initialDocId ? 'form' : 'list');
  const [documentId, setDocumentId] = useState<string | null>(initialDocId ? String(initialDocId) : null);
  const [isViewOnly, setIsViewOnly] = useState(viewOnly);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [ops, setOps] = useState<Array<Record<string, unknown>>>([]);
  const [mats, setMats] = useState<Array<Record<string, unknown>>>([]);
  const [initializedForId, setInitializedForId] = useState('');
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [statusHistoryOpen, setStatusHistoryOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<Array<Record<string, unknown>>>([]);
  const [activeTab, setActiveTab] = useState<'operations' | 'materials' | 'quantity' | 'history'>('operations');
  const [populating, setPopulating] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    overview: false,
    source: false,
    bomRoute: true,
    schedule: true,
    quantities: true,
    reasons: true,
  });
  const [bomList, setBomList] = useState<Array<{ id: number; bomNumber: string; itemCode: string }>>([]);
  const [routeList, setRouteList] = useState<Array<{ id: number; routeNumber: string; itemCode: string }>>([]);
  const [machines, setMachines] = useState<Array<{ code: string; name: string }>>([]);
  const [workCenters, setWorkCenters] = useState<Array<{ code: string; name: string }>>([]);
  const [operators, setOperators] = useState<Array<{ username: string; fullName: string }>>([]);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);

  const fetchPickers = useCallback(async () => {
    try {
      const [bRes, rRes, mRes, wRes, oRes, iRes] = await Promise.allSettled([
        apiClient.get('/v1/planning/bom', { params: { size: 500 } }),
        apiClient.get('/v1/planning/route-sheet', { params: { size: 500 } }),
        apiClient.get('/master/machines', { params: { size: 200 } }),
        apiClient.get('/master/work-centers', { params: { size: 200 } }),
        apiClient.get('/master/users', { params: { size: 200 } }),
        apiClient.get('/master/items', { params: { size: 500 } }),
      ]);
      if (bRes.status === 'fulfilled') setBomList((bRes.value.data?.content ?? bRes.value.data ?? []).map((b: any) => ({ id: b.id, bomNumber: b.bomNumber || b.docNo || `BOM-${b.id}`, itemCode: b.itemCode ?? '' })));
      if (rRes.status === 'fulfilled') setRouteList((rRes.value.data?.content ?? rRes.value.data ?? []).map((r: any) => ({ id: r.id, routeNumber: r.routeNumber || r.docNo || `RT-${r.id}`, itemCode: r.itemCode ?? '' })));
      if (mRes.status === 'fulfilled') setMachines((mRes.value.data?.content ?? mRes.value.data ?? []).filter((m: any) => m.active !== false).map((m: any) => ({ code: m.machineCode ?? m.code ?? '', name: m.description ?? m.name ?? '' })));
      if (wRes.status === 'fulfilled') setWorkCenters((wRes.value.data?.content ?? wRes.value.data ?? []).filter((w: any) => w.active !== false).map((w: any) => ({ code: w.code ?? '', name: w.name ?? '' })));
      if (oRes.status === 'fulfilled') setOperators((oRes.value.data?.content ?? oRes.value.data ?? []).filter((u: any) => u.active !== false).map((u: any) => ({ username: (u.username ?? ''), fullName: (u.fullName || u.username) ?? '' })));
      if (iRes.status === 'fulfilled') {
        const data = iRes.value.data as { content?: unknown[] } | unknown[];
        setItems(Array.isArray(data) ? data as Array<Record<string, unknown>> : (data?.content ?? []) as Array<Record<string, unknown>>);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (mode === 'form') fetchPickers(); }, [mode, fetchPickers]);

  const listQuery = usePlanningDocList(config.docType, { page, size: PAGE_SIZE, sort: 'date,desc', search: search || undefined, status: status || undefined });
  const nextNumberQuery = usePlanningDocNextNumber(config.docType);
  const documentQuery = usePlanningDoc(config.docType, mode === 'form' && documentId ? documentId : null);
  const createMutation = usePlanningDocCreate(config.docType);
  const updateMutation = usePlanningDocUpdate(config.docType);
  const deleteMutation = usePlanningDocDelete(config.docType);
  const actionMutation = usePlanningDocAction(config.docType);

  useEffect(() => { const t = setTimeout(() => setSearch(searchInput.trim()), 300); return () => clearTimeout(t); }, [searchInput]);
  useEffect(() => { setPage(0); }, [search, status, priority]);
  useEffect(() => { if (initialDocId) { setDocumentId(String(initialDocId)); setIsViewOnly(viewOnly); setMode('form'); } }, [initialDocId, viewOnly]);

  useEffect(() => {
    const doc = documentQuery.data;
    if (!doc || !documentId) return;
    const key = String(documentId);
    if (initializedForId === key) return;
    setInitializedForId(key);
    setForm({ ...doc });
    setOps(Array.isArray(doc.lines) ? (doc.lines as Array<Record<string, unknown>>).map((l) => ({ ...l })) : []);
    setMats(Array.isArray(doc.materialLines) ? (doc.materialLines as Array<Record<string, unknown>>).map((l) => ({ ...l })) : []);
  }, [documentQuery.data, documentId, initializedForId]);

  const doc = documentQuery.data;
  const genericStatus = String(doc?.status ?? 'DRAFT');
  const editable = !isViewOnly && (!documentId || ['DRAFT', 'REJECTED'].includes(genericStatus));
  const isBusy = createMutation.isPending || updateMutation.isPending || actionMutation.isPending || deleteMutation.isPending;
  const rows = listQuery.data?.content ?? [];
  const totalElements = listQuery.data?.totalElements ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;

  const openForm = (id: string | null, view: boolean) => {
    setDocumentId(id); setInitializedForId(''); setIsViewOnly(view); setForm({}); setOps([]); setMats([]); setActiveTab('operations'); setMode('form');
  };
  const backToList = () => { setDocumentId(null); setInitializedForId(''); setIsViewOnly(false); setMode('list'); };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = form[field.key];
      if (field.type === 'number') payload[field.key] = toOptionalNumber(raw == null ? '' : String(raw));
      else if (field.type === 'checkbox') payload[field.key] = Boolean(raw);
      else payload[field.key] = raw == null ? null : String(raw);
    }
    payload.lines = ops.filter((l) => String(l.operationSequence ?? '').trim() !== '').map((l) => { const out = { ...l }; delete out.id; delete out.qty; return out; });
    payload.materialLines = mats.filter((l) => String(l.componentItemCode ?? '').trim() !== '').map((l) => { const out = { ...l }; delete out.id; delete out.qty; return out; });
    return payload;
  };

  const validate = () => {
    const errs = validateFields(config.fields, form);
    if (errs.length > 0) toast(errs[0].message, 'error');
    return errs.length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    try {
      const created = await createMutation.mutateAsync(buildPayload());
      toast(`Work Order ${created.woNumber ?? created.docNo ?? ''} created as draft.`);
      setDocumentId(String(created.id ?? '')); setInitializedForId('');
    } catch (e) { toast(getApiErrorMessage(e, 'Create failed.'), 'error'); }
  };

  const handleSave = async () => {
    if (!documentId) return;
    try {
      const updated = await updateMutation.mutateAsync({ id: documentId, payload: buildPayload() });
      setForm({ ...updated }); toast(`${updated.woNumber ?? updated.docNo ?? ''} saved.`);
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
  };

  const runAction = async (action: string, note?: string) => {
    if (!documentId) return;
    try {
      const updated = await actionMutation.mutateAsync({ id: documentId, action, note });
      setForm({ ...updated }); setActionModal(null);
      toast(`${updated.woNumber ?? updated.docNo ?? ''} \u2022 ${action} completed.`);
    } catch (e) { toast(getApiErrorMessage(e, `${action} failed.`), 'error'); }
  };

  const handlePopulate = async () => {
    if (!documentId) return;
    setPopulating(true);
    try {
      const res = await apiClient.post(`/v1/planning/work-order/${documentId}/populate`);
      const updated = res.data;
      setForm({ ...updated });
      setOps(Array.isArray(updated.lines) ? (updated.lines as Array<Record<string, unknown>>).map((l) => ({ ...l })) : []);
      setMats(Array.isArray(updated.materialLines) ? (updated.materialLines as Array<Record<string, unknown>>).map((l) => ({ ...l })) : []);
      toast('Populated from BOM and Route.');
    } catch (e) { toast(getApiErrorMessage(e, 'Populate failed.'), 'error'); }
    setPopulating(false);
  };

  const handlePrint = async () => {
    if (!documentId) return;
    try {
      const res = await apiClient.get(`/v1/planning/work-order/${documentId}/print`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `WO-${form.woNumber ?? form.docNo ?? documentId}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      toast('PDF downloaded.');
    } catch (e) { toast(getApiErrorMessage(e, 'Print failed.'), 'error'); }
  };

  const fetchStatusHistory = async () => {
    if (!documentId) return;
    try {
      const res = await apiClient.get(`/v1/planning/work-order/${documentId}/status-history`);
      setStatusHistory(Array.isArray(res.data) ? res.data : []);
      setStatusHistoryOpen(true);
    } catch (e) { toast('Failed to load status history.', 'error'); }
  };

  const fetchSummary = useCallback(async () => {
    if (!documentId) return;
    try {
      const res = await apiClient.get(`/v1/planning/work-order/${documentId}/summary`);
      setSummary(res.data);
    } catch { /* ignore */ }
  }, [documentId]);

  useEffect(() => { if (documentId && documentQuery.data) fetchSummary(); }, [documentId, documentQuery.data, fetchSummary]);

  const viewBom = useCallback(() => {
    const bomId = form.bomId;
    if (!bomId) return;
    import('../../../config/screenRegistry').then(({ getScreenComponent }) => {
      const Comp = getScreenComponent('bom-master');
      openTab({ id: `bom-master-${bomId}`, label: 'BOM', icon: 'account_tree', component: Comp, props: { initialDocId: bomId, viewOnly: true } });
    });
  }, [form.bomId, openTab]);

  const viewRoute = useCallback(() => {
    const routeId = form.routeId;
    if (!routeId) return;
    import('../../../config/screenRegistry').then(({ getScreenComponent }) => {
      const Comp = getScreenComponent('route-sheet');
      openTab({ id: `route-sheet-${routeId}`, label: 'Route Sheet', icon: 'route', component: Comp, props: { initialDocId: routeId, viewOnly: true } });
    });
  }, [form.routeId, openTab]);

  const cellValue = (row: Record<string, unknown>, field: string): string => {
    const raw = row[field]; if (raw == null) return '\u2014';
    if (typeof raw === 'number') return formatNumber(raw);
    const s = String(raw); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return formatDate(s.slice(0, 10)); return s;
  };

  const isOverdue = (row: Record<string, unknown>): boolean => {
    const pe = row.plannedEndDate;
    const st = String(row.status ?? '');
    if (!pe || ['COMPLETED', 'CLOSED', 'CANCELLED'].includes(st)) return false;
    try { return new Date(String(pe)) < new Date(); } catch { return false; }
  };

  const isHighPriority = (row: Record<string, unknown>): boolean => {
    const p = String(row.priority ?? '').toUpperCase();
    return p === 'HIGH' || p === 'URGENT' || p === 'CRITICAL';
  };

  const dynamicLineOptions: Record<string, string[]> = {
    machineCode: machines.map((m) => m.code),
    workCenterCode: workCenters.map((w) => w.code),
    operator: operators.map((o) => o.username),
  };

  /** FRS §3.2: Recalculate material required_qty when production_qty changes in Draft */
  const handleProductionQtyChange = (val: string) => {
    const numVal = toOptionalNumber(val);
    setForm((c) => {
      const prev = toOptionalNumber(String(c.productionQty ?? ''));
      const baseQty = toOptionalNumber(String(c.orderQuantity ?? ''));
      // Recompute material lines ratio
      if (prev && prev > 0 && mats.length > 0 && baseQty && baseQty > 0) {
        setMats((m) => m.map((line) => {
          const origReq = toOptionalNumber(String(line.requiredQuantity ?? ''));
          if (!origReq || origReq <= 0) return line;
          const ratio = origReq / prev;
          return { ...line, requiredQuantity: ratio * (numVal || 0) };
        }));
      }
      return { ...c, productionQty: val };
    });
  };

  const renderLineTable = (lineFields: MaterialLineDef[], data: Array<Record<string, unknown>>, setData: React.Dispatch<React.SetStateAction<Array<Record<string, unknown>>>>, editableLines: boolean) => (
    <div className="twrap">
      <table className="tbl lines">
        <thead><tr>{lineFields.map((f) => <th key={f.key}>{f.label}</th>)}{editableLines && <th></th>}</tr></thead>
        <tbody>
          {data.map((line, idx) => (
            <tr key={idx}>
              {lineFields.map((f) => {
                const isDynamic = f.key in dynamicLineOptions;
                const isSelect = f.type === 'select' || isDynamic;
                const options = isDynamic ? dynamicLineOptions[f.key] : (f.options ?? []);
                return (
                  <td key={f.key}>
                    {isSelect ? (
                      <select className="in" value={String(line[f.key] ?? '')} disabled={!editableLines} onChange={(e) => setData((c) => c.map((l, i) => (i === idx ? { ...l, [f.key]: e.target.value } : l)))}>
                        <option value="">\u2014</option>
                        {options.map((o) => {
                          if (isDynamic) {
                            const label = f.key === 'operator' ? operators.find((op) => op.username === o)?.fullName || o : f.key === 'machineCode' ? machines.find((m) => m.code === o)?.name || o : workCenters.find((w) => w.code === o)?.name || o;
                            return <option key={o} value={o}>{o} &mdash; {label}</option>;
                          }
                          return <option key={o} value={o}>{o}</option>;
                        })}
                        {isDynamic && Boolean(line[f.key]) && !options.includes(String(line[f.key])) && <option value={String(line[f.key])}>{String(line[f.key])}</option>}
                      </select>
                    ) : (
                      <input className="in" type={f.type ?? 'text'} readOnly={f.readonly || !editableLines} value={String(line[f.key] ?? '')} onChange={(e) => setData((c) => c.map((l, i) => (i === idx ? { ...l, [f.key]: e.target.value } : l)))} />
                    )}
                  </td>
                );
              })}
              {editableLines && <td><button type="button" className="ibtn danger" disabled={isBusy} onClick={() => setData((c) => c.filter((_, i) => i !== idx))}><span className="material-symbols-rounded">delete</span></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const isDirty = JSON.stringify(form) !== JSON.stringify(documentQuery.data ?? {}) || ops.length > 0 || mats.length > 0;
  const { validate: validateFields, hasError: isFieldError } = useFormValidation();
  useUnsavedWarning(isDirty && !!documentId);
  useFormKeyboard({
    enabled: mode === 'form',
    onSave: editable ? handleSave : undefined,
    onSubmit: !documentId ? handleCreate : undefined,
    onBack: backToList,
  });

  const filteredRows = useMemo(() => {
    if (!priority) return rows;
    return rows.filter((r: Record<string, unknown>) => String(r.priority ?? '').toUpperCase() === priority);
  }, [rows, priority]);

  const listBody = useMemo(() => {
    if (listQuery.isPending) return <div className="panel"><div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading Work Orders...</div></div>;
    if (listQuery.isError) return <div className="panel"><div className="empty"><span className="material-symbols-rounded">error</span>{getApiErrorMessage(listQuery.error, 'Load failed.')}<div style={{ marginTop: '14px' }}><button className="btn" onClick={() => listQuery.refetch()}><span className="material-symbols-rounded">refresh</span> Retry</button></div></div></div>;
    return (
      <div className="panel">
        <div className="toolbar">
          <div className="searchwrap"><span className="material-symbols-rounded">search</span><input className="in" value={searchInput} placeholder="Search WO, SO, Item..." onChange={(e) => setSearchInput(e.target.value)} /></div>
          <button className="ibtn" title="Export CSV" onClick={() => exportToCsv(filteredRows as unknown as Record<string, unknown>[], config.columns.map((c) => ({ key: c.field, label: c.label })), config.docType)}><span className="material-symbols-rounded">download</span></button>
          <span className="count">{formatNumber(totalElements)} record{totalElements === 1 ? '' : 's'}</span>
          <select className="in" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {config.statusOptions.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select className="in" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <div className="sp" />
          <button className="btn btn-p" onClick={() => openForm(null, false)}><span className="material-symbols-rounded">add</span> New Work Order</button>
        </div>
        <div className="twrap">
          <table className="tbl">
            <thead><tr>{config.columns.map((c) => <th key={c.field} className={c.numeric ? 'num' : ''}>{c.label}</th>)}<th>Actions</th></tr></thead>
            <tbody>
              {filteredRows.length > 0 ? filteredRows.map((row: Record<string, unknown>) => {
                const overdue = isOverdue(row);
                const highP = isHighPriority(row);
                const rowStyle: React.CSSProperties = overdue ? { background: '#fef2f2' } : highP ? { background: '#fffbeb' } : {};
                return (
                <tr key={String(row.id)} style={rowStyle}>
                  {config.columns.map((c) => {
                    if (c.field === 'status') return <td key={c.field}><span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#fff', background: STATUS_COLORS[String(row[c.field] ?? 'DRAFT')] ?? '#6b7280' }}>{String(row[c.field] ?? 'DRAFT').replace('_', ' ')}</span></td>;
                    if (c.field === 'priority') {
                      const p = String(row[c.field] ?? '');
                      const pc = p === 'HIGH' || p === 'URGENT' || p === 'CRITICAL' ? '#ef4444' : p === 'LOW' ? '#6b7280' : '#374151';
                      return <td key={c.field} style={{ color: pc, fontWeight: (p === 'HIGH' || p === 'URGENT') ? 600 : 400 }}>{cellValue(row, c.field)}</td>;
                    }
                    return <td key={c.field} className={c.numeric ? 'num' : ''}>{cellValue(row, c.field)}</td>;
                  })}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="ibtn" title="View" onClick={() => openForm(String(row.id), true)}><span className="material-symbols-rounded">visibility</span></button>
                    <button className="ibtn" title="Edit" onClick={() => openForm(String(row.id), false)}><span className="material-symbols-rounded">edit</span></button>
                    <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(row)}><span className="material-symbols-rounded">delete</span></button>
                  </td>
                </tr>
                );
              }) : <tr><td colSpan={config.columns.length + 1}><div className="empty"><span className="material-symbols-rounded">description</span> No work orders found.</div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>Showing {filteredRows.length === 0 ? 0 : page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {formatNumber(totalElements)}</span>
          <div className="pgs">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>\u2039</button>
            {Array.from({ length: totalPages }, (_, i) => i).map((i) => <button key={i} className={i === page ? 'on' : ''} onClick={() => setPage(i)}>{i + 1}</button>)}
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>\u203A</button>
          </div>
        </div>
      </div>
    );
  }, [listQuery.data, listQuery.isPending, listQuery.isError, searchInput, status, priority, page, totalElements, totalPages, filteredRows]);

  if (mode === 'list') {
    return (
      <>
        <div className="pg-head"><h1>Work Orders</h1><p>Production work orders with operation and material tracking</p></div>
        {listBody}
        <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${String(deleteTarget?.woNumber ?? deleteTarget?.docNo ?? '')}`} body="Permanently delete this work order?" okLabel="Delete" danger busy={deleteMutation.isPending} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (!deleteTarget) return; try { await deleteMutation.mutateAsync(String(deleteTarget.id)); toast(`Deleted.`); setDeleteTarget(null); } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); } }} />
      </>
    );
  }

  if (documentId && documentQuery.isPending) return <div className="panel"><div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading Work Order...</div></div>;
  if (documentId && documentQuery.isError) return <div className="panel"><div className="empty"><span className="material-symbols-rounded">error</span>{getApiErrorMessage(documentQuery.error, 'Load failed.')}</div></div>;

  const docNo = documentId ? String(doc?.woNumber ?? doc?.docNo ?? '') : String(nextNumberQuery.data?.nextNumber ?? '\u2014');

  return (
    <>
      <div className="pg-head"><h1>{isViewOnly ? 'View' : documentId ? 'Edit' : 'Add'} Work Order \u2014 {docNo}</h1><p>Production work order with operation and material tracking</p></div>
      <div className="note"><span className="material-symbols-rounded">info</span><span>Workflow: DRAFT {'\u2192'} SUBMITTED {'\u2192'} APPROVED {'\u2192'} RELEASED {'\u2192'} IN_PROCESS {'\u2192'} COMPLETED {'\u2192'} CLOSED</span></div>
      {documentId && !editable && (
        <div style={{ padding: '8px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>lock</span>
          This document is <strong>{genericStatus}</strong> and locked. Only workflow actions are available.
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="panel">
          <div className="panel-h"><h2><span className="material-symbols-rounded">description</span> Header</h2>
            {documentId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* FRS §6.4: Workflow actions in header */}
                {genericStatus === 'DRAFT' && can('planning', 'Edit') && <button type="button" className="btn btn-sm btn-p" onClick={() => setActionModal({ action: 'submit', danger: false })} disabled={isBusy}><span className="material-symbols-rounded">send</span> Submit</button>}
                {genericStatus === 'SUBMITTED' && can('planning', 'Approve') && <button type="button" className="btn btn-sm btn-g" onClick={() => setActionModal({ action: 'approve', danger: false })} disabled={isBusy}><span className="material-symbols-rounded">thumb_up</span> Approve</button>}
                {genericStatus === 'SUBMITTED' && can('planning', 'Reject') && <button type="button" className="btn btn-sm btn-d" onClick={() => setActionModal({ action: 'reject', danger: true })} disabled={isBusy}><span className="material-symbols-rounded">thumb_down</span> Reject</button>}
                {genericStatus === 'APPROVED' && <button type="button" className="btn btn-sm btn-p" onClick={() => setActionModal({ action: 'release', danger: false })} disabled={isBusy}><span className="material-symbols-rounded">rocket_launch</span> Release</button>}
                {genericStatus === 'RELEASED' && <button type="button" className="btn btn-sm btn-p" onClick={() => setActionModal({ action: 'start', danger: false })} disabled={isBusy}><span className="material-symbols-rounded">play_arrow</span> Start</button>}
                {genericStatus === 'RELEASED' && <button type="button" className="btn btn-sm" onClick={() => setActionModal({ action: 'hold', danger: true, title: 'Hold' })} disabled={isBusy}><span className="material-symbols-rounded">pause</span> Hold</button>}
                {genericStatus === 'IN_PROCESS' && <button type="button" className="btn btn-sm btn-p" onClick={() => setActionModal({ action: 'complete', danger: false })} disabled={isBusy}><span className="material-symbols-rounded">check_circle</span> Complete</button>}
                {genericStatus === 'IN_PROCESS' && <button type="button" className="btn btn-sm" onClick={() => setActionModal({ action: 'hold', danger: true, title: 'Hold' })} disabled={isBusy}><span className="material-symbols-rounded">pause</span> Hold</button>}
                {genericStatus === 'ON_HOLD' && <button type="button" className="btn btn-sm btn-p" onClick={() => setActionModal({ action: 'start', danger: false })} disabled={isBusy}><span className="material-symbols-rounded">play_arrow</span> Resume</button>}
                {['RELEASED', 'IN_PROCESS', 'ON_HOLD'].includes(genericStatus) && <button type="button" className="btn btn-sm btn-d" onClick={() => setActionModal({ action: 'shortClose', danger: true, title: 'Short Close' })} disabled={isBusy}><span className="material-symbols-rounded">close</span> Short Close</button>}
                {genericStatus === 'COMPLETED' && <button type="button" className="btn btn-sm btn-p" onClick={() => setActionModal({ action: 'close', danger: false })} disabled={isBusy}><span className="material-symbols-rounded">lock</span> Close</button>}
                {['DRAFT', 'SUBMITTED', 'APPROVED'].includes(genericStatus) && can('planning', 'Cancel') && <button type="button" className="btn btn-sm btn-d" onClick={() => setActionModal({ action: 'cancel', danger: true })} disabled={isBusy}><span className="material-symbols-rounded">block</span> Cancel</button>}
                <button type="button" className="btn btn-sm" title="Status History" onClick={fetchStatusHistory}>
                  <span className="material-symbols-rounded">timeline</span> History
                </button>
                <button type="button" className="btn btn-sm" title="Audit Trail" onClick={() => setAuditOpen(true)}>
                  <span className="material-symbols-rounded">history</span> Audit
                </button>
                <StatusBadge status={genericStatus} />
                {/* FRS §4.1: View BOM / View Route Sheet buttons */}
                {Boolean(form.bomId) && <button type="button" className="btn btn-sm" onClick={viewBom}><span className="material-symbols-rounded">account_tree</span> View BOM</button>}
                {Boolean(form.routeId) && <button type="button" className="btn btn-sm" onClick={viewRoute}><span className="material-symbols-rounded">route</span> View Route Sheet</button>}
              </div>
            )}
          </div>
          {/* FRS §6.3.8: Collapsible header sections */}
          {(['overview', 'source', 'bomRoute', 'schedule', 'quantities', 'reasons'] as const).map((sectionKey) => {
            const isCollapsed = collapsedSections[sectionKey];
            const sectionFields = sectionFieldMap[sectionKey];
            const sectionLabel = sectionLabels[sectionKey];
            const sectionIcon = sectionIcons[sectionKey];
            const anyFieldVisible = sectionFields.some((k) => k === 'woNo' || config.fields.some((f) => f.key === k));
            if (!anyFieldVisible) return null;
            return (
              <div key={sectionKey} style={{ marginBottom: 8, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                <button type="button" onClick={() => setCollapsedSections((c) => ({ ...c, [sectionKey]: !c[sectionKey] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 14px', background: '#f9fafb', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'left' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>expand_more</span>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#6b7280' }}>{sectionIcon}</span>
                  {sectionLabel}
                </button>
                {!isCollapsed && (
                  <div className="fgrid" style={{ padding: '8px 14px 12px', borderTop: '1px solid #e5e7eb' }}>
                    {sectionFields.map((fieldKey) => {
                      if (fieldKey === 'woNo') {
                        return (
                          <label key="woNo" className="fld">
                            <span>WO No</span>
                            <input className="in" value={docNo} readOnly tabIndex={-1} style={{ fontWeight: 600, background: '#f9fafb' }} />
                          </label>
                        );
                      }
                      const field = config.fields.find((f) => f.key === fieldKey);
                      if (!field) return null;
                      const isBomOrRoute = field.key === 'bomId' || field.key === 'routeId';
                      const pickerOptions = field.key === 'bomId'
                        ? bomList.map((b) => `${b.id}`)
                        : field.key === 'routeId'
                          ? routeList.map((r) => `${r.id}`)
                          : (field.options ?? []);
                      const pickerLabels = field.key === 'bomId'
                        ? bomList.map((b) => `${b.bomNumber} \u2014 ${b.itemCode}`)
                        : field.key === 'routeId'
                          ? routeList.map((r) => `${r.routeNumber} \u2014 ${r.itemCode}`)
                          : pickerOptions;
                      const isProdQty = field.key === 'productionQty';
                      const isFieldReadonly = Boolean(field.readonly);
                      const isAutoDerived = isFieldReadonly && ['itemDescription', 'itemRevision', 'drawingNumber', 'drawingRev', 'uom'].includes(field.key);
                      return (
                        <label key={field.key} className={`fld ${field.span2 ? 'span2' : ''} ${isFieldError(field.key) ? 'invalid' : ''}`}>
                          <span>{field.label}</span>
                          {field.key === 'itemCode' ? (
                            <select className="in" disabled={!editable} value={String(form[field.key] ?? '')}
                              onChange={(e) => {
                                const code = e.target.value;
                                const it = items.find((i) => String(i.code) === code);
                                setForm((c) => ({
                                  ...c,
                                  itemCode: code,
                                  itemDescription: it ? String(it.description ?? '') : c.itemDescription,
                                  itemRevision: it && it.revision ? String(it.revision) : c.itemRevision,
                                  drawingNumber: it && it.drawingNumber ? String(it.drawingNumber) : c.drawingNumber,
                                  drawingRev: it && it.drawingRevision ? String(it.drawingRevision) : c.drawingRev,
                                  uom: it && it.uom ? String(it.uom) : c.uom,
                                }));
                              }}>
                              <option value="">{'\u2014 Select Item \u2014'}</option>
                              {items.map((it) => (
                                <option key={String(it.id)} value={String(it.code ?? '')}>{String(it.code ?? '')} — {String(it.description ?? '')}</option>
                              ))}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea className="in" rows={2} readOnly={!editable || isFieldReadonly} value={String(form[field.key] ?? '')} onChange={(e) => setForm((c) => ({ ...c, [field.key]: e.target.value }))} />
                          ) : (field.type === 'select' || isBomOrRoute) ? (
                            <select className="in" disabled={!editable || isFieldReadonly} value={String(form[field.key] ?? '')} onChange={(e) => setForm((c) => ({ ...c, [field.key]: e.target.value }))}>
                              <option value="">\u2014 Select \u2014</option>
                              {pickerOptions.map((o, i) => <option key={o} value={o}>{pickerLabels[i] ?? o}</option>)}
                            </select>
                          ) : (
                            <input className="in" type={field.type ?? 'text'} readOnly={!editable || isFieldReadonly} value={String(form[field.key] ?? '')} onChange={(e) => isProdQty && editable ? handleProductionQtyChange(e.target.value) : setForm((c) => ({ ...c, [field.key]: e.target.value }))} style={isAutoDerived ? { background: '#f9fafb', fontStyle: 'italic' } : undefined} />
                          )}
                          {isAutoDerived && <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>Auto-derived</span>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {documentId && summary && (
          <div className="panel" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="panel-h"><h2><span className="material-symbols-rounded">analytics</span> Summary (FRS §3.3)</h2></div>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <label className="fld"><span>Total Setup Time (min)</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#fff', borderRadius: 4, fontWeight: 600 }}>{formatNumber(Number(summary.totalSetupTimeMin ?? 0))}</span></label>
              <label className="fld"><span>Cycle Time/Unit (min)</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#fff', borderRadius: 4, fontWeight: 600 }}>{formatNumber(Number(summary.totalCycleTimePerUnitMin ?? 0))}</span></label>
              <label className="fld"><span>Total Prod. Time (min)</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#fff', borderRadius: 4, fontWeight: 600 }}>{formatNumber(Number(summary.totalProductionTimeMin ?? 0))}</span></label>
              <label className="fld"><span>Total Prod. Time (hrs)</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#fff', borderRadius: 4, fontWeight: 700, color: '#166534' }}>{formatNumber(Number(summary.totalProductionTimeHrs ?? 0))}</span></label>
            </div>
          </div>
        )}

        {documentId && (
          <div className="panel">
            <div className="panel-h">
              <h2>
                <span className="material-symbols-rounded">tab</span>
                <button type="button" className={`btn btn-sm ${activeTab === 'operations' ? 'btn-p' : ''}`} onClick={() => setActiveTab('operations')}>Operations ({ops.length})</button>
                <button type="button" className={`btn btn-sm ${activeTab === 'materials' ? 'btn-p' : ''}`} onClick={() => setActiveTab('materials')} style={{ marginLeft: '8px' }}>Materials ({mats.length})</button>
                <button type="button" className={`btn btn-sm ${activeTab === 'quantity' ? 'btn-p' : ''}`} onClick={() => setActiveTab('quantity')} style={{ marginLeft: '8px' }}>Quantity Tracking</button>
                <button type="button" className={`btn btn-sm ${activeTab === 'history' ? 'btn-p' : ''}`} onClick={() => { setActiveTab('history'); fetchStatusHistory(); }} style={{ marginLeft: '8px' }}>History</button>
              </h2>
              {editable && Boolean(form.bomId) && Boolean(form.routeId) && (
                <button type="button" className="btn btn-sm" disabled={isBusy || populating} onClick={handlePopulate}>
                  <span className="material-symbols-rounded">auto_fix_high</span> {populating ? 'Populating...' : 'Populate from BOM/Route'}
                </button>
              )}
            </div>
            {activeTab === 'operations' && (
              <>
                {editable && !documentId && <div style={{ padding: '8px 16px' }}><button type="button" className="btn btn-sm" disabled={isBusy} onClick={() => setOps((c) => [...c, {}])}><span className="material-symbols-rounded">add</span> Add Operation</button></div>}
                {renderLineTable(config.lines!.fields, ops, setOps, editable && !documentId)}
              </>
            )}
            {activeTab === 'materials' && (
              <>
                {editable && !documentId && <div style={{ padding: '8px 16px' }}><button type="button" className="btn btn-sm" disabled={isBusy} onClick={() => setMats((c) => [...c, {}])}><span className="material-symbols-rounded">add</span> Add Material</button></div>}
                {renderLineTable(WORK_ORDER_MATERIAL_FIELDS, mats, setMats, editable && !documentId)}
              </>
            )}
            {activeTab === 'quantity' && (
              <div style={{ padding: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>FRS §3.1 — Shop-Floor Stage Progress</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
                  {['Material Availability', 'Material Issue', 'Op10', 'Op20', 'Op30', 'Op40', 'Final Inspection', 'FG Receipt', 'WO Close'].map((stage, idx) => {
                    const completedStages = genericStatus === 'CLOSED' ? 9 : genericStatus === 'COMPLETED' ? 8 : genericStatus === 'IN_PROCESS' ? 4 : genericStatus === 'RELEASED' ? 2 : 0;
                    const isComplete = idx < completedStages;
                    const isCurrent = idx === completedStages;
                    return (
                      <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: isComplete ? '#d1fae5' : isCurrent ? '#dbeafe' : '#f3f4f6', color: isComplete ? '#065f46' : isCurrent ? '#1e40af' : '#9ca3af', border: isCurrent ? '2px solid #3b82f6' : '1px solid transparent' }}>
                          {stage}
                        </div>
                        {idx < 8 && <span style={{ color: '#d1d5db', fontSize: 14 }}>&#8594;</span>}
                      </div>
                    );
                  })}
                </div>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>Quantity Tracking</h3>
                <div className="fgrid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <label className="fld"><span>Released Qty</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatNumber(Number(form.releasedQty ?? 0))}</span></label>
                  <label className="fld"><span>Completed Qty</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatNumber(Number(form.completedQty ?? 0))}</span></label>
                  <label className="fld"><span>Rejected Qty</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatNumber(Number(form.rejectedQty ?? 0))}</span></label>
                  <label className="fld"><span>Balance Qty</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatNumber(Number(form.balanceQty ?? 0))}</span></label>
                  <label className="fld"><span>FG Receipt Qty</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#eff6ff', borderRadius: 4, fontWeight: 700, color: '#1e40af' }}>{formatNumber(Number(form.fgReceiptQty ?? 0))}</span></label>
                  <label className="fld"><span>Scrap Qty</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{formatNumber(Number(form.scrapQty ?? 0))}</span></label>
                  <label className="fld"><span>Scrap Allowance %</span><span className="in" style={{ display: 'block', padding: '8px 12px', background: '#f9fafb', borderRadius: 4, fontWeight: 600 }}>{String(form.scrapAllowancePercent ?? '—')}%</span></label>
                </div>
              </div>
            )}
            {activeTab === 'history' && (
              <div style={{ padding: '16px' }}>
                {statusHistory.length === 0 ? (
                  <div className="empty"><span className="material-symbols-rounded">history</span> No status changes recorded.</div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: '24px' }}>
                    <div style={{ position: 'absolute', left: '8px', top: 0, bottom: 0, width: '2px', background: '#e5e7eb' }} />
                    {statusHistory.map((h, idx) => (
                      <div key={idx} style={{ position: 'relative', marginBottom: '16px', padding: '10px 14px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <div style={{ position: 'absolute', left: '-20px', top: '14px', width: '12px', height: '12px', borderRadius: '50%', background: STATUS_COLORS[String(h.toStatus ?? '')] ?? '#6b7280', border: '2px solid #fff' }} />
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                          {String(h.fromStatus ?? '').replace('_', ' ')} <span style={{ color: '#9ca3af' }}>&#8594;</span> <span style={{ color: STATUS_COLORS[String(h.toStatus ?? '')] ?? '#374151' }}>{String(h.toStatus ?? '').replace('_', ' ')}</span>
                        </div>
                        {h.reason && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{String(h.reason)}</div>}
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{String(h.createdBy ?? '')} &#8226; {String(h.createdAt ?? '').replace('T', ' ').slice(0, 19)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!documentId && (
          <div className="panel">
            <div className="panel-h"><h2><span className="material-symbols-rounded">table_view</span> Operations</h2>
              <button type="button" className="btn btn-sm" disabled={isBusy} onClick={() => setOps((c) => [...c, {}])}><span className="material-symbols-rounded">add</span> Add Operation</button>
            </div>
            {renderLineTable(config.lines!.fields, ops, setOps, true)}
          </div>
        )}

        <div className="panel">
          <div className="actbar">
            <div className="lft">
              <button type="button" className="btn btn-sm" onClick={backToList} disabled={isBusy}><span className="material-symbols-rounded">arrow_back</span> Back</button>
              <span className="material-symbols-rounded">lock</span>{documentId ? 'Audited document' : 'New document'}
            </div>
            <div className="rgt">
              <span className="kbd-hint"><kbd className="kbd">Ctrl+S</kbd> Save</span>
              {documentId && <button type="button" className="btn btn-sm" onClick={handlePrint} disabled={isBusy}><span className="material-symbols-rounded">print</span> Print</button>}
              {!documentId && <button type="button" className="btn btn-sm btn-p" onClick={handleCreate} disabled={isBusy}><span className="material-symbols-rounded">save</span> Create Draft</button>}
              {documentId && editable && <button type="button" className="btn btn-sm" onClick={handleSave} disabled={isBusy}><span className="material-symbols-rounded">save</span> Save</button>}
            </div>
          </div>
        </div>
      </form>
      <ConfirmActionModal
        open={Boolean(actionModal)}
        title={`${actionModal?.title ?? actionModal?.action ?? ''} ${docNo}`}
        body={
          actionModal?.action === 'approve' ? 'Approve this work order?' :
          actionModal?.action === 'release' ? 'Release this work order for production?' :
          actionModal?.action === 'start' && genericStatus === 'ON_HOLD' ? 'Resume this work order from hold?' :
          actionModal?.action === 'start' ? 'Start production on this work order?' :
          actionModal?.action === 'complete' ? 'Mark this work order as completed?' :
          actionModal?.action === 'close' ? 'Close this work order? This cannot be undone.' :
          actionModal?.action === 'shortClose' ? 'Short Close Reason (required):' :
          actionModal?.action === 'hold' ? 'Reason for hold (required):' :
          actionModal?.action === 'reject' ? 'Reason for rejection:' :
          actionModal?.action === 'cancel' ? 'Cancel this work order?' :
          'Submit for review?'
        }
        okLabel={actionModal ? (actionModal.title ?? actionModal.action).charAt(0).toUpperCase() + (actionModal.title ?? actionModal.action).slice(1) : 'Confirm'}
        danger={actionModal?.danger}
        busy={actionMutation.isPending}
        onClose={() => setActionModal(null)}
        onConfirm={(note: string) => actionModal && runAction(actionModal.action, note)}
      />
      <AuditHistoryDrawer open={auditOpen} entityType={auditEntityTypeFor(config.docType)} entityId={documentId ?? undefined} onClose={() => setAuditOpen(false)} />

      {/* Status History Drawer */}
      {statusHistoryOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '420px', height: '100vh', background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Status History</h3>
            <button className="ibtn" onClick={() => setStatusHistoryOpen(false)}><span className="material-symbols-rounded">close</span></button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
            {statusHistory.length === 0 ? (
              <div className="empty"><span className="material-symbols-rounded">history</span> No status changes recorded.</div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                <div style={{ position: 'absolute', left: '8px', top: 0, bottom: 0, width: '2px', background: '#e5e7eb' }} />
                {statusHistory.map((h, idx) => (
                  <div key={idx} style={{ position: 'relative', marginBottom: '16px', padding: '10px 14px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '14px', width: '12px', height: '12px', borderRadius: '50%', background: STATUS_COLORS[String(h.toStatus ?? '')] ?? '#6b7280', border: '2px solid #fff' }} />
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                      {String(h.fromStatus ?? '').replace('_', ' ')} <span style={{ color: '#9ca3af' }}>\u2192</span> <span style={{ color: STATUS_COLORS[String(h.toStatus ?? '')] ?? '#374151' }}>{String(h.toStatus ?? '').replace('_', ' ')}</span>
                    </div>
                    {h.reason && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{String(h.reason)}</div>}
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{String(h.createdBy ?? '')} \u2022 {String(h.createdAt ?? '').replace('T', ' ').slice(0, 19)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
