import { useState, useEffect } from 'react';

export interface RejectionReasonItem {
  reasonCode: string;
  reasonDescription: string;
  quantity: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  targetRejectedQty: number;
  rejectionReasons: RejectionReasonItem[];
  onSave: (rejections: RejectionReasonItem[]) => void;
}

const COMMON_REASONS = [
  { code: 'DIM_OUT', desc: 'Dimension Out of Tolerance' },
  { code: 'SURF_DEFECT', desc: 'Surface Finish / Scratches' },
  { code: 'TOOL_BURR', desc: 'Burr / Tool Chatter Marks' },
  { code: 'MAT_DEFECT', desc: 'Raw Material Defect / Blowholes' },
  { code: 'SET_ERROR', desc: 'Machine Setup Error' },
];

export default function RejectionReasonModal({ open, onClose, targetRejectedQty, rejectionReasons, onSave }: Props) {
  const [list, setList] = useState<RejectionReasonItem[]>(rejectionReasons || []);

  useEffect(() => {
    if (open) setList(rejectionReasons || []);
  }, [open, rejectionReasons]);

  if (!open) return null;

  const currentTotal = list.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const qtyBalanced = currentTotal === targetRejectedQty;

  const handleAdd = () => {
    setList((prev) => [...prev, { reasonCode: 'DIM_OUT', reasonDescription: 'Dimension Out of Tolerance', quantity: Math.max(0, targetRejectedQty - currentTotal) }]);
  };

  const handleRemove = (index: number) => {
    setList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof RejectionReasonItem, val: unknown) => {
    setList((prev) => {
      const copy = [...prev];
      if (field === 'reasonCode') {
        const found = COMMON_REASONS.find((r) => r.code === val);
        copy[index].reasonCode = String(val);
        if (found) copy[index].reasonDescription = found.desc;
      } else {
        (copy[index] as unknown as Record<string, unknown>)[field] = val;
      }
      return copy;
    });
  };

  const handleSave = () => {
    if (!qtyBalanced && list.length > 0) {
      alert(`Reason-wise rejection total (${currentTotal}) must equal row Rejected Qty (${targetRejectedQty}).`);
      return;
    }
    onSave(list);
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div className="modal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 640, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Reason-wise Rejection Allocation</h3>
          <button className="ibtn" onClick={onClose}><span className="material-symbols-rounded">close</span></button>
        </div>

        <div style={{ padding: '8px 12px', background: qtyBalanced ? '#d4edda' : '#f8d7da', color: qtyBalanced ? '#155724' : '#721c24', borderRadius: 6, fontSize: 13, marginBottom: 16, border: `1px solid ${qtyBalanced ? '#c3e6cb' : '#f5c6cb'}` }}>
          Target Rejected Qty: <b>{targetRejectedQty}</b> | Allocated Total: <b>{currentTotal}</b> {qtyBalanced ? '✓ OK' : `(Difference: ${targetRejectedQty - currentTotal})`}
        </div>

        <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Rejection Reason</th>
                <th style={{ padding: 8 }}>Description</th>
                <th style={{ padding: 8 }}>Qty</th>
                <th style={{ padding: 8, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>No rejection reasons added. Click + Add Reason.</td></tr>
              ) : list.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>
                    <select className="in" value={r.reasonCode} onChange={(e) => handleChange(i, 'reasonCode', e.target.value)}>
                      {COMMON_REASONS.map((cr) => (
                        <option key={cr.code} value={cr.code}>{cr.code} - {cr.desc}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 8 }}>
                    <input className="in" value={r.reasonDescription} onChange={(e) => handleChange(i, 'reasonDescription', e.target.value)} />
                  </td>
                  <td style={{ padding: 8 }}>
                    <input className="in" type="number" style={{ width: 80 }} value={r.quantity} onChange={(e) => handleChange(i, 'quantity', Number(e.target.value))} />
                  </td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <button className="ibtn danger" onClick={() => handleRemove(i)}><span className="material-symbols-rounded" style={{ fontSize: 18 }}>delete</span></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-sm" onClick={handleAdd}>+ Add Reason</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-sm btn-p" onClick={handleSave} disabled={!qtyBalanced && list.length > 0}>Confirm Allocation</button>
          </div>
        </div>
      </div>
    </div>
  );
}
