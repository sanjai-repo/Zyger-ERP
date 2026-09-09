import { useEffect, useState } from 'react';
import apiClient from '../../api/axiosClient';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';

interface Party {
  id: number; kind: string; code: string; name: string;
  contactPerson?: string; phone?: string; email?: string;
  address?: string; gstNumber?: string; state?: string; country?: string;
  paymentTerms?: string; active: boolean;
}

const PAGE_SIZE = 20;

export default function PartyMasterScreen() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Party[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (kindFilter) params.set('kind', kindFilter);
      const { data } = await apiClient.get(`/master/parties?${params}`);
      setRows(data.content);
      setTotal(data.totalElements);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, search, kindFilter]);

  const save = async () => {
    if (!String(form.code ?? '').trim()) { toast('Code is required.', 'error'); return; }
    if (!String(form.name ?? '').trim()) { toast('Name is required.', 'error'); return; }
    if (!form.kind) { toast('Kind is required.', 'error'); return; }
    setBusy(true);
    try {
      if (editId) {
        await apiClient.put(`/master/parties/${editId}`, form);
        toast('Party updated.');
      } else {
        await apiClient.post('/master/parties', form);
        toast('Party created.');
      }
      setForm({}); setEditId(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/master/parties/${deleteTarget.id}`);
      toast('Party deleted.');
      setDeleteTarget(null); load();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  return (
    <>
      <div className="pg-head">
        <h1>Party Master</h1>
        <p>Manage suppliers and customers</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2><span className="material-symbols-rounded">add</span> {editId ? 'Edit' : 'Add'} Party</h2>
        </div>
        <div className="fgrid">
          <label className="fld">
            <span>Kind *</span>
            <select className="in" value={String(form.kind ?? '')} onChange={(e) => setForm((c) => ({ ...c, kind: e.target.value }))}>
              <option value="">Select...</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </label>
          <label className="fld">
            <span>Code *</span>
            <input className="in" value={String(form.code ?? '')} onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))} />
          </label>
          <label className="fld">
            <span>Name *</span>
            <input className="in" value={String(form.name ?? '')} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </label>
          <label className="fld">
            <span>Contact Person</span>
            <input className="in" value={String(form.contactPerson ?? '')} onChange={(e) => setForm((c) => ({ ...c, contactPerson: e.target.value }))} />
          </label>
          <label className="fld">
            <span>Phone</span>
            <input className="in" value={String(form.phone ?? '')} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} />
          </label>
          <label className="fld">
            <span>Email</span>
            <input className="in" type="email" value={String(form.email ?? '')} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </label>
          <label className="fld span2">
            <span>Address</span>
            <input className="in" value={String(form.address ?? '')} onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))} />
          </label>
          <label className="fld">
            <span>City</span>
            <input className="in" value={String(form.city ?? '')} onChange={(e) => setForm((c) => ({ ...c, city: e.target.value }))} />
          </label>
          <label className="fld">
            <span>State</span>
            <input className="in" value={String(form.state ?? '')} onChange={(e) => setForm((c) => ({ ...c, state: e.target.value }))} />
          </label>
          <label className="fld">
            <span>Pincode</span>
            <input className="in" value={String(form.pincode ?? '')} onChange={(e) => setForm((c) => ({ ...c, pincode: e.target.value }))} />
          </label>
          <label className="fld">
            <span>GST Number</span>
            <input className="in" value={String(form.gstNumber ?? '')} onChange={(e) => setForm((c) => ({ ...c, gstNumber: e.target.value }))} />
          </label>
          <label className="fld">
            <span>Country</span>
            <input className="in" value={String(form.country ?? '')} onChange={(e) => setForm((c) => ({ ...c, country: e.target.value }))} />
          </label>
          <label className="fld">
            <span>Payment Terms</span>
            <input className="in" value={String(form.paymentTerms ?? '')} onChange={(e) => setForm((c) => ({ ...c, paymentTerms: e.target.value }))} />
          </label>
          {String(form.kind ?? '') === 'SUPPLIER' && (
            <label className="fld">
              <span>Approved Vendor Status</span>
              <select className="in" value={String(form.approvedVendorStatus ?? 'APPROVED')} onChange={(e) => setForm((c) => ({ ...c, approvedVendorStatus: e.target.value }))}>
                <option value="APPROVED">APPROVED</option>
                <option value="CONDITIONAL">CONDITIONAL</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </label>
          )}
          <label className="fld span2">
            <span>Billing Address</span>
            <textarea className="in" rows={2} value={String(form.billingAddress ?? '')} onChange={(e) => setForm((c) => ({ ...c, billingAddress: e.target.value }))} />
          </label>
          <label className="fld span2">
            <span>Shipping Address</span>
            <textarea className="in" rows={2} value={String(form.shippingAddress ?? '')} onChange={(e) => setForm((c) => ({ ...c, shippingAddress: e.target.value }))} />
          </label>
        </div>
        <div className="actbar" style={{ justifyContent: 'flex-end' }}>
          {editId && <button className="btn" onClick={() => { setForm({}); setEditId(null); }} disabled={busy}>Cancel</button>}
          <button className="btn btn-p" onClick={save} disabled={busy}>{editId ? 'Update' : 'Create'}</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h" style={{ gap: 12, flexWrap: 'wrap' }}>
          <input className="in" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} style={{ maxWidth: 200 }} />
          <select className="in" value={kindFilter} onChange={(e) => { setKindFilter(e.target.value); setPage(0); }} style={{ maxWidth: 150 }}>
            <option value="">All Kinds</option>
            <option value="SUPPLIER">Suppliers</option>
            <option value="CUSTOMER">Customers</option>
          </select>
          <span style={{ color: '#888', fontSize: 13 }}>{total} records</span>
        </div>
        <div className="twrap">
          {loading ? (
            <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th className="num">S.No</th><th>Kind</th><th>Code</th><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Active</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9}><div className="empty"><span className="material-symbols-rounded">description</span> No records.</div></td></tr>
                ) : rows.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="num mut">{page * PAGE_SIZE + idx + 1}</td>
                    <td><span className={`badge ${r.kind === 'SUPPLIER' ? 'badge-blue' : 'badge-green'}`}>{r.kind}</span></td>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>{r.contactPerson ?? ''}</td>
                    <td>{r.phone ?? ''}</td>
                    <td>{r.email ?? ''}</td>
                    <td>{r.active ? 'Yes' : 'No'}</td>
                    <td>
                      <button className="ibtn" title="Edit" onClick={() => { setForm(r as unknown as Record<string, unknown>); setEditId(r.id); }}>
                        <span className="material-symbols-rounded">edit</span>
                      </button>
                      <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(r)}>
                        <span className="material-symbols-rounded">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {total > PAGE_SIZE && (
          <div className="actbar" style={{ justifyContent: 'center', gap: 8 }}>
            <button className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ color: '#666' }}>Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
            <button className="btn" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.code ?? ''}`} body="Permanently delete this party?" okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
    </>
  );
}
