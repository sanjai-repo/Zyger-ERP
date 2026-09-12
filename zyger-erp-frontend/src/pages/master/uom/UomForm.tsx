import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { defaultForm } from './uomTypes';

interface Props {
  uomId: number | null;
  viewOnly: boolean;
  onBack: () => void;
  onSaved?: (id: number) => void;
}

const SectionHeader = ({ title, icon }: { title: string; icon?: string }) => (
  <div className="sec-head">
    {icon && <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>{icon}</span>}
    {title}
  </div>
);

export default function UomForm({ uomId, viewOnly = false, onBack, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>(defaultForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const openNew = async () => {
    setForm(defaultForm());
    setEditId(null);
    try {
      const { data } = await apiClient.get('/master/uoms/next-code');
      setForm((c) => ({ ...c, code: data.code }));
    } catch { /* code field will remain empty if fetch fails */ }
  };

  useEffect(() => {
    if (!uomId) {
      setForm(defaultForm());
      setEditId(null);
      openNew();
      return;
    }
    setLoading(true);
    apiClient.get(`/master/uoms/${uomId}`).then(({ data }) => {
      if (data) {
        setForm({ ...defaultForm(), ...data });
        setEditId(data.id);
      } else {
        toast('UOM not found.', 'error');
        onBack();
      }
    }).catch((e) => {
      toast(getApiErrorMessage(e, 'Failed to load UOM.'), 'error');
      onBack();
    }).finally(() => setLoading(false));
  }, [uomId]);

  const updateForm = (key: string, value: unknown) => setForm((c) => ({ ...c, [key]: value }));

  const save = async () => {
    if (!String(form.code ?? '').trim()) { toast('UOM Code is required.', 'error'); return; }
    if (!String(form.name ?? '').trim()) { toast('UOM Name is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/master/uoms/${editId}`, form);
        toast('UOM updated.');
        onSaved?.(editId);
      } else {
        const { data } = await apiClient.post('/master/uoms', form);
        toast('UOM created.');
        onSaved?.(data.id);
      }
      onBack();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const inp = (label: string, key: string, opts?: { type?: string; required?: boolean; placeholder?: string; readOnly?: boolean }) => (
    <label className="fld">
      <span>{label}{opts?.required ? ' *' : ''}</span>
      <input className="in" type={opts?.type ?? 'text'} placeholder={opts?.placeholder ?? ''}
        value={String((form as Record<string, unknown>)[key] ?? '')}
        onChange={(e) => updateForm(key, opts?.type === 'checkbox' ? e.target.checked : e.target.value)}
        disabled={viewOnly} readOnly={opts?.readOnly} required={opts?.required} />
    </label>
  );

  const chk = (label: string, key: string) => (
    <label className="fld chk">
      <input type="checkbox" checked={Boolean((form as Record<string, unknown>)[key])}
        onChange={(e) => updateForm(key, e.target.checked)} disabled={viewOnly} />
      <span>{label}</span>
    </label>
  );

  if (loading) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span> Loading UOM...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pg-head">
        <h1>{viewOnly ? 'View' : editId ? 'Edit' : 'Add'} UOM</h1>
        <p>{viewOnly ? 'View UOM details' : editId ? 'Update UOM information' : 'Create a new UOM'}</p>
      </div>

      <div className="panel">
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', paddingRight: '10px' }}>
          <SectionHeader title="UOM Details" icon="straighten" />
          <div className="fgrid sec-body">
            {inp('UOM Code', 'code', { required: true, placeholder: 'Auto-generated', readOnly: true })}
            {inp('UOM Name', 'name', { required: true })}
            <label className="fld full">
              <span>Description</span>
              <textarea className="in" rows={3} value={String(form.description ?? '')}
                onChange={(e) => updateForm('description', e.target.value)} disabled={viewOnly} />
            </label>
            {chk('Active', 'active')}
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
