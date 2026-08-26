import { useState } from 'react';

/**
 * FRS §5.4: Conflict resolution modal shown on HTTP 409 VERSION_CONFLICT.
 * Allows user to overwrite with their changes or merge field-by-field.
 */
interface ConflictModalProps {
  open: boolean;
  serverData: Record<string, unknown> | null;
  localData: Record<string, unknown> | null;
  onOverwrite: () => void;
  onMerge: (merged: Record<string, unknown>) => void;
  onCancel: () => void;
  busy?: boolean;
}

export default function ConflictModal({ open, serverData, localData, onOverwrite, onMerge, onCancel, busy }: ConflictModalProps) {
  const [mode, setMode] = useState<'choose' | 'merge'>('choose');
  const [merged, setMerged] = useState<Record<string, unknown>>({});

  if (!open || !serverData || !localData) return null;

  const allKeys = Array.from(new Set([...Object.keys(localData), ...Object.keys(serverData)])).filter((k) => !k.startsWith('_') && k !== 'id' && k !== 'lines');

  const startMerge = () => {
    const init: Record<string, unknown> = {};
    for (const k of allKeys) {
      init[k] = localData[k] ?? serverData[k];
    }
    setMerged(init);
    setMode('merge');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: mode === 'merge' ? 720 : 480, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, color: '#dc2626' }}>warning</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991b1b' }}>Version Conflict Detected</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#b91c1c' }}>This document was modified by another user while you were editing.</p>
          </div>
        </div>

        {mode === 'choose' && (
          <div style={{ padding: 20 }}>
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 16 }}>Choose how to resolve:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button type="button" onClick={onOverwrite} disabled={busy}
                style={{ padding: 16, borderRadius: 8, border: '2px solid #fecaca', background: '#fff', cursor: 'pointer', textAlign: 'center' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 28, color: '#dc2626', display: 'block', marginBottom: 6 }}>edit_off</span>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#991b1b' }}>Overwrite</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Discard their changes, keep yours</div>
              </button>
              <button type="button" onClick={startMerge}
                style={{ padding: 16, borderRadius: 8, border: '2px solid #bfdbfe', background: '#fff', cursor: 'pointer', textAlign: 'center' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 28, color: '#2563eb', display: 'block', marginBottom: 6 }}>merge</span>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e40af' }}>Merge</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Pick field-by-field which version to keep</div>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        )}

        {mode === 'merge' && (
          <>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', position: 'sticky', top: 0, background: '#f9fafb' }}>
                    <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280' }}>Field</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280' }}>Theirs (Server)</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280' }}>Yours (Local)</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Keep</th>
                  </tr>
                </thead>
                <tbody>
                  {allKeys.map((k) => {
                    const serverVal = String(serverData[k] ?? '');
                    const localVal = String(localData[k] ?? '');
                    const mergedVal = String(merged[k] ?? '');
                    const isDiff = serverVal !== localVal;
                    return (
                      <tr key={k} style={{ borderBottom: '1px solid #f3f4f6', background: isDiff ? '#fffbeb' : 'transparent' }}>
                        <td style={{ padding: '6px', fontWeight: 600, color: '#374151' }}>{k}</td>
                        <td style={{ padding: '6px', color: isDiff ? '#92400e' : '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{serverVal || '—'}</td>
                        <td style={{ padding: '6px', color: isDiff ? '#1e40af' : '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{localVal || '—'}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <select value={mergedVal} onChange={(e) => setMerged((c) => ({ ...c, [k]: e.target.value === '_server_' ? serverData[k] : e.target.value === '_local_' ? localData[k] : e.target.value }))}
                            style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 11, background: '#fff' }}>
                            <option value={localVal}>Local</option>
                            <option value={serverVal}>Server</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setMode('choose')} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Back</button>
              <button type="button" onClick={() => onMerge(merged)} disabled={busy}
                style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {busy ? 'Saving...' : 'Save Merged'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
