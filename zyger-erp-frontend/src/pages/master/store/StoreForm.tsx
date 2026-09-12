import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { defaultForm, STORE_TYPES } from './storeTypes';

interface Props {
  storeId: number | null;
  viewOnly?: boolean;
  onBack: () => void;
  onSaved?: (id: number) => void;
}

export default function StoreForm({ storeId, viewOnly = false, onBack, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>(defaultForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNextCode = async () => {
    try {
      const { data } = await apiClient.get('/master/stores/next-code');
      setForm((c) => ({ ...c, code: data.code }));
    } catch { /* code field will remain empty if fetch fails */ }
  };

  useEffect(() => {
    if (!storeId) {
      setForm(defaultForm());
      setEditId(null);
      fetchNextCode();
      return;
    }
    setLoading(true);
    apiClient.get(`/master/stores/${storeId}`).then(({ data }) => {
      setForm(data);
      setEditId(data.id);
    }).catch((e) => {
      toast(getApiErrorMessage(e, 'Failed to load store.'), 'error');
      onBack();
    }).finally(() => setLoading(false));
  }, [storeId]);

  const updateForm = (key: string, value: unknown) => setForm((c) => ({ ...c, [key]: value }));

  const save = async () => {
    if (!String(form.code ?? '').trim()) { toast('Store Code is required.', 'error'); return; }
    if (!String(form.name ?? '').trim()) { toast('Store Name is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/master/stores/${editId}`, form);
        toast('Store updated.');
        onSaved?.(editId);
      } else {
        const { data } = await apiClient.post('/master/stores', form);
        toast('Store created.');
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
          <span className="material-symbols-rounded">hourglass_empty</span> Loading store...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pg-head">
        <h1>{viewOnly ? 'View' : editId ? 'Edit' : 'Add'} Store</h1>
        <p>{viewOnly ? 'View store details' : editId ? 'Update store information' : 'Create a new store'}</p>
      </div>

      <div className="panel">
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', paddingRight: '10px' }}>
          <div className="sec-head">
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>warehouse</span>
            Store Information
          </div>
          <div className="fgrid sec-body">
            <label className="fld">
              <span>Store Code *</span>
              <input className="in" value={String(form.code ?? '')} readOnly={!!editId}
                onChange={(e) => updateForm('code', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>Store Name *</span>
              <input className="in" value={String(form.name ?? '')}
                onChange={(e) => updateForm('name', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>Store Type</span>
              <select className="in" value={String(form.storeType ?? '')}
                onChange={(e) => updateForm('storeType', e.target.value)} disabled={viewOnly}>
                <option value="">-- Select --</option>
                {STORE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="fld">
              <span>Location</span>
              <input className="in" value={String(form.locationRef ?? '')}
                onChange={(e) => updateForm('locationRef', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld">
              <span>Capacity</span>
              <input className="in" type="number" step="0.01" value={String(form.capacity ?? '')}
                onChange={(e) => updateForm('capacity', e.target.value ? Number(e.target.value) : null)} disabled={viewOnly} />
            </label>
            <label className="fld full">
              <span>Description</span>
              <textarea className="in" rows={3} value={String(form.description ?? '')}
                onChange={(e) => updateForm('description', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld full">
              <span>Remarks</span>
              <textarea className="in" rows={2} value={String(form.remarks ?? '')}
                onChange={(e) => updateForm('remarks', e.target.value)} disabled={viewOnly} />
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.active)}
                onChange={(e) => updateForm('active', e.target.checked)} disabled={viewOnly} />
              <span>Active</span>
            </label>
          </div>

          <div className="sec-head">
            <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>flag</span>
            Flags
          </div>
          <div className="fgrid sec-body">
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.isQcHold)}
                onChange={(e) => updateForm('isQcHold', e.target.checked)} disabled={viewOnly} />
              <span>QC Hold</span>
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.isWip)}
                onChange={(e) => updateForm('isWip', e.target.checked)} disabled={viewOnly} />
              <span>WIP</span>
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.isFinished)}
                onChange={(e) => updateForm('isFinished', e.target.checked)} disabled={viewOnly} />
              <span>Finished</span>
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.isRaw)}
                onChange={(e) => updateForm('isRaw', e.target.checked)} disabled={viewOnly} />
              <span>Raw</span>
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.isScrap)}
                onChange={(e) => updateForm('isScrap', e.target.checked)} disabled={viewOnly} />
              <span>Scrap</span>
            </label>
            <label className="fld chk">
              <input type="checkbox" checked={Boolean(form.isDispatch)}
                onChange={(e) => updateForm('isDispatch', e.target.checked)} disabled={viewOnly} />
              <span>Dispatch</span>
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
