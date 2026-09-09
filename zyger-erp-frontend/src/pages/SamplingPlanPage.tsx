import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

interface SP { id: number; standard: string; inspectionLevel: string; lotSizeMin: number; lotSizeMax: number; aql: number; sampleSize: number; acceptNumber: number; rejectNumber: number; }

export default function SamplingPlanPage() {
  const [plans, setPlans] = useState<SP[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await axiosClient.get('/v2/master/sampling-plans');
    setPlans(r.data as SP[]);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: '0 0 16px' }}>Sampling Plans (ISO 2859-1 Level II)</h2>
      <p style={{ color: '#6c7086', marginBottom: 16 }}>Pre-seeded AQL 1.0 General Inspection levels. Used for auto-calculating sample size from lot size.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #313244', textAlign: 'left' }}>
            <th className="num" style={{ padding: 8 }}>S.No</th><th style={{ padding: 8 }}>Standard</th><th style={{ padding: 8 }}>Level</th><th style={{ padding: 8 }}>Lot Min</th><th style={{ padding: 8 }}>Lot Max</th><th style={{ padding: 8 }}>AQL</th><th style={{ padding: 8 }}>Sample Size</th><th style={{ padding: 8 }}>Accept</th><th style={{ padding: 8 }}>Reject</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p, idx) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #313244' }}>
              <td className="num mut" style={{ padding: 8 }}>{idx + 1}</td><td style={{ padding: 8 }}>{p.standard}</td><td style={{ padding: 8 }}>{p.inspectionLevel}</td><td style={{ padding: 8 }}>{p.lotSizeMin}</td><td style={{ padding: 8 }}>{p.lotSizeMax}</td><td style={{ padding: 8 }}>{p.aql}</td><td style={{ padding: 8 }}>{p.sampleSize}</td><td style={{ padding: 8 }}>{p.acceptNumber}</td><td style={{ padding: 8 }}>{p.rejectNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
