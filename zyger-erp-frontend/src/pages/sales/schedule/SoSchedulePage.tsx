import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import axiosClient from '../../../api/axiosClient';
import StatusBadge from '../../../components/common/StatusBadge';
import { exportSimpleCsv } from '../../../utils/csvExport';

interface SoScheduleRow {
  id: number;
  soNo: string;
  customer: string;
  customerCode?: string;
  itemCode: string;
  itemDescription?: string;
  uom?: string;
  orderedQty: number;
  dispatchedQty: number;
  pendingQty: number;
  scheduleDate: string;
  status: string;
  priority?: string;
  remarks?: string;
}

export default function SoSchedulePage() {
  useAuth();

  const [schedules, setSchedules] = useState<SoScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/v1/sales/sales-order?size=200');
      const docs = res.data?.content || res.data || [];
      const list: SoScheduleRow[] = [];
      if (Array.isArray(docs)) {
        docs.forEach((so: any) => {
          const lines = Array.isArray(so.lines) ? so.lines : [];
          lines.forEach((l: any, i: number) => {
            const ordered = Number(l.orderQty || l.qty || 0);
            const dispatched = Number(l.deliveredQty || 0);
            list.push({
              id: l.id || i + 1,
              soNo: so.docNo || '',
              customer: so.party || so.customer || so.toParty || '',
              customerCode: so.customerCode || so.partyCode || '',
              itemCode: l.itemCode || '',
              itemDescription: l.description || l.itemName || '',
              uom: l.uom || '',
              orderedQty: ordered,
              dispatchedQty: dispatched,
              pendingQty: Number(l.pendingQty || Math.max(0, ordered - dispatched)),
              scheduleDate: l.deliveryDate || so.deliveryDate || so.date || '',
              status: l.status || so.status || 'DRAFT',
              priority: l.priority || 'NORMAL',
              remarks: l.remarks,
            });
          });
        });
      }
      setSchedules(list);
    } catch (err) {
      console.error('Failed to load SO schedules', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = schedules.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.soNo.toLowerCase().includes(q) ||
      s.customer.toLowerCase().includes(q) ||
      s.itemCode.toLowerCase().includes(q) ||
      (s.itemDescription || '').toLowerCase().includes(q)
    );
  });

  const totalOrdered = filtered.reduce((a, s) => a + s.orderedQty, 0);
  const totalDispatched = filtered.reduce((a, s) => a + s.dispatchedQty, 0);
  const totalPending = filtered.reduce((a, s) => a + s.pendingQty, 0);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sales Order Schedule</h2>
        <div className="flex gap-2 items-center">
          <input
            className="input input-sm w-60"
            placeholder="Search SO / Customer / Item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-sm" onClick={() => exportSimpleCsv(filtered.map(s => ({
            'SO No': s.soNo, 'Customer': s.customer, 'Item Code': s.itemCode,
            'Description': s.itemDescription, 'UOM': s.uom, 'Ordered Qty': s.orderedQty,
            'Dispatched Qty': s.dispatchedQty, 'Pending Qty': s.pendingQty,
            'Schedule Date': s.scheduleDate, 'Status': s.status, 'Priority': s.priority,
          })), 'so-schedule')}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 text-sm text-gray-600">
        <span>Lines: <strong>{filtered.length}</strong></span>
        <span>Ordered: <strong>{totalOrdered}</strong></span>
        <span>Dispatched: <strong>{totalDispatched}</strong></span>
        <span>Pending: <strong className="text-orange-600">{totalPending}</strong></span>
      </div>

      <div className="overflow-auto border rounded">
        <table className="table table-sm w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="num">S.No</th>
              <th>SO No</th>
              <th>Customer</th>
              <th>Item Code</th>
              <th>Description</th>
              <th className="text-right">Ordered</th>
              <th className="text-right">Dispatched</th>
              <th className="text-right">Pending</th>
              <th>Schedule Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">No schedule data found</td></tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="num mut">{i + 1}</td>
                  <td className="font-medium">{s.soNo}</td>
                  <td>{s.customer}</td>
                  <td>{s.itemCode}</td>
                  <td>{s.itemDescription}</td>
                  <td className="text-right">{s.orderedQty}</td>
                  <td className="text-right text-green-600">{s.dispatchedQty}</td>
                  <td className="text-right text-orange-600 font-medium">{s.pendingQty}</td>
                  <td>{s.scheduleDate}</td>
                  <td><StatusBadge status={s.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
