import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

export interface ToolItem {
  id: number;
  code: string;
  name: string;
  toolType?: string;
  material?: string;
  shape?: string;
  dimension?: string;
  machineCompatible?: string;
  diameter?: number;
  fluteLength?: number;
  overallLength?: number;
  holderType?: string;
  toolLifeCount?: number;
  toolLifeUnit?: string;
  currentUsage?: number;
  supplierCode?: string;
  unitCost?: number;
  reorderLevel?: number;
  currentStatus: string;
  storeCode?: string;
  active: boolean;
}

export default function ToolScreen() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [rows, setRows] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ToolItem | null>(null);

  // Form State
  const [code, setCode] = useState('TL-0001');
  const [name, setName] = useState('');
  const [toolType, setToolType] = useState('END MILL');
  const [material, setMaterial] = useState('Tungsten Carbide');
  const [shape, setShape] = useState('4 Flute Square');
  const [dimension, setDimension] = useState('10mm x 75mm');
  const [machineCompatible, setMachineCompatible] = useState('VMC-01, VMC-02');
  const [diameter, setDiameter] = useState<number>(10);
  const [fluteLength, setFluteLength] = useState<number>(25);
  const [overallLength, setOverallLength] = useState<number>(75);
  const [holderType, setHolderType] = useState('BT40 ER32');
  const [toolLifeCount, setToolLifeCount] = useState<number>(500);
  const [toolLifeUnit, setToolLifeUnit] = useState('PIECES');
  const [currentUsage, setCurrentUsage] = useState<number>(120);
  const [supplierCode, setSupplierCode] = useState('SUP-0001');
  const [unitCost, setUnitCost] = useState<number>(850);
  const [reorderLevel, setReorderLevel] = useState<number>(5);
  const [currentStatus, setCurrentStatus] = useState('AVAILABLE');
  const [storeCode, setStoreCode] = useState('STORE-01');
  const [active, setActive] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/master/tools');
      const content = data?.content ?? data ?? [];
      setRows(content);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load tools.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const openNew = async () => {
    setEditId(null);
    setName('');
    setToolType('END MILL');
    setMaterial('Tungsten Carbide');
    setShape('4 Flute Square');
    setDimension('10mm x 75mm');
    setMachineCompatible('VMC-01, VMC-02');
    setDiameter(10);
    setFluteLength(25);
    setOverallLength(75);
    setHolderType('BT40 ER32');
    setToolLifeCount(500);
    setToolLifeUnit('PIECES');
    setCurrentUsage(120);
    setSupplierCode('SUP-0001');
    setUnitCost(850);
    setReorderLevel(5);
    setCurrentStatus('AVAILABLE');
    setStoreCode('STORE-01');
    setActive(true);
    setViewMode('FORM');
    try {
      const { data } = await apiClient.get('/master/tools/next-code');
      setCode(data.code || 'TL-0001');
    } catch {
      setCode(`TL-000${rows.length + 1}`);
    }
  };

  const openEdit = (item: ToolItem) => {
    setEditId(item.id);
    setCode(item.code);
    setName(item.name || '');
    setToolType(item.toolType || 'END MILL');
    setMaterial(item.material || '');
    setShape(item.shape || '');
    setDimension(item.dimension || '');
    setMachineCompatible(item.machineCompatible || '');
    setDiameter(item.diameter || 0);
    setFluteLength(item.fluteLength || 0);
    setOverallLength(item.overallLength || 0);
    setHolderType(item.holderType || '');
    setToolLifeCount(item.toolLifeCount || 500);
    setToolLifeUnit(item.toolLifeUnit || 'PIECES');
    setCurrentUsage(item.currentUsage || 0);
    setSupplierCode(item.supplierCode || '');
    setUnitCost(item.unitCost || 0);
    setReorderLevel(item.reorderLevel || 5);
    setCurrentStatus(item.currentStatus || 'AVAILABLE');
    setStoreCode(item.storeCode || '');
    setActive(item.active ?? true);
    setViewMode('FORM');
  };

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) { toast('Tool Code is required.', 'error'); return; }
    if (!name.trim()) { toast('Tool Name is required.', 'error'); return; }

    setBusy(true);
    try {
      const payload = {
        code,
        name,
        toolType,
        material,
        shape,
        dimension,
        machineCompatible,
        diameter,
        fluteLength,
        overallLength,
        holderType,
        toolLifeCount,
        toolLifeUnit,
        currentUsage,
        supplierCode,
        unitCost,
        reorderLevel,
        currentStatus,
        storeCode,
        active,
      };

      if (editId) {
        await apiClient.put(`/master/tools/${editId}`, payload);
        toast('Tool updated successfully.');
      } else {
        await apiClient.post('/master/tools', payload);
        toast('Tool created successfully.');
      }
      setViewMode('LIST');
      loadAll();
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to save tool.'), 'error');
    }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/master/tools/${deleteTarget.id}`);
      toast('Tool deleted.');
      setDeleteTarget(null);
      loadAll();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const filteredRows = rows.filter(r => {
    if (statusFilter && r.currentStatus !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.code && r.code.toLowerCase().includes(q)) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.toolType && r.toolType.toLowerCase().includes(q)) ||
      (r.material && r.material.toLowerCase().includes(q))
    );
  });

  const getLifePct = (r: ToolItem) => {
    if (!r.toolLifeCount || r.toolLifeCount <= 0) return 24;
    return Math.min(100, Math.round(((r.currentUsage ?? 0) / r.toolLifeCount) * 100));
  };

  const getLifeBarColor = (pct: number) => pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#166534';

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'AVAILABLE': return <span style={{ fontWeight: 700, color: '#166534', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Available</span>;
      case 'IN_USE': return <span style={{ fontWeight: 700, color: '#1e40af', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>In Use</span>;
      case 'WORN_OUT': return <span style={{ fontWeight: 700, color: '#991b1b', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Worn Out</span>;
      case 'UNDER_MAINTENANCE': return <span style={{ fontWeight: 700, color: '#854d0e', backgroundColor: '#fef9c3', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Maintenance</span>;
      default: return <span style={{ fontWeight: 700, color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{st}</span>;
    }
  };

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
            <h1>{viewMode === 'LIST' ? 'Tools Master' : editId ? 'Edit Tool' : 'New Tool'}</h1>
            <p>Master -&gt; Assets -&gt; Tools Master. Cutting tools, inserts & consumable tooling inventory.</p>
          </div>
        </div>

        <div>
          {viewMode === 'LIST' ? (
            <button type="button" className="btn btn-primary" onClick={openNew}>
              + Add Tool
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-primary" onClick={() => save()} disabled={busy}>
                {busy ? 'Saving...' : 'Save Tool'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setViewMode('LIST')}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'LIST' ? (
        <div className="panel">
          <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="text"
                className="in"
                placeholder="Search Code, Name, Material..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '280px' }}
              />
              <select className="in" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '180px' }}>
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="WORN_OUT">Worn Out</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              </select>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{filteredRows.length} records</span>
            </div>
          </div>

          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="num">S.No</th>
                  <th>TOOL CODE</th>
                  <th>TOOL NAME</th>
                  <th>TYPE</th>
                  <th>MATERIAL</th>
                  <th>DIAMETER (MM)</th>
                  <th>TOOL LIFE USAGE</th>
                  <th>UNIT COST (₹)</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="empty">Loading tools...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={10} className="empty">No tools found.</td></tr>
                ) : (
                  filteredRows.map((r, idx) => {
                    const pct = getLifePct(r);
                    return (
                      <tr key={r.id}>
                        <td className="num mut">{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{r.code}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td>{r.toolType || 'END MILL'}</td>
                        <td>{r.material || 'Tungsten Carbide'}</td>
                        <td className="num">{r.diameter || '10'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: getLifeBarColor(pct) }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', minWidth: '32px' }}>{pct}%</span>
                          </div>
                        </td>
                        <td className="num" style={{ fontWeight: 700, color: '#0284c7' }}>₹{r.unitCost || '850'}</td>
                        <td>{getStatusBadge(r.currentStatus)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" className="ibtn" title="Edit" onClick={() => openEdit(r)}>
                              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                            </button>
                            <button type="button" className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}>
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

          <div className="pager" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Showing 1–{filteredRows.length} of {filteredRows.length}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button type="button" className="btn btn-sm" disabled>&lt;</button>
              <button type="button" className="btn btn-sm btn-primary">1</button>
              <button type="button" className="btn btn-sm" disabled>&gt;</button>
            </div>
          </div>
        </div>
      ) : (
        /* FORM VIEW INPUT PAGE */
        <form onSubmit={save}>
          <div className="sec-head">
            <div className="sec-title">
              <span className="material-symbols-rounded">build</span>
              <span>Tool Specifications & Inventory Control</span>
            </div>
          </div>

          <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <label className="fld">
                <span>TOOL CODE *</span>
                <input className="in" type="text" readOnly value={code} style={{ backgroundColor: '#f8fafc', fontWeight: 600 }} />
              </label>

              <label className="fld">
                <span>TOOL NAME *</span>
                <input className="in" type="text" required placeholder="Carbide End Mill 10mm" value={name} onChange={e => setName(e.target.value)} />
              </label>

              <label className="fld">
                <span>TOOL TYPE *</span>
                <select className="in" value={toolType} onChange={e => setToolType(e.target.value)}>
                  <option value="END MILL">End Mill</option>
                  <option value="DRILL">Drill</option>
                  <option value="REAMER">Reamer</option>
                  <option value="TAP">Tap</option>
                  <option value="Boring Bar">Boring Bar</option>
                  <option value="Turning Tool">Turning Tool</option>
                  <option value="Grooving Tool">Grooving Tool</option>
                  <option value="Insert">Insert</option>
                </select>
              </label>

              <label className="fld">
                <span>MATERIAL</span>
                <input className="in" type="text" placeholder="Tungsten Carbide" value={material} onChange={e => setMaterial(e.target.value)} />
              </label>

              <label className="fld">
                <span>SHAPE / SPEC</span>
                <input className="in" type="text" placeholder="4 Flute Square" value={shape} onChange={e => setShape(e.target.value)} />
              </label>

              <label className="fld">
                <span>DIMENSION</span>
                <input className="in" type="text" placeholder="10mm x 75mm" value={dimension} onChange={e => setDimension(e.target.value)} />
              </label>

              <label className="fld">
                <span>MACHINE COMPATIBLE</span>
                <input className="in" type="text" placeholder="VMC-01, VMC-02" value={machineCompatible} onChange={e => setMachineCompatible(e.target.value)} />
              </label>

              <label className="fld">
                <span>DIAMETER (MM)</span>
                <input className="in" type="number" step="0.01" value={diameter} onChange={e => setDiameter(parseFloat(e.target.value))} />
              </label>

              <label className="fld">
                <span>FLUTE LENGTH (MM)</span>
                <input className="in" type="number" step="0.01" value={fluteLength} onChange={e => setFluteLength(parseFloat(e.target.value))} />
              </label>

              <label className="fld">
                <span>OVERALL LENGTH (MM)</span>
                <input className="in" type="number" step="0.01" value={overallLength} onChange={e => setOverallLength(parseFloat(e.target.value))} />
              </label>

              <label className="fld">
                <span>HOLDER TYPE</span>
                <input className="in" type="text" placeholder="BT40 ER32" value={holderType} onChange={e => setHolderType(e.target.value)} />
              </label>

              <label className="fld">
                <span>TOOL LIFE COUNT</span>
                <input className="in" type="number" value={toolLifeCount} onChange={e => setToolLifeCount(parseInt(e.target.value))} />
              </label>

              <label className="fld">
                <span>TOOL LIFE UNIT</span>
                <select className="in" value={toolLifeUnit} onChange={e => setToolLifeUnit(e.target.value)}>
                  <option value="PIECES">Pieces</option>
                  <option value="HOURS">Hours</option>
                  <option value="SHIFTS">Shifts</option>
                </select>
              </label>

              <label className="fld">
                <span>CURRENT USAGE</span>
                <input className="in" type="number" value={currentUsage} onChange={e => setCurrentUsage(parseInt(e.target.value))} />
              </label>

              <label className="fld">
                <span>SUPPLIER CODE</span>
                <input className="in" type="text" placeholder="SUP-0001" value={supplierCode} onChange={e => setSupplierCode(e.target.value)} />
              </label>

              <label className="fld">
                <span>UNIT COST (₹)</span>
                <input className="in" type="number" step="0.01" value={unitCost} onChange={e => setUnitCost(parseFloat(e.target.value))} />
              </label>

              <label className="fld">
                <span>REORDER LEVEL</span>
                <input className="in" type="number" value={reorderLevel} onChange={e => setReorderLevel(parseInt(e.target.value))} />
              </label>

              <label className="fld">
                <span>STORE CODE</span>
                <input className="in" type="text" placeholder="STORE-01" value={storeCode} onChange={e => setStoreCode(e.target.value)} />
              </label>

              <label className="fld">
                <span>STATUS</span>
                <select className="in" value={currentStatus} onChange={e => setCurrentStatus(e.target.value)}>
                  <option value="AVAILABLE">Available</option>
                  <option value="IN_USE">In Use</option>
                  <option value="WORN_OUT">Worn Out</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="SCRAPPED">Scrapped</option>
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="fld chk">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                <span>Active</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving...' : 'Save Tool'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setViewMode('LIST')}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.code ?? ''}`}
        body="Permanently delete this tool?"
        okLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={del}
      />
    </>
  );
}
