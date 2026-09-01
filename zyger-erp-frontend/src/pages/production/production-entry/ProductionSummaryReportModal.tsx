import { useEffect, useState } from 'react';
import apiClient from '../../../api/axiosClient';
import { exportToCsv } from '../../../utils/csvExport';

interface Props {
  open: boolean;
  onClose: () => void;
  reportType: 'rejection' | 'rework' | 'idle' | 'machine' | 'operator';
}

export default function ProductionSummaryReportModal({ open, onClose, reportType }: Props) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const titleMap: Record<string, string> = {
    rejection: 'Rejection Reason-wise Summary',
    rework: 'Rework Reason & Routing Summary',
    idle: 'Idle Reason & Duration Summary',
    machine: 'Machine-wise Production Summary',
    operator: 'Operator-wise Production Summary',
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const endpoint = `/v1/production/reports/${reportType}-summary`;
    apiClient.get(endpoint)
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [open, reportType]);

  if (!open) return null;

  const handleExport = () => {
    exportToCsv(data, [], `production-${reportType}-summary`);
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div className="modal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 720, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{titleMap[reportType] || 'Production Summary'}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ibtn" title="Export CSV" onClick={handleExport}><span className="material-symbols-rounded">download</span></button>
            <button className="ibtn" onClick={onClose}><span className="material-symbols-rounded">close</span></button>
          </div>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Loading summary data...</div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No summary records found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} style={{ padding: '10px 12px', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {Object.values(row).map((val, colIdx) => (
                      <td key={colIdx} style={{ padding: '10px 12px' }}>
                        {String(val ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
