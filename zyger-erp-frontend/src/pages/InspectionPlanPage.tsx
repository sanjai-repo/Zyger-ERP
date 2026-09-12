import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

interface Char { id?: number; balloonNo: string; characteristicCode: string; characteristicName: string; dataType: string; specificationText: string; nominalValue: string; lowerLimit: string; upperLimit: string; uom: string; isMandatory: boolean; isCritical: boolean; }
interface Plan { id: number; itemCode: string; drawingNumber?: string; drawingRevision?: string; operation?: string; inspectionType: string; aql: number; characteristics: Char[]; }

export default function InspectionPlanPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ itemCode: '', drawingNumber: '', drawingRevision: '', operation: '', inspectionType: 'IN_PROCESS', aql: '1.0' });
  const [chars, setChars] = useState<Char[]>([{ balloonNo: '1', characteristicCode: '', characteristicName: '', dataType: 'NUMERIC', specificationText: '', nominalValue: '', lowerLimit: '', upperLimit: '', uom: '', isMandatory: false, isCritical: false }]);
  const [itemFilter, setItemFilter] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const url = itemFilter ? `/v2/master/inspection-plans?itemCode=${encodeURIComponent(itemFilter)}` : '/v2/master/inspection-plans';
    const r = await axiosClient.get(url);
    setPlans(r.data as Plan[]);
  }

  function addChar() {
    setChars([...chars, { balloonNo: String(chars.length + 1), characteristicCode: '', characteristicName: '', dataType: 'NUMERIC', specificationText: '', nominalValue: '', lowerLimit: '', upperLimit: '', uom: '', isMandatory: false, isCritical: false }]);
  }

  function updateChar(i: number, field: keyof Char, value: string | boolean) {
    const c = [...chars];
    (c[i] as unknown as Record<string, unknown>)[field] = value;
    setChars(c);
  }

  async function save() {
    if (!form.itemCode) return;
    const body = { ...form, aql: Number(form.aql), characteristics: chars };
    await axiosClient.post('/v2/master/inspection-plans', body);
    setForm({ itemCode: '', drawingNumber: '', drawingRevision: '', operation: '', inspectionType: 'IN_PROCESS', aql: '1.0' });
    setChars([{ balloonNo: '1', characteristicCode: '', characteristicName: '', dataType: 'NUMERIC', specificationText: '', nominalValue: '', lowerLimit: '', upperLimit: '', uom: '', isMandatory: false, isCritical: false }]);
    setShowForm(false);
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Inspection Plans</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Filter by Item Code" value={itemFilter} onChange={e => setItemFilter(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} style={{ width: 200 }} />
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? 'Cancel' : '+ New Plan'}</button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: '#1e1e2e', border: '1px solid #313244', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input placeholder="Item Code *" value={form.itemCode} onChange={e => setForm({ ...form, itemCode: e.target.value })} />
            <input placeholder="Drawing Number" value={form.drawingNumber} onChange={e => setForm({ ...form, drawingNumber: e.target.value })} />
            <input placeholder="Drawing Rev" value={form.drawingRevision} onChange={e => setForm({ ...form, drawingRevision: e.target.value })} />
            <input placeholder="Operation" value={form.operation} onChange={e => setForm({ ...form, operation: e.target.value })} />
            <select value={form.inspectionType} onChange={e => setForm({ ...form, inspectionType: e.target.value })}>
              <option value="INCOMING">Incoming</option><option value="IN_PROCESS">In-Process</option><option value="FINAL">Final</option>
            </select>
            <input placeholder="AQL" type="number" value={form.aql} onChange={e => setForm({ ...form, aql: e.target.value })} />
          </div>

          <h4 style={{ margin: '12px 0 8px' }}>Characteristics</h4>
          {chars.map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 100px 150px 80px 120px 80px 80px 80px 80px 60px 60px', gap: 4, marginBottom: 4 }}>
              <input placeholder="Balloon" value={c.balloonNo} onChange={e => updateChar(i, 'balloonNo', e.target.value)} style={{ fontSize: 11 }} />
              <input placeholder="Code" value={c.characteristicCode} onChange={e => updateChar(i, 'characteristicCode', e.target.value)} style={{ fontSize: 11 }} />
              <input placeholder="Name *" value={c.characteristicName} onChange={e => updateChar(i, 'characteristicName', e.target.value)} style={{ fontSize: 11 }} />
              <select value={c.dataType} onChange={e => updateChar(i, 'dataType', e.target.value)} style={{ fontSize: 11 }}>
                <option value="NUMERIC">Numeric</option><option value="TEXT">Text</option><option value="YES_NO">Yes/No</option>
              </select>
              <input placeholder="Spec" value={c.specificationText} onChange={e => updateChar(i, 'specificationText', e.target.value)} style={{ fontSize: 11 }} />
              <input placeholder="Nominal" value={c.nominalValue} onChange={e => updateChar(i, 'nominalValue', e.target.value)} style={{ fontSize: 11 }} />
              <input placeholder="Lo" value={c.lowerLimit} onChange={e => updateChar(i, 'lowerLimit', e.target.value)} style={{ fontSize: 11 }} />
              <input placeholder="Hi" value={c.upperLimit} onChange={e => updateChar(i, 'upperLimit', e.target.value)} style={{ fontSize: 11 }} />
              <input placeholder="UOM" value={c.uom} onChange={e => updateChar(i, 'uom', e.target.value)} style={{ fontSize: 11 }} />
              <label style={{ fontSize: 11, display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={c.isMandatory} onChange={e => updateChar(i, 'isMandatory', e.target.checked)} /> M</label>
              <label style={{ fontSize: 11, display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={c.isCritical} onChange={e => updateChar(i, 'isCritical', e.target.checked)} /> C</label>
            </div>
          ))}
          <button onClick={addChar} style={{ marginTop: 8, fontSize: 12, background: 'transparent', border: '1px dashed #585b70', color: '#a6adc8', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}>+ Add Characteristic</button>
          <div><button onClick={save} className="btn-primary" style={{ marginTop: 12 }}>Save Plan</button></div>
        </div>
      )}

      {plans.map(p => (
        <div key={p.id} style={{ background: '#181825', border: '1px solid #313244', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontWeight: 600 }}>
            <span>{p.itemCode}</span>
            <span style={{ color: '#6c7086' }}>{p.inspectionType}</span>
            {p.drawingNumber && <span style={{ color: '#6c7086' }}>DWG: {p.drawingNumber} Rev {p.drawingRevision}</span>}
            <span style={{ color: '#6c7086' }}>AQL: {p.aql}</span>
            <span style={{ color: '#6c7086' }}>{p.characteristics.length} characteristics</span>
          </div>
          {p.characteristics.length > 0 && (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #313244', textAlign: 'left' }}>
                  <th style={{ padding: 4 }}>#</th><th style={{ padding: 4 }}>Code</th><th style={{ padding: 4 }}>Name</th><th style={{ padding: 4 }}>Spec</th><th style={{ padding: 4 }}>Lo</th><th style={{ padding: 4 }}>Hi</th><th style={{ padding: 4 }}>M</th><th style={{ padding: 4 }}>C</th>
                </tr>
              </thead>
              <tbody>
                {p.characteristics.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1e1e2e' }}>
                    <td style={{ padding: 4 }}>{c.balloonNo}</td><td style={{ padding: 4 }}>{c.characteristicCode}</td><td style={{ padding: 4 }}>{c.characteristicName}</td>
                    <td style={{ padding: 4 }}>{c.specificationText || `${c.nominalValue} (${c.lowerLimit}-${c.upperLimit})`}</td>
                    <td style={{ padding: 4 }}>{c.lowerLimit}</td><td style={{ padding: 4 }}>{c.upperLimit}</td>
                    <td style={{ padding: 4 }}>{c.isMandatory ? 'Y' : ''}</td><td style={{ padding: 4 }}>{c.isCritical ? 'Y' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
