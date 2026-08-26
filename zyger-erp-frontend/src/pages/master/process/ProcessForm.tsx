import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { defaultForm } from './processTypes';

interface Resource { id: number; resourceName: string; resourceCode: string; resourceType: string; }

const PROCESS_TYPES = ['', 'Insource', 'Outsource'];

interface Props {
  processId: number | null;
  viewOnly?: boolean;
  onBack: () => void;
  onSaved?: (id: number) => void;
}

export default function ProcessForm({ processId, viewOnly = false, onBack, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>(defaultForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);

  const fetchNextCode = async () => {
    try {
      const { data } = await apiClient.get('/master/processes/next-code');
      setForm((c) => ({ ...c, code: data.code }));
    } catch { /* code field will remain empty if fetch fails */ }
  };

  useEffect(() => {
    apiClient.get('/master/resources').then(r => setResources(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    if (!processId) {
      setForm(defaultForm());
      setEditId(null);
      fetchNextCode();
      return;
    }
    setLoading(true);
    apiClient.get('/master/processes').then(({ data }) => {
      const list = data.content ?? data ?? [];
      const found = list.find((r: { id: number }) => r.id === processId);
      if (found) {
        setForm(found);
        setEditId(found.id);
      } else {
        toast('Process not found.', 'error');
        onBack();
      }
    }).catch((e) => {
      toast(getApiErrorMessage(e, 'Failed to load process.'), 'error');
      onBack();
    }).finally(() => setLoading(false));
  }, [processId]);

  const updateForm = (key: string, value: unknown) => setForm((c) => ({ ...c, [key]: value }));

  const onResourceChange = (resourceId: string) => {
    const id = resourceId ? Number(resourceId) : null;
    if (id) {
      const res = resources.find((r) => r.id === id);
      if (res) {
        setForm((c) => ({ ...c, requiredResource: id, resourceName: res.resourceName, resourceType: res.resourceType }));
        return;
      }
    }
    setForm((c) => ({ ...c, requiredResource: null, resourceName: '', resourceType: '' }));
  };

  const save = async () => {
    if (!String(form.code ?? '').trim()) { toast('Process Code is required.', 'error'); return; }
    if (!String(form.name ?? '').trim()) { toast('Process Name is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/master/processes/${editId}`, form);
        toast('Process updated.');
        onSaved?.(editId);
      } else {
        const { data } = await apiClient.post('/master/processes', form);
        toast('Process created.');
        onSaved?.(data.id);
      }
      onBack();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span> Loading process...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pg-head">
        <h1>{viewOnly ? 'View' : editId ? 'Edit' : 'Add'} Process</h1>
        <p>{viewOnly ? 'View process details' : editId ? 'Update process information' : 'Create a new process'}</p>
      </div>

      <div className="panel">
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', paddingRight: '10px' }}>
          <div className="sec-head">
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>settings</span>
            Process Information
          </div>
          <div className="fgrid sec-body">
            <label className="fld">
              <span>Process Code *</span>
              <input className="in" value={String(form.code ?? '')} readOnly={!!editId}
                onChange={(e) => updateForm('code', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>Process Name *</span>
              <input className="in" value={String(form.name ?? '')}
                onChange={(e) => updateForm('name', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>Process Type</span>
              <select className="in" value={String(form.processType ?? '')}
                onChange={(e) => updateForm('processType', e.target.value)} disabled={viewOnly}>
                <option value="">— Select —</option>
                {PROCESS_TYPES.filter(Boolean).map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
            <label className="fld">
              <span>Required Resource</span>
              <select className="in" value={String(form.requiredResource ?? '')}
                onChange={(e) => onResourceChange(e.target.value)} disabled={viewOnly}>
                <option value="">— None —</option>
                {resources.map((r) => <option key={r.id} value={r.id}>{r.resourceCode} — {r.resourceName} ({r.resourceType})</option>)}
              </select>
            </label>
            <label className="fld">
              <span>Resource Name</span>
              <input className="in" value={String(form.resourceName ?? '')} disabled />
            </label>
            <label className="fld">
              <span>Resource Type</span>
              <input className="in" value={String(form.resourceType ?? '')} disabled />
            </label>
            <label className="fld">
              <span>Description</span>
              <input className="in" value={String(form.description ?? '')}
                onChange={(e) => updateForm('description', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>Cycle Time (min)</span>
              <input className="in" type="number" step="0.01" value={String(form.cycleTime ?? '')}
                onChange={(e) => updateForm('cycleTime', e.target.value ? Number(e.target.value) : null)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>Setup Time (min)</span>
              <input className="in" type="number" step="0.01" value={String(form.setupTime ?? '')}
                onChange={(e) => updateForm('setupTime', e.target.value ? Number(e.target.value) : null)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>Unit Rate</span>
              <input className="in" type="number" step="0.01" value={String(form.unitRate ?? '')}
                onChange={(e) => updateForm('unitRate', e.target.value ? Number(e.target.value) : null)} disabled={viewOnly} />
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.machineRequired)}
                onChange={(e) => updateForm('machineRequired', e.target.checked)} disabled={viewOnly} />
              <span>Machine Required</span>
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.inspection)}
                onChange={(e) => updateForm('inspection', e.target.checked)} disabled={viewOnly} />
              <span>Inspection Required</span>
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.active)}
                onChange={(e) => updateForm('active', e.target.checked)} disabled={viewOnly} />
              <span>Active</span>
            </label>
          </div>
        </div>

        <div className="actbar">
          <button className="btn" onClick={onBack}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
          {!viewOnly && (
            <button className="btn btn-p" onClick={save} disabled={busy}>
              <span className="material-symbols-rounded">save</span> {editId ? 'Update' : 'Create'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
