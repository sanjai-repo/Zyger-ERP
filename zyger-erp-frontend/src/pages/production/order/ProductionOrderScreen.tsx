import { useEffect, useState } from 'react';
import { productionApi } from '../../../services/production-api';
import type { ProductionOrder } from '../../../types/production/production.types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import StatusBadge from '../../../components/common/StatusBadge';

const SC: Record<string, { color: string; bg: string }> = {
  OPEN: { color: '#2563eb', bg: '#dbeafe' },
  APPROVED: { color: '#16a34a', bg: '#d4edda' },
  RELEASED: { color: '#f59e0b', bg: '#fef3c7' },
  IN_PROGRESS: { color: '#7c3aed', bg: '#ede9fe' },
  COMPLETED: { color: '#22c55e', bg: '#d4edda' },
  CLOSED: { color: '#6b7280', bg: '#f3f4f6' },
  CANCELLED: { color: '#991b1b', bg: '#fde2e2' },
  DRAFT: { color: '#888', bg: '#e9ecef' },
  PENDING: { color: '#888', bg: '#e9ecef' },
  CONFIRMED: { color: '#16a34a', bg: '#d4edda' },
};

export default function ProductionOrderScreen({ initialSearch }: { initialSearch?: string }) {
  const { toast } = useToast();
  const { can } = useAuth();
  const [rows, setRows] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch ?? '');
  const [actionTarget, setActionTarget] = useState<{ id: number; action: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [orderTypes, setOrderTypes] = useState<string[]>(['SINGLE']);

  const load = async () => {
    setLoading(true);
    try {
      const page = await productionApi.listOrders({ page: 0, size: 1000 });
      setRows(Array.isArray(page) ? page : (page.content ?? []));
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const action = async () => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      const data = (await productionApi.orderAction(actionTarget.id, actionTarget.action)) as { success?: boolean; errors?: string[] };
      if (data.success === false) {
        toast(data.errors?.join('\n') || 'Action failed.', 'error');
      } else {
        toast(`Production Order ${actionTarget.action}.`);
        load();
      }
    } catch (e) { toast(getApiErrorMessage(e, 'Action failed.'), 'error'); }
    setBusy(false);
    setActionTarget(null);
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.workOrderNumber ?? r.woNumber ?? '').toLowerCase().includes(q) ||
      (r.partCode ?? '').toLowerCase().includes(q) ||
      (r.partDescription ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="pg-head"><h1>Production Orders</h1><p>Work Order based production planning - list, release &amp; tracking</p></div>

      <div className="panel">
        <div className="panel-tbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="in" style={{ width: 320 }} placeholder="Search order, part..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="in" style={{ width: 140 }} value={orderTypes[0]} onChange={(e) => setOrderTypes([e.target.value])}>
              <option value="SINGLE">SINGLE</option>
            </select>
          </div>
          <button className="btn" onClick={() => load()}>Refresh</button>
        </div>

        {loading ? <div className="empty">Loading...</div> : filtered.length === 0 ? (
          <div className="empty">No production orders found.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Order No</th><th>Type</th><th>Part</th><th>Description</th><th>Planned</th><th>Completed</th><th>Due</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.workOrderNumber ?? r.woNumber}</b></td>
                  <td>{r.orderType ?? '-'}</td>
                  <td>{r.partCode ?? '-'}</td>
                  <td>{r.partDescription ?? '-'}</td>
                  <td>{r.plannedQuantity ?? '-'}</td>
                  <td style={{ color: '#22c55e', fontWeight: 600 }}>{r.completedQuantity ?? r.producedQty ?? '-'}</td>
                  <td>{r.dueDate ? String(r.dueDate).slice(0, 10) : '-'}</td>
                  <td><StatusBadge status={r.status} variant={SC} /></td>
                  <td style={{ position: 'relative' }}>
                    <button className="ibtn" title="Actions" onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === r.id ? null : r.id); }}>
                      <span className="material-symbols-rounded">more_vert</span>
                    </button>
                    {openActionMenu === r.id && (
                      <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                        {(r.status === 'OPEN' || r.status === 'DRAFT') && can('production', 'Approve') && (
                          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setActionTarget({ id: r.id, action: 'approve' }); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#16a34a' }}>check_circle</span> Approve</button>
                        )}
                        {(r.status === 'APPROVED' || r.status === 'CONFIRMED') && (
                          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setActionTarget({ id: r.id, action: 'release' }); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#2563eb' }}>play_arrow</span> Release</button>
                        )}
                        {(r.status === 'DRAFT' || r.status === 'SUBMITTED' || r.status === 'APPROVED') && can('production', 'Cancel') && (
                          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--blue-bg)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => { setOpenActionMenu(null); setActionTarget({ id: r.id, action: 'cancel' }); }}><span className="material-symbols-rounded" style={{ fontSize: 18, color: '#ef4444' }}>cancel</span> Cancel</button>
                        )}
                        <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left' }} onClick={() => { setOpenActionMenu(null); toast('Detail navigation is handled in the Work Order screen.'); }}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>info</span> Details</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmActionModal
        open={Boolean(actionTarget)}
        title={`${actionTarget?.action ?? ''} Production Order`}
        body={`Confirm to '${actionTarget?.action ?? ''}' this production order?`}
        okLabel={actionTarget?.action ?? 'Confirm'}
        danger={actionTarget?.action === 'cancel'}
        busy={busy}
        onClose={() => setActionTarget(null)}
        onConfirm={action}
      />
    </>
  );
}