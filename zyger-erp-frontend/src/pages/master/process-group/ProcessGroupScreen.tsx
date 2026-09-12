import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';

interface ProcessGroupItem {
  id: number;
  code: string;
  name: string; // WORK FLOW NAME
  processFlow?: string; // e.g. "ready -> bustop -> travy"
  steps?: string[];
  remarks?: string;
  active: boolean;
}

interface ProcessMasterItem {
  id: number;
  code: string;
  name: string;
}

export default function ProcessGroupScreen() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');

  // List data state
  const [rows, setRows] = useState<ProcessGroupItem[]>([]);
  const [availableProcesses, setAvailableProcesses] = useState<ProcessMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProcessGroupItem | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [editId, setEditId] = useState<number | null>(null);
  const [code, setCode] = useState('PG-0005');
  const [workFlowName, setWorkFlowName] = useState('');
  const [steps, setSteps] = useState<string[]>(['', '', '']);
  const [remarks, setRemarks] = useState('');
  const [active, setActive] = useState(true);
  const [openSec, setOpenSec] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pgRes, pRes] = await Promise.all([
        apiClient.get('/master/process-groups'),
        apiClient.get('/master/processes').catch(() => ({ data: [] })),
      ]);
      const content = pgRes.data?.content ?? pgRes.data ?? [];
      setRows(content);
      const procList = pRes.data?.content ?? pRes.data ?? [];
      setAvailableProcesses(procList);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load process groups.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const openNew = async () => {
    setEditId(null);
    setWorkFlowName('');
    setSteps(['', '', '']);
    setRemarks('');
    setActive(true);
    setViewMode('FORM');
    try {
      const { data } = await apiClient.get('/master/process-groups/next-code');
      setCode(data.code || 'PG-0005');
    } catch {
      setCode(`PG-000${rows.length + 1}`);
    }
  };

  const openEdit = (item: ProcessGroupItem) => {
    setEditId(item.id);
    setCode(item.code);
    setWorkFlowName(item.name || '');
    setRemarks(item.remarks || '');
    setActive(item.active ?? true);

    if (item.steps && item.steps.length > 0) {
      setSteps(item.steps);
    } else if (item.processFlow) {
      setSteps(item.processFlow.split(' -> '));
    } else {
      setSteps(['', '', '']);
    }
    setViewMode('FORM');
  };

  const updateStep = (index: number, val: string) => {
    const updated = [...steps];
    updated[index] = val;
    setSteps(updated);
  };

  const addStep = () => {
    setSteps(s => [...s, '']);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(s => s.filter((_, i) => i !== index));
  };

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) { toast('Group Code is required.', 'error'); return; }
    if (!workFlowName.trim()) { toast('Work Flow Name is required.', 'error'); return; }

    const validSteps = steps.map(s => s.trim()).filter(Boolean);
    const processFlowString = validSteps.length > 0 ? validSteps.join(' -> ') : '—';

    setBusy(true);
    try {
      const payload = {
        code,
        name: workFlowName,
        processFlow: processFlowString,
        steps: validSteps,
        remarks,
        active,
      };

      if (editId) {
        await apiClient.put(`/master/process-groups/${editId}`, payload);
        toast('Process Group updated successfully.');
      } else {
        await apiClient.post('/master/process-groups', payload);
        toast('Process Group created successfully.');
      }
      setViewMode('LIST');
      loadAll();
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to save Process Group.'), 'error');
    }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/master/process-groups/${deleteTarget.id}`);
      toast('Process Group deleted.');
      setDeleteTarget(null);
      loadAll();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const filteredRows = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.code && r.code.toLowerCase().includes(q)) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.processFlow && r.processFlow.toLowerCase().includes(q)) ||
      (r.remarks && r.remarks.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div className="pg-head pg-head-flex" style={{ marginBottom: '20px' }}>
        <div className="pg-head-text" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (viewMode === 'FORM') setViewMode('LIST');
              else window.history.back();
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
          <div>
            <h1>{viewMode === 'LIST' ? 'Process Group List' : editId ? 'Edit Process Group' : 'New Process Group'}</h1>
            <p>Master -&gt; Process Group</p>
          </div>
        </div>

        {viewMode === 'FORM' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-primary" onClick={() => save()} disabled={busy}>
              {busy ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setViewMode('LIST')}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {viewMode === 'LIST' ? (
        <>
          {/* Top Search Bar */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="in"
              placeholder="Search Process Group..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', height: '44px', background: '#fff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '0 16px' }}
            />
          </div>

          <div className="panel">
            <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input
                  type="text"
                  className="in"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '260px' }}
                />
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{filteredRows.length} records</span>
              </div>
              <button type="button" className="btn btn-primary" onClick={openNew}>
                Create Process Group
              </button>
            </div>

            <div className="twrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="num">S.No</th>
                    <th>GROUP CODE</th>
                    <th>WORK FLOW NAME</th>
                    <th>PROCESS FLOW</th>
                    <th>REMARKS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="empty">Loading process groups...</td></tr>
                  ) : filteredRows.length === 0 ? (
                    <tr><td colSpan={6} className="empty">No process groups found.</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={r.id}>
                        <td className="num mut">{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{r.code}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ color: '#1e3a8a', fontWeight: 500 }}>{r.processFlow || '—'}</td>
                        <td style={{ color: '#64748b' }}>{r.remarks || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
        </>
      ) : (
        /* FORM VIEW INPUT PAGE */
        <form onSubmit={save}>
          <div className="sec-head" onClick={() => setOpenSec(s => !s)} style={{ cursor: 'pointer' }}>
            <div className="sec-title">
              <span className="material-symbols-rounded">settings</span>
              <span>Process Group Information</span>
            </div>
            <span className="material-symbols-rounded sec-toggle">{openSec ? 'expand_less' : 'expand_more'}</span>
          </div>

          {openSec && (
            <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '24px' }}>
              <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
                <label className="fld">
                  <span>GROUP CODE *</span>
                  <input className="in" type="text" readOnly value={code} style={{ backgroundColor: '#f8fafc', fontWeight: 600 }} />
                </label>

                <label className="fld">
                  <span>WORK FLOW NAME *</span>
                  <input
                    className="in"
                    type="text"
                    required
                    placeholder="Work Flow Name"
                    value={workFlowName}
                    onChange={e => setWorkFlowName(e.target.value)}
                  />
                </label>
              </div>

              {/* Dynamic Process Flow Step Builder Row */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.5px' }}>
                  PROCESS FLOW BUILDER
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', padding: '8px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    START
                  </div>

                  {steps.map((stepVal, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="material-symbols-rounded" style={{ color: '#64748b' }}>arrow_forward</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                          className="in"
                          style={{ width: '220px', height: '42px' }}
                          value={stepVal}
                          onChange={e => updateStep(idx, e.target.value)}
                        >
                          <option value="">Select Process...</option>
                          {availableProcesses.length > 0 ? (
                            availableProcesses.map(p => (
                              <option key={p.id} value={p.name}>{p.name} ({p.code})</option>
                            ))
                          ) : (
                            <>
                              <option value="Cutting">Cutting</option>
                              <option value="Machining">Machining</option>
                              <option value="Grinding">Grinding</option>
                              <option value="Heat Treatment">Heat Treatment</option>
                              <option value="Quality Inspection">Quality Inspection</option>
                              <option value="Packing">Packing</option>
                            </>
                          )}
                        </select>
                        {steps.length > 1 && (
                          <button
                            type="button"
                            className="ibtn danger"
                            title="Remove step"
                            onClick={() => removeStep(idx)}
                            style={{ height: '36px', width: '36px' }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>close</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={addStep}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: '40px', marginLeft: '8px' }}
                  >
                    <span className="material-symbols-rounded">add</span> Add Step
                  </button>
                </div>
              </div>

              <div className="fgrid" style={{ gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
                <label className="fld">
                  <span>REMARKS</span>
                  <textarea
                    className="in"
                    rows={3}
                    placeholder="Enter remarks..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="fld chk">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : 'Save Process Group'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setViewMode('LIST')}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.code ?? ''}`}
        body="Permanently delete this process group?"
        okLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={del}
      />
    </>
  );
}
