import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

interface SP { id: number; code: string; name: string; uom: string; reorderLevel: number; unitCost: number; itemId?: number; itemCode?: string; }

export default function SparePartMasterPage() {
  const [items, setItems] = useState<SP[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', uom: 'NOS', unitCost: '', itemCode: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await axiosClient.get('/v2/master/spare-parts');
    setItems(r.data as SP[]);
  }

  async function save() {
    if (!form.code && !form.itemCode) return;
    await axiosClient.post('/v2/master/spare-parts', { ...form, unitCost: form.unitCost ? Number(form.unitCost) : 0 });
    setForm({ code: '', name: '', description: '', uom: 'NOS', unitCost: '', itemCode: '' });
    setShowForm(false);
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Spare Parts</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? 'Cancel' : '+ New'}</button>
      </div>

      {showForm && (
        <div style={{ background: '#1e1e2e', border: '1px solid #313244', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <input placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <input placeholder="Inventory Item Code" value={form.itemCode} onChange={e => setForm({ ...form, itemCode: e.target.value })} />
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <input placeholder="UOM" value={form.uom} onChange={e => setForm({ ...form, uom: e.target.value })} />
            <input placeholder="Unit Cost" type="number" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} />
          </div>
          <button onClick={save} className="btn-primary" style={{ marginTop: 12 }}>Save</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #313244', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Code</th><th style={{ padding: 8 }}>Item</th><th style={{ padding: 8 }}>Name</th><th style={{ padding: 8 }}>UOM</th><th style={{ padding: 8 }}>Unit Cost</th>
          </tr>
        </thead>
        <tbody>
          {items.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid #313244' }}>
              <td style={{ padding: 8 }}>{s.code}</td><td style={{ padding: 8 }}>{s.itemCode || '-'}</td><td style={{ padding: 8 }}>{s.name}</td><td style={{ padding: 8 }}>{s.uom}</td><td style={{ padding: 8 }}>{s.unitCost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
