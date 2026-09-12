import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

interface WC { id: number; code: string; name: string; department?: string; capacity?: number; hourlyRate?: number; }

export default function WorkCenterMasterPage() {
  const [items, setItems] = useState<WC[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', department: '', capacity: '', hourlyRate: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await axiosClient.get('/v2/master/work-centers');
    setItems(r.data as WC[]);
  }

  async function save() {
    if (!form.code || !form.name) return;
    await axiosClient.post('/v2/master/work-centers', { ...form, capacity: form.capacity ? Number(form.capacity) : null, hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null });
    setForm({ code: '', name: '', department: '', capacity: '', hourlyRate: '' });
    setShowForm(false);
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Work Centers</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? 'Cancel' : '+ New'}</button>
      </div>

      {showForm && (
        <div style={{ background: '#1e1e2e', border: '1px solid #313244', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <input placeholder="Code *" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            <input placeholder="Capacity" type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            <input placeholder="Hourly Rate" type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} />
          </div>
          <button onClick={save} className="btn-primary" style={{ marginTop: 12 }}>Save</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #313244', textAlign: 'left' }}>
            <th className="num" style={{ padding: 8 }}>S.No</th><th style={{ padding: 8 }}>Code</th><th style={{ padding: 8 }}>Name</th><th style={{ padding: 8 }}>Department</th><th style={{ padding: 8 }}>Capacity</th><th style={{ padding: 8 }}>Hourly Rate</th>
          </tr>
        </thead>
        <tbody>
          {items.map((w, idx) => (
            <tr key={w.id} style={{ borderBottom: '1px solid #313244' }}>
              <td className="num mut" style={{ padding: 8 }}>{idx + 1}</td><td style={{ padding: 8 }}>{w.code}</td><td style={{ padding: 8 }}>{w.name}</td><td style={{ padding: 8 }}>{w.department || '-'}</td><td style={{ padding: 8 }}>{w.capacity ?? '-'}</td><td style={{ padding: 8 }}>{w.hourlyRate ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
