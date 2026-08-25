import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  usePlanningDoc,
  usePlanningDocAction,
  usePlanningDocCreate,
  usePlanningDocDelete,
  usePlanningDocList,
  usePlanningDocNextNumber,
  usePlanningDocUpdate,
} from '../../hooks/usePlanningDocs';
import type { DocScreenConfig } from './planningDocConfigs';
import { formatDate, formatNumber, toOptionalNumber } from '../../utils/format';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToast } from '../../contexts/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import AuditHistoryDrawer from '../../components/common/AuditHistoryDrawer';
import { auditEntityTypeFor } from '../../utils/auditEntity';
import { exportToCsv } from '../../utils/csvExport';
import { useFormKeyboard } from '../../hooks/useFormKeyboard';
import { useUnsavedWarning } from '../../hooks/useUnsavedWarning';
import { useFormValidation } from '../../hooks/useFormValidation';
import apiClient from '../../api/axiosClient';

const PAGE_SIZE = 8;

interface PlanningDocScreenProps {
  config: DocScreenConfig;
  initialDocId?: string | number;
  viewOnly?: boolean;
  defaultType?: string;
}

type ActionModal = { action: 'submit' | 'approve' | 'reject' | 'reopen' | 'cancel'; danger: boolean };

export default function PlanningDocScreen({ config, initialDocId, viewOnly = false, defaultType }: PlanningDocScreenProps) {
  const { toast } = useToast();
  const { docType } = config;

  const [mode, setMode] = useState<'list' | 'form'>(initialDocId ? 'form' : 'list');
  const [documentId, setDocumentId] = useState<string | null>(initialDocId ? String(initialDocId) : null);
  const [isViewOnly, setIsViewOnly] = useState(viewOnly);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState(defaultType ?? '');
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<Array<Record<string, unknown>>>([]);
  const [initializedForId, setInitializedForId] = useState('');
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [selectedLineIdx, setSelectedLineIdx] = useState<number | null>(null);
  const [childGridData, setChildGridData] = useState<Record<string, unknown>[]>([]);

  const listQuery = usePlanningDocList(docType, {
    page,
    size: PAGE_SIZE,
    sort: 'date,desc',
    search: search || undefined,
    status: status || undefined,
    type: type || undefined,
  });
  const nextNumberQuery = usePlanningDocNextNumber(docType);
  const documentQuery = usePlanningDoc(docType, mode === 'form' && documentId ? documentId : null);
  const createMutation = usePlanningDocCreate(docType);
  const updateMutation = usePlanningDocUpdate(docType);
  const deleteMutation = usePlanningDocDelete(docType);
  const actionMutation = usePlanningDocAction(docType);

  const childGrid = config.childGrids?.[0];
  const selectedLine = selectedLineIdx !== null && config.lines ? lines[selectedLineIdx] ?? (form.lines as Array<Record<string, unknown>>)?.[selectedLineIdx] : null;
  const selectedLineId = selectedLine?.[childGrid?.parentIdField ?? 'id'];

  const childGridQuery = useQuery({
    queryKey: ['child-grid', docType, documentId, childGrid?.apiPath, selectedLineId],
    queryFn: () => {
      const url = (childGrid?.apiPath ?? '').replace('{parentId}', String(selectedLineId));
      return apiClient.get<Record<string, unknown>[]>(url).then((r) => r.data);
    },
    enabled: Boolean(childGrid && documentId && selectedLineId != null),
    staleTime: 0,
    retry: 1,
  });

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { setPage(0); }, [search, status, type]);

  useEffect(() => {
    setSelectedLineIdx(null);
    setChildGridData([]);
  }, [documentId]);

  useEffect(() => {
    if (initialDocId) {
      setDocumentId(String(initialDocId));
      setIsViewOnly(viewOnly);
      setMode('form');
    }
  }, [initialDocId, viewOnly]);

  useEffect(() => {
    const doc = documentQuery.data;
    if (!doc || !documentId) return;
    const key = String(documentId);
    if (initializedForId === key) return;
    setInitializedForId(key);
    setForm({ ...doc });
    setLines(Array.isArray(doc.lines) ? (doc.lines as Array<Record<string, unknown>>).map((l) => ({ ...l })) : []);
  }, [documentQuery.data, documentId, initializedForId]);

  useEffect(() => {
    if (childGridQuery.data) setChildGridData(childGridQuery.data as Record<string, unknown>[]);
  }, [childGridQuery.data]);

  const doc = documentQuery.data;
  const genericStatus = String(doc?.status ?? 'DRAFT');
  const editable = !isViewOnly && (!documentId || ['DRAFT', 'REJECTED'].includes(genericStatus));
  const isBusy = createMutation.isPending || updateMutation.isPending || actionMutation.isPending || deleteMutation.isPending;
  const rows = listQuery.data?.content ?? [];
  const totalElements = listQuery.data?.totalElements ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;

  const openForm = (id: string | null, view: boolean) => {
    setDocumentId(id);
    setInitializedForId('');
    setIsViewOnly(view);
    setForm(config.typeFilter && defaultType ? { [config.typeFilter.field]: defaultType } : {});
    setLines(config.lines?.seed ? config.lines.seed.map((s) => ({ ...s })) : []);
    setMode('form');
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
    if (config.lines) {
      payload.lines = lines
        .filter((l) => String(l[config.lines!.fields[0].key] ?? '').trim() !== '')
        .map((l) => { const out = { ...l }; delete out.id; delete out.qty; return out; });
    }
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
      toast(`${created.docNo ?? docType} created as draft.`);
      setDocumentId(String(created.id ?? ''));
      setInitializedForId('');
    } catch (e) { toast(getApiErrorMessage(e, 'Create failed.'), 'error'); }
  };

  const handleSave = async () => {
    if (!documentId) return;
    try {
      const updated = await updateMutation.mutateAsync({ id: documentId, payload: buildPayload() });
      setForm({ ...updated });
      toast(`${updated.docNo ?? docType} saved.`);
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
  };

  const runAction = async (action: string, note?: string) => {
    if (!documentId) return;
    try {
      const updated = await actionMutation.mutateAsync({ id: documentId, action, note });
      setForm({ ...updated });
      setActionModal(null);
      toast(`${updated.docNo ?? docType} \u2022 ${action} completed.`);
    } catch (e) { toast(getApiErrorMessage(e, `${action} failed.`), 'error'); }
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(documentQuery.data ?? {}) || lines.length > 0;
  const { validate: validateFields, hasError: isFieldError } = useFormValidation();
  useUnsavedWarning(isDirty && !!documentId);
  useFormKeyboard({
    enabled: mode === 'form',
    onSave: editable ? handleSave : undefined,
    onSubmit: !documentId ? handleCreate : undefined,
    onBack: backToList,
  });

  const cellValue = (row: Record<string, unknown>, field: string): string => {
    const raw = row[field];
    if (raw == null) return '\u2014';
    if (typeof raw === 'number') return formatNumber(raw);
    const s = String(raw);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return formatDate(s.slice(0, 10));
    return s;
  };

  const listBody = useMemo(() => {
    if (listQuery.isPending) {
      return <div className="panel"><div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading {config.title} records...</div></div>;
    }
    if (listQuery.isError) {
      return <div className="panel"><div className="empty"><span className="material-symbols-rounded">error</span>{getApiErrorMessage(listQuery.error, 'Unable to load records.')}<div style={{ marginTop: '14px' }}><button className="btn" onClick={() => listQuery.refetch()}><span className="material-symbols-rounded">refresh</span> Retry</button></div></div></div>;
    }
    return (
      <div className="panel">
        <div className="toolbar">
          <div className="searchwrap">
            <span className="material-symbols-rounded">search</span>
            <input className="in" value={searchInput} placeholder="Search..." onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <button
            className="ibtn"
            title="Export CSV"
            onClick={() =>
              exportToCsv(
                rows as unknown as Record<string, unknown>[],
                config.columns.map((c) => ({ key: c.field, label: c.label })),
                config.docType
              )
            }
          >
            <span className="material-symbols-rounded">download</span>
          </button>
          <span className="count">{formatNumber(totalElements)} record{totalElements === 1 ? '' : 's'}</span>
          <select className="in" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {config.statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {config.typeFilter && (
            <select className="in" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{config.typeFilter.label}</option>
              {config.typeFilter.options.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <div className="sp" />
          <button className="btn btn-p" onClick={() => openForm(null, false)}>
            <span className="material-symbols-rounded">add</span> Add
          </button>
        </div>
        <div className="twrap">
          <table className="tbl">
            <thead><tr>{config.columns.map((c) => <th key={c.field} className={c.numeric ? 'num' : ''}>{c.label}</th>)}<th>Actions</th></tr></thead>
            <tbody>
              {rows.length > 0 ? rows.map((row: Record<string, unknown>) => (
                <tr key={String(row.id)}>
                  {config.columns.map((c) => (
                    <td key={c.field} className={c.numeric ? 'num' : ''}>
                      {c.field === config.statusField ? <StatusBadge status={String(row[c.field] ?? 'DRAFT')} /> : cellValue(row, c.field)}
                    </td>
                  ))}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="ibtn" title="View" onClick={() => openForm(String(row.id), true)}><span className="material-symbols-rounded">visibility</span></button>
                    <button className="ibtn" title="Edit" onClick={() => openForm(String(row.id), false)}><span className="material-symbols-rounded">edit</span></button>
                    <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(row)}><span className="material-symbols-rounded">delete</span></button>
                  </td>
                </tr>
              )) : <tr><td colSpan={config.columns.length + 1}><div className="empty"><span className="material-symbols-rounded">description</span> No records found. Click &quot;Add&quot;.</div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>Showing {rows.length === 0 ? 0 : page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {formatNumber(totalElements)}</span>
          <div className="pgs">
            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>\u2039</button>
            {Array.from({ length: totalPages }, (_, i) => i).map((i) => <button key={i} className={i === page ? 'on' : ''} onClick={() => setPage(i)}>{i + 1}</button>)}
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>\u203A</button>
          </div>
        </div>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQuery.data, listQuery.isPending, listQuery.isError, searchInput, status, type, page, totalElements, totalPages, rows]);

  if (mode === 'list') {
    return (
      <>
        <div className="pg-head"><h1>{config.title}</h1><p>{config.subtitle}</p></div>
        {listBody}
        <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${String(deleteTarget?.docNo ?? '')}`} body="The record will be permanently removed. Only DRAFT/REJECTED documents can be deleted." okLabel="Delete" danger busy={deleteMutation.isPending} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (!deleteTarget) return; try { await deleteMutation.mutateAsync(String(deleteTarget.id)); toast(`${String(deleteTarget.docNo ?? '')} deleted.`); setDeleteTarget(null); } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); } }} />
      </>
    );
  }

  if (documentId && documentQuery.isPending) {
    return <div className="panel"><div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading {config.title}...</div></div>;
  }
  if (documentId && documentQuery.isError) {
    return <div className="panel"><div className="empty"><span className="material-symbols-rounded">error</span>{getApiErrorMessage(documentQuery.error, 'Unable to load record.')}<div style={{ marginTop: '14px' }}><button className="btn" onClick={() => documentQuery.refetch()}><span className="material-symbols-rounded">refresh</span> Retry</button></div></div></div>;
  }

  const docNo = documentId ? String(doc?.docNo ?? '') : String(nextNumberQuery.data?.nextNumber ?? '\u2014');

  return (
    <>
      <div className="pg-head"><h1>{isViewOnly ? 'View' : documentId ? 'Edit' : 'Add'} {config.title} \u2014 {docNo}</h1><p>{config.subtitle}</p></div>
      <div className="note"><span className="material-symbols-rounded">info</span><span>Workflow: DRAFT {'\u2192'} SUBMITTED {'\u2192'} APPROVED \u2022 Only DRAFT/REJECTED records are editable</span></div>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="panel">
          <div className="panel-h"><h2><span className="material-symbols-rounded">description</span> Header</h2>
            {documentId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {documentId && !isViewOnly && genericStatus === 'DRAFT' && <button type="button" className="btn btn-sm btn-p" onClick={() => setActionModal({ action: 'submit', danger: false })} disabled={isBusy}><span className="material-symbols-rounded">send</span> Submit</button>}
                {documentId && !isViewOnly && genericStatus === 'SUBMITTED' && <button type="button" className="btn btn-sm btn-g" onClick={() => setActionModal({ action: 'approve', danger: false })} disabled={isBusy}><span className="material-symbols-rounded">thumb_up</span> Approve</button>}
                {documentId && !isViewOnly && genericStatus === 'SUBMITTED' && <button type="button" className="btn btn-sm btn-d" onClick={() => setActionModal({ action: 'reject', danger: true })} disabled={isBusy}><span className="material-symbols-rounded">thumb_down</span> Reject</button>}
                {documentId && editable && genericStatus !== 'DRAFT' && <button type="button" className="btn btn-sm" onClick={() => runAction('reopen')} disabled={isBusy}><span className="material-symbols-rounded">restart_alt</span> Reopen</button>}
                {documentId && !isViewOnly && ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(genericStatus) && <button type="button" className="btn btn-sm btn-d" onClick={() => setActionModal({ action: 'cancel', danger: true })} disabled={isBusy}><span className="material-symbols-rounded">block</span> Cancel</button>}
                <button type="button" className="btn btn-sm" title="Audit History" onClick={() => setAuditOpen(true)}>
                  <span className="material-symbols-rounded">history</span> Audit
                </button>
                <StatusBadge status={genericStatus} />
              </div>
            )}
          </div>
          <div className="fgrid">
            <label className="fld">
              <span>Doc No</span>
              <input className="in" value={docNo} readOnly tabIndex={-1} style={{ fontWeight: 600, background: '#f9fafb' }} />
            </label>
            {config.fields.map((field) => (
              <label key={field.key} className={`fld ${field.span2 ? 'span2' : ''} ${isFieldError(field.key) ? 'invalid' : ''}`}>
                <span>{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea className="in" rows={2} readOnly={!editable} value={String(form[field.key] ?? '')} onChange={(e) => setForm((c) => ({ ...c, [field.key]: e.target.value }))} />
                ) : field.type === 'select' ? (
                  <select className="in" disabled={!editable} value={String(form[field.key] ?? '')} onChange={(e) => setForm((c) => ({ ...c, [field.key]: e.target.value }))}>
                    <option value="">\u2014 Select \u2014</option>
                    {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <input type="checkbox" className="checkbox" disabled={!editable} checked={Boolean(form[field.key])} onChange={(e) => setForm((c) => ({ ...c, [field.key]: e.target.checked }))} />
                ) : (
                  <input className="in" type={field.type ?? 'text'} readOnly={!editable} value={String(form[field.key] ?? '')} onChange={(e) => setForm((c) => ({ ...c, [field.key]: e.target.value }))} />
                )}
              </label>
            ))}
          </div>
        </div>

        {config.lines && editable && (
          <div className="panel">
            <div className="panel-h"><h2><span className="material-symbols-rounded">table_view</span> {config.lines.title}</h2>
              {!config.lines.seed && <button type="button" className="btn btn-sm" disabled={isBusy} onClick={() => setLines((c) => [...c, {}])}><span className="material-symbols-rounded">add</span> Add Line</button>}
            </div>
            <div className="twrap">
              <table className="tbl lines">
                <thead><tr>{config.lines.fields.map((f) => <th key={f.key}>{f.label}</th>)}{!config.lines.seed && <th></th>}</tr></thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} onClick={() => config.childGrids && setSelectedLineIdx(selectedLineIdx === index ? null : index)} style={config.childGrids ? { cursor: 'pointer' } : undefined} className={selectedLineIdx === index ? 'selected-row' : ''}>
                      {config.lines!.fields.map((f) => (
                        <td key={f.key}>
                          {f.type === 'select' ? (
                            <select className="in" value={String(line[f.key] ?? '')} onChange={(e) => setLines((c) => c.map((l, i) => (i === index ? { ...l, [f.key]: e.target.value } : l)))}>
                              <option value="">\u2014</option>
                              {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input className="in" type={f.type ?? 'text'} readOnly={f.readonly || !editable} value={String(line[f.key] ?? '')} onChange={(e) => setLines((c) => c.map((l, i) => (i === index ? { ...l, [f.key]: e.target.value } : l)))} />
                          )}
                        </td>
                      ))}
                      {!config.lines!.seed && <td><button type="button" className="ibtn danger" disabled={isBusy} onClick={(e) => { e.stopPropagation(); setLines((c) => c.filter((_, i) => i !== index)); if (selectedLineIdx === index) setSelectedLineIdx(null); }}><span className="material-symbols-rounded">delete</span></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {config.lines && !editable && Array.isArray(form.lines) && (form.lines as Array<Record<string, unknown>>).length > 0 && (
          <div className="panel">
            <div className="panel-h"><h2><span className="material-symbols-rounded">table_view</span> {config.lines.title}</h2></div>
            <div className="twrap">
              <table className="tbl">
                <thead><tr>{config.lines.fields.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
                <tbody>
                  {(form.lines as Array<Record<string, unknown>>).map((line, index) => (
                    <tr key={index} onClick={() => config.childGrids && setSelectedLineIdx(selectedLineIdx === index ? null : index)} style={config.childGrids ? { cursor: 'pointer' } : undefined} className={selectedLineIdx === index ? 'selected-row' : ''}>{config.lines!.fields.map((f) => <td key={f.key}>{line[f.key] == null ? '\u2014' : String(line[f.key])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {config.childGrids && selectedLineIdx !== null && childGrid && (
          <div className="panel">
            <div className="panel-h"><h2><span className="material-symbols-rounded">checklist</span> {childGrid.title}</h2></div>
            {childGridQuery.isPending && <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>}
            {childGridQuery.isError && <div className="empty"><span className="material-symbols-rounded">error</span> Failed to load inspection parameters.</div>}
            {childGridQuery.isSuccess && childGridData.length === 0 && <div className="empty"><span className="material-symbols-rounded">info</span> No inspection parameters for this operation.</div>}
            {childGridQuery.isSuccess && childGridData.length > 0 && (
              <div className="twrap">
                <table className="tbl">
                  <thead><tr>{childGrid.fields.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
                  <tbody>
                    {childGridData.map((row, idx) => (
                      <tr key={idx}>{childGrid.fields.map((f) => <td key={f.key}>{row[f.key] == null ? '\u2014' : String(row[f.key])}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              {documentId && editable && (
                <button type="button" className="btn btn-sm" onClick={handleSave} disabled={isBusy}><span className="material-symbols-rounded">save</span> Save</button>
              )}
              {!documentId && <button type="button" className="btn btn-sm btn-p" onClick={handleCreate} disabled={isBusy}><span className="material-symbols-rounded">save</span> Create Draft</button>}
            </div>
          </div>
        </div>
      </form>
      <ConfirmActionModal open={Boolean(actionModal)} title={`${actionModal?.action ?? ''} ${docNo}`} body={actionModal?.action === 'approve' ? 'Approving records the action with your user in the audit trail.' : actionModal?.action === 'reject' ? 'Reason for rejection:' : actionModal?.action === 'cancel' ? 'This cancels the record with an audit trail.' : 'Submit this record for review?'} okLabel={actionModal ? actionModal.action.charAt(0).toUpperCase() + actionModal.action.slice(1) : 'Confirm'} danger={actionModal?.danger} busy={actionMutation.isPending} onClose={() => setActionModal(null)} onConfirm={(note) => actionModal && runAction(actionModal.action, note)} />
      <AuditHistoryDrawer open={auditOpen} entityType={auditEntityTypeFor(docType)} entityId={documentId ?? undefined} onClose={() => setAuditOpen(false)} />
    </>
  );
}
