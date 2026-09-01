import { useState, useEffect } from 'react';

export interface ReworkReasonItem {
  reasonCode: string;
  reasonDescription: string;
  quantity: number;
  targetProcessCode: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  targetReworkQty: number;
  reworkReasons: ReworkReasonItem[];
  availableProcesses?: string[];
  onSave: (reworks: ReworkReasonItem[]) => void;
}

const COMMON_REWORK = [
  { code: 'OVER_SIZE', desc: 'Over-size / Needs Re-machining' },
  { code: 'DEBURR_REQ', desc: 'Deburring Required' },
  { code: 'POLISH_REQ', desc: 'Polishing / Surface Clean-up' },
  { code: 'THREAD_CHASE', desc: 'Thread Chasing Required' },
];

export default function ReworkReasonModal({ open, onClose, targetReworkQty, reworkReasons, availableProcesses = [], onSave }: Props) {
  const [list, setList] = useState<ReworkReasonItem[]>(reworkReasons || []);

  useEffect(() => {
    if (open) setList(reworkReasons || []);
  }, [open, reworkReasons]);

  if (!open) return null;

  const currentTotal = list.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const handleAdd = () => {
    setList((prev) => [
      ...prev,
      {
        reasonCode: 'OVER_SIZE',
        reasonDescription: 'Over-size / Needs Re-machining',
        quantity: Math.max(0, targetReworkQty - currentTotal),
        targetProcessCode: availableProcesses[0] || 'REWORK_OP',
      },
    ]);
  };

  const handleRemove = (index: number) => {
    setList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof ReworkReasonItem, val: unknown) => {
    setList((prev) => {
      const copy = [...prev];
      if (field === 'reasonCode') {
        const found = COMMON_REWORK.find((r) => r.code === val);
        copy[index].reasonCode = String(val);
        if (found) copy[index].reasonDescription = found.desc;
      } else {
        (copy[index] as unknown as Record<string, unknown>)[field] = val;
      }
      return copy;
    });
  };

  const handleSave = () => {
    onSave(list);
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div className="modal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 680, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Rework Reason & Target Process Allocation</h3>
          <button className="ibtn" onClick={onClose}><span className="material-symbols-rounded">close</span></button>
        </div>

        <div style={{ padding: '8px 12px', background: '#e0f2fe', color: '#0369a1', borderRadius: 6, fontSize: 13, marginBottom: 16, border: '1px solid #bae6fd' }}>
          Target Rework Qty: <b>{targetReworkQty}</b> | Allocated Total: <b>{currentTotal}</b>
        </div>

        <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Rework Reason</th>
                <th style={{ padding: 8 }}>Description</th>
                <th style={{ padding: 8 }}>Qty</th>
                <th style={{ padding: 8 }}>Target Rework Process</th>
                <th style={{ padding: 8, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>No rework reasons added. Click + Add Rework Reason.</td></tr>
              ) : list.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>
                    <select className="in" value={r.reasonCode} onChange={(e) => handleChange(i, 'reasonCode', e.target.value)}>
                      {COMMON_REWORK.map((cr) => (
                        <option key={cr.code} value={cr.code}>{cr.code}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 8 }}>
                    <input className="in" value={r.reasonDescription} onChange={(e) => handleChange(i, 'reasonDescription', e.target.value)} />
                  </td>
                  <td style={{ padding: 8 }}>
                    <input className="in" type="number" style={{ width: 70 }} value={r.quantity} onChange={(e) => handleChange(i, 'quantity', Number(e.target.value))} />
                  </td>
                  <td style={{ padding: 8 }}>
                    {availableProcesses.length > 0 ? (
                      <select className="in" value={r.targetProcessCode} onChange={(e) => handleChange(i, 'targetProcessCode', e.target.value)}>
                        {availableProcesses.map((proc) => (
                          <option key={proc} value={proc}>{proc}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="in" placeholder="Target Process" value={r.targetProcessCode} onChange={(e) => handleChange(i, 'targetProcessCode', e.target.value)} />
                    )}
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
          <button className="btn btn-sm" onClick={handleAdd}>+ Add Rework Reason</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-sm btn-p" onClick={handleSave}>Confirm Allocation</button>
          </div>
        </div>
      </div>
    </div>
  );
}
