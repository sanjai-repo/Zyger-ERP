import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import AuditHistoryDrawer from '../../../components/common/AuditHistoryDrawer';
import { exportSimpleCsv } from '../../../utils/csvExport';
import type { Party } from './supplierTypes';
import { tryParseJson } from './supplierTypes';

const PAGE_SIZE = 20;

interface Props {
  onAdd: () => void;
  onEdit: (id: number) => void;
  onView?: (id: number) => void;
  onLedger?: (code: string) => void;
}

export default function SupplierList({ onAdd, onEdit, onView, onLedger }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Party[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEntityId, setAuditEntityId] = useState<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE), kind: 'SUPPLIER' });
      if (search) params.set('search', search);
      const { data } = await apiClient.get(`/master/parties?${params}`);
      const content = (data.content ?? data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        contacts: typeof r.contactsJson === 'string' ? tryParseJson(r.contactsJson) : (r.contacts ?? []),
        addresses: typeof r.addressesJson === 'string' ? tryParseJson(r.addressesJson) : (r.addresses ?? []),
        bankAccounts: typeof r.bankAccountsJson === 'string' ? tryParseJson(r.bankAccountsJson) : (r.bankAccounts ?? []),
        documents: typeof r.documentsJson === 'string' ? tryParseJson(r.documentsJson) : (r.documents ?? []),
        itemsSupplied: typeof r.itemsSuppliedJson === 'string' ? tryParseJson(r.itemsSuppliedJson) : ((r as any).itemsSupplied ?? []),
      }));
      setRows(content as unknown as Party[]);
      setTotal(data.totalElements ?? (Array.isArray(data) ? data.length : content.length));
    } catch (e) {
      toast(getApiErrorMessage(e, 'Load failed.'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, search]);

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/master/parties/${deleteTarget.id}`);
      toast('Supplier deleted.');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
    }
    setBusy(false);
  };

  const filteredRows = rows.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.code && r.code.toLowerCase().includes(s)) ||
      (r.name && r.name.toLowerCase().includes(s)) ||
      ((r as any).supplierGroup && (r as any).supplierGroup.toLowerCase().includes(s)) ||
      (r.gstin && r.gstin.toLowerCase().includes(s))
    );
  });

  return (
    <>
      <div className="pg-head pg-head-flex" style={{ marginBottom: '20px' }}>
        <div className="pg-head-text">
          <h1>Supplier</h1>
          <p>Existing supplier list with create option</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input
              className="in"
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              style={{ width: '280px' }}
            />
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{total || filteredRows.length} records</span>
            <button className="btn btn-sm" onClick={() => exportSimpleCsv(filteredRows as unknown as Record<string, unknown>[], 'suppliers')} title="Export CSV">
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>download</span> CSV
            </button>
            <button className="btn btn-sm" onClick={() => { setAuditEntityId(undefined); setAuditOpen(true); }} title="Audit History">
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>history</span>
            </button>
          </div>

          <button type="button" className="btn btn-primary" onClick={onAdd}>
            Create Supplier
          </button>
        </div>

        <div className="twrap">
          {loading ? (
            <div className="empty">Loading suppliers...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>SUPPLIER CODE</th>
                  <th>SUPPLIER NAME</th>
                  <th>GROUP</th>
                  <th>TYPE</th>
                  <th>CITY / STATE</th>
                  <th>CONTACT PERSON</th>
                  <th>MOBILE</th>
                  <th>EMAIL</th>
                  <th>GSTIN</th>
                  <th>PAYMENT TERMS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={13} className="empty">No suppliers found.</td></tr>
                ) : (
                  filteredRows.map((r, idx) => (
                    <tr key={r.id}>
                      <td>{page * PAGE_SIZE + idx + 1}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{r.code}</td>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td>{[(r as any).supplierGroup, (r as any).supplier_group, r.supplierType].find(s => Boolean(s && String(s).trim())) || 'Raw Material'}</td>
                      <td>{r.supplierType || 'Raw Material Supplier'}</td>
                      <td>
                        {[r.addresses?.[0]?.city, (r as any).city].find(s => Boolean(s && String(s).trim())) || '—'}
                        {[r.addresses?.[0]?.state, (r as any).state].find(s => Boolean(s && String(s).trim())) ? `, ${[r.addresses?.[0]?.state, (r as any).state].find(s => Boolean(s && String(s).trim()))}` : ''}
                      </td>
                      <td>
                        {[(r as any).contactPerson, (r as any).contactPersonName, r.contacts?.find(c => c.primaryContact)?.contactPersonName, r.contacts?.[0]?.contactPersonName].find(s => Boolean(s && String(s).trim())) || '—'}
                      </td>
                      <td>{[(r as any).mobile, (r as any).phone, r.contacts?.find(c => c.primaryContact)?.mobileNumber, r.contacts?.[0]?.mobileNumber].find(s => Boolean(s && String(s).trim())) || '—'}</td>
                      <td style={{ color: '#0284c7' }}>{[(r as any).email, r.contacts?.find(c => c.primaryContact)?.email, r.contacts?.[0]?.email].find(s => Boolean(s && String(s).trim())) || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{r.gstin || '—'}</td>
                      <td>{r.paymentTerms || '30 Days'}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: r.active !== false ? '#166534' : '#dc2626' }}>
                          {r.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button type="button" className="ibtn" title="View" onClick={() => onView?.(r.id)}>
                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>visibility</span>
                          </button>
                          <button type="button" className="ibtn" title="Edit" onClick={() => onEdit(r.id)}>
                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                          </button>
                          <button type="button" className="ibtn" title="Ledger" onClick={() => onLedger?.(r.code)}>
                            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>account_balance</span>
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
          )}
        </div>

        <div className="pager" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Showing 1–{filteredRows.length} of {total || filteredRows.length}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>&lt;</button>
            <button type="button" className="btn btn-sm btn-primary">{page + 1}</button>
            <button type="button" className="btn btn-sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>&gt;</button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.code ?? ''}`}
        body="Permanently delete this supplier?"
        okLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={del}
      />

      <AuditHistoryDrawer open={auditOpen} entityType="Supplier" entityId={auditEntityId} onClose={() => setAuditOpen(false)} />
    </>
  );
}
