import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import { defaultForm, ITEM_GROUP_TYPE_OPTIONS } from './itemGroupTypes';

interface Props {
  itemGroupId: number | null;
  viewOnly?: boolean;
  onBack: () => void;
  onSaved?: (id: number) => void;
}

export default function ItemGroupForm({ itemGroupId, viewOnly = false, onBack, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>(defaultForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openSec, setOpenSec] = useState(true);

  const openNew = async () => {
    setForm(defaultForm());
    setEditId(null);
    try {
      const { data } = await apiClient.get('/master/item-groups/next-code');
      setForm((c) => ({ ...c, code: data.code }));
    } catch {
      setForm((c) => ({ ...c, code: `IG-${Date.now().toString(36).toUpperCase()}` }));
    }
  };

  useEffect(() => {
    if (!itemGroupId) {
      setForm(defaultForm());
      setEditId(null);
      openNew();
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ page: '0', size: '9999', activeOnly: 'false' });
    apiClient.get(`/master/item-groups?${params}`).then(({ data }) => {
      const list = data.content ?? data ?? [];
      const found = list.find((r: { id: number }) => r.id === itemGroupId);
      if (found) {
        setForm({ ...defaultForm(), ...found });
        setEditId(found.id);
      } else {
        toast('Item Group not found.', 'error');
        onBack();
      }
    }).catch((e) => {
      toast(getApiErrorMessage(e, 'Failed to load Item Group.'), 'error');
      onBack();
    }).finally(() => setLoading(false));
  }, [itemGroupId]);

  const updateForm = (key: string, value: unknown) => setForm((c) => ({ ...c, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!String(form.code ?? '').trim()) { toast('Group ID is required.', 'error'); return; }
    if (!String(form.name ?? '').trim()) { toast('Group Name is required.', 'error'); return; }
    if (!String(form.itemType ?? '').trim()) { toast('Item Group Type is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/master/item-groups/${editId}`, form);
        toast('Item Group updated.');
        onSaved?.(editId);
      } else {
        const { data } = await apiClient.post('/master/item-groups', form);
        toast('Item Group created.');
        onSaved?.(data.id ?? editId ?? 0);
      }
      onBack();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="empty">Loading Item Group...</div>
      </div>
    );
  }

  return (
    <>
      <div className="pg-head pg-head-flex" style={{ marginBottom: '20px' }}>
        <div className="pg-head-text" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-rounded">arrow_back</span> Cancel
          </button>
          <div>
            <h1>{editId ? 'Edit Item Group' : 'Create Item Group'}</h1>
            <p>Master -&gt; Inventory -&gt; Item Group Master</p>
          </div>
        </div>
      </div>

      <form onSubmit={save}>
        {/* Section Header */}
        <div className="sec-head" onClick={() => setOpenSec(s => !s)} style={{ cursor: 'pointer' }}>
          <div className="sec-title">
            <span className="material-symbols-rounded">category</span>
            <span>Item Group Information</span>
          </div>
          <span className="material-symbols-rounded sec-toggle">{openSec ? 'expand_less' : 'expand_more'}</span>
        </div>

        {openSec && (
          <div className="sec-body" style={{ background: '#fff', border: '1px solid #bfdbfe', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '24px' }}>
            <div className="fgrid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <label className="fld">
                <span>GROUP ID</span>
                <input
                  className="in"
                  type="text"
                  readOnly
                  value={String(form.code ?? '')}
                  style={{ backgroundColor: '#f8fafc', fontWeight: 600 }}
                />
              </label>

              <label className="fld">
                <span>GROUP NAME *</span>
                <input
                  className="in"
                  type="text"
                  required
                  value={String(form.name ?? '')}
                  onChange={(e) => updateForm('name', e.target.value)}
                  disabled={viewOnly}
                />
              </label>

              <label className="fld">
                <span>ITEM GROUP TYPE *</span>
                <select
                  className="in"
                  required
                  value={String(form.itemType ?? '')}
                  onChange={(e) => updateForm('itemType', e.target.value)}
                  disabled={viewOnly}
                >
                  <option value="">Select Type...</option>
                  {ITEM_GROUP_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="fld">
                <span>DESCRIPTION</span>
                <input
                  className="in"
                  type="text"
                  value={String(form.description ?? '')}
                  onChange={(e) => updateForm('description', e.target.value)}
                  disabled={viewOnly}
                />
              </label>
            </div>

            <div style={{ marginTop: '16px', marginBottom: '20px' }}>
              <label className="fld chk">
                <input
                  type="checkbox"
                  checked={Boolean(form.active ?? true)}
                  onChange={(e) => updateForm('active', e.target.checked)}
                  disabled={viewOnly}
                />
                <span>Active</span>
              </label>
            </div>

            {!viewOnly && (
              <div style={{ marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : 'Save Item Group'}
                </button>
              </div>
            )}
          </div>
        )}
      </form>
    </>
  );
}
