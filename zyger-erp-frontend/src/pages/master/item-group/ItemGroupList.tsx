import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import { itemTypeLabel } from './itemGroupTypes';
import type { ItemGroup } from './itemGroupTypes';

const PAGE_SIZE = 20;

interface Props {
  onAdd: () => void;
  onEdit: (id: number) => void;
  onView?: (id: number) => void;
}

export default function ItemGroupList({ onAdd, onEdit }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ItemGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ItemGroup | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      params.set('activeOnly', 'false');
      if (search) params.set('search', search);
      const { data } = await apiClient.get(`/master/item-groups?${params}`);
      const content = data?.content ?? data ?? [];
      setRows(content);
      setTotal(data?.totalElements ?? (Array.isArray(data) ? data.length : content.length));
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
      const { data } = await apiClient.delete(`/master/item-groups/${deleteTarget.id}`);
      if (data?.deactivated) toast(data.message || 'Item Group is in use; it was deactivated.', 'success');
      else toast('Item Group deleted.');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast(getApiErrorMessage(e, 'Delete failed.'), 'error');
      setDeleteTarget(null);
      load();
    }
    setBusy(false);
  };

  const filteredRows = rows
    .filter(r => statusFilter === 'ALL' || (statusFilter === 'ACTIVE') === Boolean(r.active))
    .filter(r => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (r.code && r.code.toLowerCase().includes(s)) ||
        (r.name && r.name.toLowerCase().includes(s)) ||
        (r.itemType && r.itemType.toLowerCase().includes(s))
      );
    })
    .sort((a, b) => {
      if (Boolean(a.active) !== Boolean(b.active)) return Boolean(a.active) ? -1 : 1;
      const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return tb - ta;
    });

  return (
    <>
      <div className="pg-head pg-head-flex" style={{ marginBottom: '20px' }}>
        <div className="pg-head-text" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => window.history.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-rounded">arrow_back</span> Back
          </button>
          <div>
            <h1>Item Group Master</h1>
            <p>Maintain item groups for Purchasable, Manufacturing and Customer Supplied items.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          Create Item Group
        </button>
      </div>

      <div className="panel">
        <div className="panel-h" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
          <input
            className="in"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            style={{ width: '300px' }}
          />
          <select
            className="in"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(0); }}
            style={{ width: '180px' }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>{total} records</span>
        </div>

        <div className="twrap">
          {loading ? (
            <div className="empty">Loading item groups...</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>GROUP ID</th>
                  <th>GROUP NAME</th>
                  <th>TYPE</th>
                  <th>DESCRIPTION</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      No item groups found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{r.code}</td>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 600 }}>
                          {itemTypeLabel(r.itemType)}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>{r.description || '-'}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: r.active ? '#166534' : '#dc2626' }}>
                          {r.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button type="button" className="ibtn" title="Edit" onClick={() => onEdit(r.id)}>
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
          )}
        </div>

        <div className="pager" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing 1–{filteredRows.length} of {total}
          </span>
          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                &lt;
              </button>
              <button type="button" className="btn btn-sm btn-primary">
                {page + 1}
              </button>
              <button type="button" className="btn btn-sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.code ?? ''}`}
        body="Permanently delete this item group?"
        okLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleteTarget(null)}
        onConfirm={del}
      />
    </>
  );
}
