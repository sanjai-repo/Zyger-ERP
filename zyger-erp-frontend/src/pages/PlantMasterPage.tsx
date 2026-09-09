import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

interface Plant { id: number; code: string; name: string; address?: string; timezone: string; active: boolean; }

export default function PlantMasterPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', address: '', timezone: 'Asia/Kolkata' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await axiosClient.get('/v2/master/plants');
      setPlants(r.data as Plant[]);
    } finally { setLoading(false); }
  }

  async function save() {
    if (!form.code || !form.name) return;
    await axiosClient.post('/v2/master/plants', form);
    setForm({ code: '', name: '', address: '', timezone: 'Asia/Kolkata' });
    setShowForm(false);
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Plant Master</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Plant'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#1e1e2e', border: '1px solid #313244', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <input placeholder="Code *" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <input placeholder="Timezone" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} />
          </div>
          <button onClick={save} className="btn-primary" style={{ marginTop: 12 }}>Save</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #313244', textAlign: 'left' }}>
            <th className="num" style={{ padding: 8 }}>S.No</th>
            <th style={{ padding: 8 }}>Code</th>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Address</th>
            <th style={{ padding: 8 }}>Timezone</th>
            <th style={{ padding: 8 }}>Active</th>
          </tr>
        </thead>
        <tbody>
          {plants.map((p, idx) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #313244' }}>
              <td className="num mut" style={{ padding: 8 }}>{idx + 1}</td>
              <td style={{ padding: 8 }}>{p.code}</td>
              <td style={{ padding: 8 }}>{p.name}</td>
              <td style={{ padding: 8 }}>{p.address || '-'}</td>
              <td style={{ padding: 8 }}>{p.timezone}</td>
              <td style={{ padding: 8 }}>{p.active ? 'Yes' : 'No'}</td>
            </tr>
          ))}
          {plants.length === 0 && <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#6c7086' }}>{loading ? 'Loading...' : 'No plants found'}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
