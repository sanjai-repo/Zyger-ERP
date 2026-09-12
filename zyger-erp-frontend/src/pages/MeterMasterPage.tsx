import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

interface Meter { id: number; code: string; name: string; meterType: string; location?: string; budgetMonthlyUnits?: number; }

export default function MeterMasterPage() {
  const [items, setItems] = useState<Meter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', meterType: 'POWER', location: '', budgetMonthlyUnits: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await axiosClient.get('/v2/master/meters');
    setItems(r.data as Meter[]);
  }

  async function save() {
    if (!form.code || !form.name) return;
    await axiosClient.post('/v2/master/meters', { ...form, budgetMonthlyUnits: form.budgetMonthlyUnits ? Number(form.budgetMonthlyUnits) : null });
    setForm({ code: '', name: '', meterType: 'POWER', location: '', budgetMonthlyUnits: '' });
    setShowForm(false);
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Meters (Power & Water)</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? 'Cancel' : '+ New'}</button>
      </div>

      {showForm && (
        <div style={{ background: '#1e1e2e', border: '1px solid #313244', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <input placeholder="Code *" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select value={form.meterType} onChange={e => setForm({ ...form, meterType: e.target.value })}>
              <option value="POWER">Power</option><option value="WATER">Water</option>
            </select>
            <input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <input placeholder="Budget Monthly Units" type="number" value={form.budgetMonthlyUnits} onChange={e => setForm({ ...form, budgetMonthlyUnits: e.target.value })} />
          </div>
          <button onClick={save} className="btn-primary" style={{ marginTop: 12 }}>Save</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #313244', textAlign: 'left' }}>
            <th className="num" style={{ padding: 8 }}>S.No</th><th style={{ padding: 8 }}>Code</th><th style={{ padding: 8 }}>Name</th><th style={{ padding: 8 }}>Type</th><th style={{ padding: 8 }}>Location</th><th style={{ padding: 8 }}>Budget Units</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, idx) => (
            <tr key={m.id} style={{ borderBottom: '1px solid #313244' }}>
              <td className="num mut" style={{ padding: 8 }}>{idx + 1}</td>
              <td style={{ padding: 8 }}>{m.code}</td><td style={{ padding: 8 }}>{m.name}</td><td style={{ padding: 8 }}>{m.meterType}</td><td style={{ padding: 8 }}>{m.location || '-'}</td><td style={{ padding: 8 }}>{m.budgetMonthlyUnits ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
