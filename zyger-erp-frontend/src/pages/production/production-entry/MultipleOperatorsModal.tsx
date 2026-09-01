import { useState } from 'react';

export interface OperatorAssignment {
  operatorCode: string;
  operatorName: string;
  isPrimary: boolean;
  hoursWorked: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  operators: OperatorAssignment[];
  onSave: (operators: OperatorAssignment[]) => void;
  masterOperators?: Array<{ id: number; code: string; name?: string }>;
}

export default function MultipleOperatorsModal({ open, onClose, operators, onSave, masterOperators = [] }: Props) {
  const [list, setList] = useState<OperatorAssignment[]>(operators || []);

  if (!open) return null;

  const handleAdd = () => {
    setList((prev) => [...prev, { operatorCode: '', operatorName: '', isPrimary: prev.length === 0, hoursWorked: 0 }]);
  };

  const handleRemove = (index: number) => {
    setList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof OperatorAssignment, val: unknown) => {
    setList((prev) => {
      const copy = [...prev];
      if (field === 'isPrimary' && val === true) {
        copy.forEach((o, i) => { o.isPrimary = i === index; });
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
      <div className="modal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 640, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Multiple Operators Assignment (MO)</h3>
          <button className="ibtn" onClick={onClose}><span className="material-symbols-rounded">close</span></button>
        </div>

        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Assign multiple operators who performed this operation, mark the primary operator, and record hours.</p>

        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Operator</th>
                <th style={{ padding: 8 }}>Primary</th>
                <th style={{ padding: 8 }}>Hours</th>
                <th style={{ padding: 8, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>No operators added. Click + Add Operator.</td></tr>
              ) : list.map((op, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 8 }}>
                    {masterOperators.length > 0 ? (
                      <select
                        className="in"
                        value={op.operatorCode}
                        onChange={(e) => {
                          const selected = masterOperators.find((m) => m.code === e.target.value);
                          handleChange(i, 'operatorCode', e.target.value);
                          if (selected) handleChange(i, 'operatorName', selected.name || selected.code);
                        }}
                      >
                        <option value="">Select Operator...</option>
                        {masterOperators.map((m) => (
                          <option key={m.id} value={m.code}>{m.code} {m.name ? `- ${m.name}` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="in"
                        placeholder="Operator Code / Name"
                        value={op.operatorCode}
                        onChange={(e) => {
                          handleChange(i, 'operatorCode', e.target.value);
                          handleChange(i, 'operatorName', e.target.value);
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: 8, textAlign: 'center' }}>
                    <input
                      type="radio"
                      name="primaryOp"
                      checked={op.isPrimary}
                      onChange={() => handleChange(i, 'isPrimary', true)}
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <input
                      className="in"
                      type="number"
                      step="0.5"
                      style={{ width: 80 }}
                      value={op.hoursWorked}
                      onChange={(e) => handleChange(i, 'hoursWorked', Number(e.target.value))}
                    />
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
          <button className="btn btn-sm" onClick={handleAdd}>+ Add Operator</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-sm btn-p" onClick={handleSave}>Save Operators</button>
          </div>
        </div>
      </div>
    </div>
  );
}
