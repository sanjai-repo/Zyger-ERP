import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';

export interface BomLine {
  id?: number;
  lineNo: number;
  componentItemCode: string;
  description: string;
  quantityPer: number;
  uom: string;
  scrapPercentage: number;
  warehouse: string;
  remarks: string;
}

export interface BomDoc {
  id: number;
  bomNumber: string;
  bomVersion: string;
  itemCode: string;
  itemRevision: string;
  description: string;
  itemType: string;
  bomType: string;
  baseQuantity: number;
  baseUom: string;
  weight: number;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
  active: boolean;
  lines: BomLine[];
}

const ITEM_TYPES = ['FG', 'SEMI_FG', 'RM'];
const BOM_TYPES = ['Primary', 'Alternate'];

const emptyBom = (): Omit<BomDoc, 'id'> => ({
  bomNumber: '', bomVersion: '1.0', itemCode: '', itemRevision: '',
  description: '', itemType: 'FG', bomType: 'Primary',
  baseQuantity: 1, baseUom: 'PCS', weight: 0,
  effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: '',
  status: 'DRAFT', active: true, lines: [],
});

const emptyLine = (n: number): BomLine => ({
  lineNo: n, componentItemCode: '', description: '', quantityPer: 1,
  uom: 'PCS', scrapPercentage: 0, warehouse: '', remarks: '',
});

interface WhereUsedRow {
  type: string;
  reference: string;
  itemCode: string;
  status: string;
  quantity: number;
}

interface VersionCompareRow {
  currentVersion: string;
  previousVersion: string;
  componentCount: number;
  changed: boolean;
}

export default function BomMasterScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<BomDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [bom, setBom] = useState(emptyBom());
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BomDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [expandedLine, setExpandedLine] = useState<number | null>(null);
  const [formTab, setFormTab] = useState<'details' | 'where-used' | 'version-compare'>('details');
  const [whereUsedRows, setWhereUsedRows] = useState<WhereUsedRow[]>([]);
  const [whereUsedLoading, setWhereUsedLoading] = useState(false);
  const [versionRows, setVersionRows] = useState<VersionCompareRow[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/planning/production-bom', { params: { size: 500, page: 0 } });
      setRows(data.content ?? data ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (k: string, v: unknown) => setBom((p) => ({ ...p, [k]: v }));

  const setLine = (idx: number, k: string, v: unknown) => setBom((p) => {
    const lines = [...p.lines];
    lines[idx] = { ...lines[idx], [k]: v };
    return { ...p, lines };
  });

  const addLine = () => setBom((p) => ({ ...p, lines: [...p.lines, emptyLine(p.lines.length + 1)] }));

  const removeLine = (idx: number) => setBom((p) => ({
    ...p,
    lines: p.lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, lineNo: i + 1 })),
  }));

  const openNew = () => {
    setBom(emptyBom());
    setEditId(null);
    setFormTab('details');
    setViewMode('FORM');
  };

  const edit = (r: BomDoc) => {
    setBom({ ...r, lines: r.lines ? [...r.lines] : [] });
    setEditId(r.id);
    setFormTab('details');
    setViewMode('FORM');
  };

  const save = async () => {
    if (!bom.itemCode.trim()) { toast('Item Code is required.', 'error'); return; }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        itemCode: bom.itemCode, itemRevision: bom.itemRevision, bomVersion: bom.bomVersion,
        description: bom.description, itemType: bom.itemType, bomType: bom.bomType,
        baseQuantity: bom.baseQuantity, baseUom: bom.baseUom,
        effectiveFrom: bom.effectiveFrom, effectiveTo: bom.effectiveTo || null,
        lines: bom.lines.map((l) => ({
          lineNo: l.lineNo, componentItemCode: l.componentItemCode, description: l.description,
          quantityPer: l.quantityPer, uom: l.uom, scrapPercentage: l.scrapPercentage,
          warehouse: l.warehouse, remarks: l.remarks,
        })),
      };
      if (editId) {
        await apiClient.put(`/v1/planning/production-bom/${editId}`, payload);
        toast('BOM updated.');
      } else {
        await apiClient.post('/v1/planning/production-bom', payload);
        toast('BOM created.');
      }
      setViewMode('LIST');
      load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/v1/planning/production-bom/${deleteTarget.id}`);
      toast('BOM deleted.');
      setDeleteTarget(null);
      load();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  const submit = async (id: number) => {
    setBusy(true);
    try {
      await apiClient.post(`/v1/planning/production-bom/${id}/actions/submit`, {});
      toast('BOM submitted.');
      load();
    } catch (e) { toast(getApiErrorMessage(e, 'Submit failed.'), 'error'); }
    setBusy(false);
  };

  const approve = async (id: number) => {
    setBusy(true);
    try {
      await apiClient.post(`/v1/planning/production-bom/${id}/actions/approve`, {});
      toast('BOM approved.');
      load();
    } catch (e) { toast(getApiErrorMessage(e, 'Approve failed.'), 'error'); }
    setBusy(false);
  };

  const fetchWhereUsed = async (id: number) => {
    setWhereUsedLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/production-bom/${id}/where-used`);
      setWhereUsedRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Failed to load where-used data.'), 'error'); }
    setWhereUsedLoading(false);
  };

  const fetchVersionCompare = async (id: number) => {
    setVersionLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/production-bom/${id}/version-compare`);
      setVersionRows(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Failed to load version compare data.'), 'error'); }
    setVersionLoading(false);
  };

  const openFormTab = (tab: 'details' | 'where-used' | 'version-compare') => {
    setFormTab(tab);
    if (tab === 'where-used' && editId) fetchWhereUsed(editId);
    if (tab === 'version-compare' && editId) fetchVersionCompare(editId);
  };

  if (viewMode === 'FORM') {
    return (
      <>
        <div className="pg-head">
          <h1>{editId ? 'Edit' : 'New'} Bill of Material (BOM)</h1>
          <p>{editId ? `Editing ${bom.bomNumber || 'BOM'}` : 'Create a new Bill of Material'}</p>
        </div>

        {editId && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button type="button" className={`btn btn-sm ${formTab === 'details' ? 'btn-p' : ''}`} onClick={() => openFormTab('details')}>Details</button>
            <button type="button" className={`btn btn-sm ${formTab === 'where-used' ? 'btn-p' : ''}`} onClick={() => openFormTab('where-used')}>Where-Used</button>
            <button type="button" className={`btn btn-sm ${formTab === 'version-compare' ? 'btn-p' : ''}`} onClick={() => openFormTab('version-compare')}>Version Compare</button>
          </div>
        )}

        {formTab === 'details' && (
          <div className="panel">
            <div className="sec-head">
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>info</span>
              BOM Header
            </div>
          <div className="fgrid sec-body">
            <label className="fld"><span>Item Code *</span><input className="in" value={bom.itemCode} onChange={(e) => setField('itemCode', e.target.value)} /></label>
            <label className="fld"><span>Description</span><input className="in" value={bom.description} onChange={(e) => setField('description', e.target.value)} /></label>
            <label className="fld"><span>Version</span><input className="in" value={bom.bomVersion} onChange={(e) => setField('bomVersion', e.target.value)} /></label>
            <label className="fld"><span>Revision</span><input className="in" value={bom.itemRevision} onChange={(e) => setField('itemRevision', e.target.value)} /></label>
            <label className="fld"><span>Item Type</span>
              <select className="in" value={bom.itemType} onChange={(e) => setField('itemType', e.target.value)}>
                {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="fld"><span>BOM Type</span>
              <select className="in" value={bom.bomType} onChange={(e) => setField('bomType', e.target.value)}>
                {BOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="fld"><span>Base Quantity</span><input className="in" type="number" min="0.01" step="0.01" value={bom.baseQuantity} onChange={(e) => setField('baseQuantity', parseFloat(e.target.value) || 1)} /></label>
            <label className="fld"><span>UOM</span><input className="in" value={bom.baseUom} onChange={(e) => setField('baseUom', e.target.value)} /></label>
            <label className="fld"><span>Effective From</span><input className="in" type="date" value={bom.effectiveFrom} onChange={(e) => setField('effectiveFrom', e.target.value)} /></label>
            <label className="fld"><span>Effective To</span><input className="in" type="date" value={bom.effectiveTo} onChange={(e) => setField('effectiveTo', e.target.value)} /></label>
          </div>
        </div>

        <div className="panel">
          <div className="sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>list</span>
              BOM Components ({bom.lines.length})
            </span>
            <button className="btn sm primary" onClick={addLine}>
              <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>add</span> Add Line
            </button>
          </div>

          {bom.lines.length > 0 ? (
            <table className="tbl" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Component Item *</th>
                  <th>Description</th>
                  <th>Qty/Unit</th>
                  <th>UOM</th>
                  <th>Scrap %</th>
                  <th>Warehouse</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bom.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>{line.lineNo}</td>
                    <td><input className="in sm" value={line.componentItemCode} onChange={(e) => setLine(idx, 'componentItemCode', e.target.value)} /></td>
                    <td><input className="in sm" value={line.description} onChange={(e) => setLine(idx, 'description', e.target.value)} /></td>
                    <td><input className="in sm" type="number" min="0" step="0.01" value={line.quantityPer} onChange={(e) => setLine(idx, 'quantityPer', parseFloat(e.target.value) || 0)} /></td>
                    <td><input className="in sm" value={line.uom} onChange={(e) => setLine(idx, 'uom', e.target.value)} style={{ width: 60 }} /></td>
                    <td><input className="in sm" type="number" min="0" step="0.1" value={line.scrapPercentage} onChange={(e) => setLine(idx, 'scrapPercentage', parseFloat(e.target.value) || 0)} style={{ width: 60 }} /></td>
                    <td><input className="in sm" value={line.warehouse} onChange={(e) => setLine(idx, 'warehouse', e.target.value)} style={{ width: 80 }} /></td>
                    <td>
                      <button className="btn sm danger" onClick={() => removeLine(idx)}>
                        <span className="material-symbols-rounded" style={{ fontSize: '0.9rem' }}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 16 }}>No components added. Click "Add Line" to start.</div>
          )}
        </div>
        )}

        {formTab === 'where-used' && (
          <div className="panel">
            <div className="sec-head">
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>search</span>
              Where-Used — Items referencing this BOM
            </div>
            {whereUsedLoading ? <div className="empty" style={{ padding: 16 }}>Loading...</div> : (
              whereUsedRows.length > 0 ? (
                <table className="tbl" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Item Code</th>
                      <th>Status</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whereUsedRows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.type}</td>
                        <td>{r.reference}</td>
                        <td>{r.itemCode}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>{r.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty" style={{ padding: 16 }}>No references found for this BOM.</div>
              )
            )}
          </div>
        )}

        {formTab === 'version-compare' && (
          <div className="panel">
            <div className="sec-head">
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>compare</span>
              Version Compare
            </div>
            {versionLoading ? <div className="empty" style={{ padding: 16 }}>Loading...</div> : (
              versionRows.length > 0 ? (
                <table className="tbl" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Current Version</th>
                      <th>Previous Version</th>
                      <th>Component Count</th>
                      <th>Changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versionRows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.currentVersion}</td>
                        <td>{r.previousVersion}</td>
                        <td>{r.componentCount}</td>
                        <td>{r.changed ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty" style={{ padding: 16 }}>No version comparison data available.</div>
              )
            )}
          </div>
        )}

        <div className="actbar">
          <button className="btn" onClick={() => setViewMode('LIST')}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
          <button className="btn btn-p" onClick={save} disabled={busy}>
            <span className="material-symbols-rounded">save</span> {editId ? 'Update' : 'Create'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pg-head">
        <h1>Bill of Material (BOM)</h1>
        <p>Master data for Bills of Material — components, quantities, and structure</p>
        <button className="btn primary" onClick={openNew}>
          <span className="material-symbols-rounded">add</span> New BOM
        </button>
      </div>

      <div className="panel">
        {loading ? <div className="empty">Loading...</div> : (
          <table className="tbl">
            <thead>
              <tr>
                <th>BOM No</th>
                <th>Version</th>
                <th>Item Code</th>
                <th>Description</th>
                <th>Type</th>
                <th>BOM Type</th>
                <th>Base Qty</th>
                <th>Components</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.bomNumber || r.docNo}</td>
                  <td>{r.bomVersion}</td>
                  <td>{r.itemCode}</td>
                  <td>{r.description || '—'}</td>
                  <td><StatusBadge status={r.itemType || '—'} /></td>
                  <td>{r.bomType || '—'}</td>
                  <td>{r.baseQuantity} {r.baseUom}</td>
                  <td>{r.lines?.length || 0}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button className="btn sm" onClick={() => edit(r)}>Edit</button>
                    {r.status === 'DRAFT' && <button className="btn sm" onClick={() => submit(r.id)}>Submit</button>}
                    {r.status === 'SUBMITTED' && <button className="btn sm primary" onClick={() => approve(r.id)}>Approve</button>}
                    <button className="btn sm danger" onClick={() => setDeleteTarget(r)}>Delete</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={10} className="empty">No BOMs found. Click "New BOM" to create one.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete BOM</h3>
            <p>Delete <b>{deleteTarget.bomNumber || deleteTarget.docNo}</b> ({deleteTarget.itemCode})?</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn danger" onClick={del} disabled={busy}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
