import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

export interface InstrumentItem {
  id: number;
  code: string;
  name: string;
  instrumentType?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  rangeMin?: number;
  rangeMax?: number;
  accuracy?: string;
  leastCount?: number;
  calibrationDue?: string;
  calibrationCycle?: string;
  currentStatus: string;
  storeCode?: string;
  active: boolean;
}

export default function InstrumentScreen() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [rows, setRows] = useState<InstrumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstrumentItem | null>(null);

  // Form State
  const [code, setCode] = useState('INS-0001');
  const [name, setName] = useState('');
  const [instrumentType, setInstrumentType] = useState('Vernier Caliper');
  const [manufacturer, setManufacturer] = useState('Mitutoyo');
  const [model, setModel] = useState('CD-6"CSX');
  const [serialNumber, setSerialNumber] = useState('');
  const [rangeMin, setRangeMin] = useState<number>(0);
  const [rangeMax, setRangeMax] = useState<number>(150);
  const [accuracy, setAccuracy] = useState('±0.02 mm');
  const [leastCount, setLeastCount] = useState<number>(0.01);
  const [calibrationDue, setCalibrationDue] = useState('');
  const [calibrationCycle, setCalibrationCycle] = useState('YEARLY');
  const [currentStatus, setCurrentStatus] = useState('AVAILABLE');
  const [storeCode, setStoreCode] = useState('STORE-01');
  const [active, setActive] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/master/instruments');
      const content = data?.content ?? data ?? [];
      setRows(content);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load instruments.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const openNew = async () => {
    setEditId(null);
    setName('');
    setInstrumentType('Vernier Caliper');
    setManufacturer('Mitutoyo');
    setModel('CD-6"CSX');
    setSerialNumber('');
    setRangeMin(0);
    setRangeMax(150);
    setAccuracy('±0.02 mm');
    setLeastCount(0.01);
    setCalibrationDue('');
    setCalibrationCycle('YEARLY');
    setCurrentStatus('AVAILABLE');
    setStoreCode('STORE-01');
    setActive(true);
    setViewMode('FORM');
    try {
      const { data } = await apiClient.get('/master/instruments/next-code');
      setCode(data.code || 'INS-0001');
    } catch {
      setCode(`INS-000${rows.length + 1}`);
    }
  };

  const openEdit = (item: InstrumentItem) => {
    setEditId(item.id);
    setCode(item.code);
    setName(item.name || '');
    setInstrumentType(item.instrumentType || 'Vernier Caliper');
    setManufacturer(item.manufacturer || '');
    setModel(item.model || '');
    setSerialNumber(item.serialNumber || '');
    setRangeMin(item.rangeMin || 0);
    setRangeMax(item.rangeMax || 0);
    setAccuracy(item.accuracy || '');
    setLeastCount(item.leastCount || 0);
    setCalibrationDue(item.calibrationDue || '');
    setCalibrationCycle(item.calibrationCycle || 'YEARLY');
    setCurrentStatus(item.currentStatus || 'AVAILABLE');
    setStoreCode(item.storeCode || '');
    setActive(item.active ?? true);
    setViewMode('FORM');
  };

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) { toast('Instrument Code is required.', 'error'); return; }
    if (!name.trim()) { toast('Instrument Name is required.', 'error'); return; }

    setBusy(true);
    try {
      const payload = {
        code,
        name,
        instrumentType,
        manufacturer,
        model,
        serialNumber,
        rangeMin,
        rangeMax,
        accuracy,
        leastCount,
        calibrationDue,
        calibrationCycle,
        currentStatus,
        storeCode,
        active,
      };

      if (editId) {
        await apiClient.put(`/master/instruments/${editId}`, payload);
        toast('Instrument updated successfully.');
      } else {
        await apiClient.post('/master/instruments', payload);
        toast('Instrument created successfully.');
      }
      setViewMode('LIST');
      loadAll();
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to save instrument.'), 'error');
    }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/master/instruments/${deleteTarget.id}`);
      toast('Instrument deleted.');
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
      (r.instrumentType && r.instrumentType.toLowerCase().includes(q)) ||
      (r.manufacturer && r.manufacturer.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'AVAILABLE': return <span style={{ fontWeight: 700, color: '#166534', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Available</span>;
      case 'IN_USE': return <span style={{ fontWeight: 700, color: '#1e40af', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>In Use</span>;
      case 'UNDER_CALIBRATION': return <span style={{ fontWeight: 700, color: '#854d0e', backgroundColor: '#fef9c3', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Under Calibration</span>;
      case 'DAMAGED': return <span style={{ fontWeight: 700, color: '#991b1b', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Damaged</span>;
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
            <h1>{viewMode === 'LIST' ? 'Instrument Master' : editId ? 'Edit Instrument' : 'New Instrument'}</h1>
            <p>Master -&gt; Assets -&gt; Instrument Master. Measuring instruments & calibration tracking.</p>
          </div>
        </div>

        <div>
          {viewMode === 'LIST' ? (
            <button type="button" className="btn btn-primary" onClick={openNew}>
              + Add Instrument
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-primary" onClick={() => save()} disabled={busy}>
                {busy ? 'Saving...' : 'Save Instrument'}
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
                placeholder="Search Code, Name, Manufacturer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '280px' }}
              />
              <select className="in" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '180px' }}>
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="UNDER_CALIBRATION">Under Calibration</option>
                <option value="DAMAGED">Damaged</option>
              </select>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{filteredRows.length} records</span>
            </div>
          </div>

          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="num">S.No</th>
                  <th>CODE</th>
                  <th>INSTRUMENT NAME</th>
                  <th>TYPE</th>
                  <th>MANUFACTURER</th>
                  <th>SERIAL NO</th>
                  <th>LEAST COUNT</th>
                  <th>CALIBRATION DUE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="empty">Loading instruments...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={10} className="empty">No instruments found.</td></tr>
                ) : (
                  filteredRows.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="num mut">{idx + 1}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{r.code}</td>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td>{r.instrumentType || 'Vernier Caliper'}</td>
                      <td>{r.manufacturer || 'Mitutoyo'}</td>
                      <td>{r.serialNumber || '—'}</td>
                      <td className="num">{r.leastCount || '0.01'}</td>
                      <td style={r.calibrationDue && new Date(r.calibrationDue) < new Date() ? { color: '#dc2626', fontWeight: 700 } : {}}>
                        {r.calibrationDue || '2026-12-31'}
                      </td>
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
                  ))
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
              <span className="material-symbols-rounded">science</span>
              <span>Instrument Specifications & Calibration Details</span>
            </div>
          </div>

          <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderRadius: '0 0 12px 12px', padding: '24px', marginBottom: '24px' }}>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <label className="fld">
                <span>INSTRUMENT CODE *</span>
                <input className="in" type="text" readOnly value={code} style={{ backgroundColor: '#f8fafc', fontWeight: 600 }} />
              </label>

              <label className="fld">
                <span>INSTRUMENT NAME *</span>
                <input className="in" type="text" required placeholder="Digital Vernier Caliper" value={name} onChange={e => setName(e.target.value)} />
              </label>

              <label className="fld">
                <span>INSTRUMENT TYPE *</span>
                <select className="in" value={instrumentType} onChange={e => setInstrumentType(e.target.value)}>
                  <option value="Vernier Caliper">Vernier Caliper</option>
                  <option value="Micrometer">Micrometer</option>
                  <option value="Height Gauge">Height Gauge</option>
                  <option value="Bore Gauge">Bore Gauge</option>
                  <option value="CMM">CMM</option>
                  <option value="Thread Gauge">Thread Gauge</option>
                  <option value="Hardness Tester">Hardness Tester</option>
                  <option value="Surface Plate">Surface Plate</option>
                </select>
              </label>

              <label className="fld">
                <span>MANUFACTURER</span>
                <input className="in" type="text" placeholder="Mitutoyo" value={manufacturer} onChange={e => setManufacturer(e.target.value)} />
              </label>

              <label className="fld">
                <span>MODEL</span>
                <input className="in" type="text" placeholder='CD-6"CSX' value={model} onChange={e => setModel(e.target.value)} />
              </label>

              <label className="fld">
                <span>SERIAL NUMBER</span>
                <input className="in" type="text" placeholder="SN-884920" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} />
              </label>

              <label className="fld">
                <span>RANGE MIN</span>
                <input className="in" type="number" step="0.0001" value={rangeMin} onChange={e => setRangeMin(parseFloat(e.target.value))} />
              </label>

              <label className="fld">
                <span>RANGE MAX</span>
                <input className="in" type="number" step="0.0001" value={rangeMax} onChange={e => setRangeMax(parseFloat(e.target.value))} />
              </label>

              <label className="fld">
                <span>ACCURACY</span>
                <input className="in" type="text" placeholder="±0.02 mm" value={accuracy} onChange={e => setAccuracy(e.target.value)} />
              </label>

              <label className="fld">
                <span>LEAST COUNT</span>
                <input className="in" type="number" step="0.0001" value={leastCount} onChange={e => setLeastCount(parseFloat(e.target.value))} />
              </label>

              <label className="fld">
                <span>CALIBRATION DUE DATE</span>
                <input className="in" type="date" value={calibrationDue} onChange={e => setCalibrationDue(e.target.value)} />
              </label>

              <label className="fld">
                <span>CALIBRATION CYCLE</span>
                <select className="in" value={calibrationCycle} onChange={e => setCalibrationCycle(e.target.value)}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half Yearly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
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
                  <option value="UNDER_CALIBRATION">Under Calibration</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="UNDER_REPAIR">Under Repair</option>
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
                {busy ? 'Saving...' : 'Save Instrument'}
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
        body="Permanently delete this instrument?"
        okLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={del}
      />
    </>
  );
}
