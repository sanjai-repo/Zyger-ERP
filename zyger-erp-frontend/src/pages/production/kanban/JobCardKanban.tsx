import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/apiError';

interface JobCard {
  id: number;
  jobCardNumber: string;
  workOrderNumber: string;
  partCode: string;
  partDescription: string;
  plannedQuantity: number;
  completedQuantity: number;
  status: string;
  priority: string;
  machineCode?: string;
  operatorCode?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

interface Column {
  key: string;
  label: string;
  color: string;
  bg: string;
  allowedActions: string[];
}

const COLUMNS: Column[] = [
  { key: 'PENDING', label: 'Pending', color: '#6b7280', bg: '#f3f4f6', allowedActions: ['RELEASE', 'CANCEL'] },
  { key: 'RELEASED', label: 'Released', color: '#2563eb', bg: '#dbeafe', allowedActions: ['START', 'HOLD', 'CANCEL'] },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#d97706', bg: '#fef3c7', allowedActions: ['HOLD', 'COMPLETE', 'QUALITY_HOLD'] },
  { key: 'ON_HOLD', label: 'On Hold', color: '#9333ea', bg: '#ede9fe', allowedActions: ['RELEASE', 'CANCEL'] },
  { key: 'COMPLETED', label: 'Completed', color: '#16a34a', bg: '#dcfce7', allowedActions: ['CLOSE', 'REOPEN'] },
  { key: 'CLOSED', label: 'Closed', color: '#6b7280', bg: '#e5e7eb', allowedActions: [] },
];

const ACTION_LABELS: Record<string, string> = {
  RELEASE: 'Release', START: 'Start', HOLD: 'Hold', CANCEL: 'Cancel',
  COMPLETE: 'Complete', QUALITY_HOLD: 'QC Hold', CLOSE: 'Close', REOPEN: 'Reopen',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#dc2626', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#16a34c',
};

export default function JobCardKanban() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [cards, setCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyCard, setBusyCard] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/production/job-cards');
      setCards(Array.isArray(data) ? data : data.content ?? []);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const transition = async (card: JobCard, action: string) => {
    setBusyCard(card.id);
    try {
      await apiClient.post(`/v1/production/job-cards/${card.id}/actions/${action.toLowerCase()}`);
      toast(`${card.jobCardNumber} → ${action}`);
      load();
    } catch (e) { toast(getApiErrorMessage(e, `${action} failed.`), 'error'); }
    setBusyCard(null);
  };

  const onDragStart = (e: React.DragEvent, cardId: number) => {
    setDragId(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const onDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (dragId == null) return;
    const card = cards.find((c) => c.id === dragId);
    if (!card || card.status === targetStatus) { setDragId(null); return; }
    const col = COLUMNS.find((c) => c.key === card.status);
    const action = col?.allowedActions.find((a) => {
      if (targetStatus === 'RELEASED' && a === 'RELEASE') return true;
      if (targetStatus === 'IN_PROGRESS' && a === 'START') return true;
      if (targetStatus === 'ON_HOLD' && a === 'HOLD') return true;
      if (targetStatus === 'COMPLETED' && a === 'COMPLETE') return true;
      if (targetStatus === 'CLOSED' && a === 'CLOSE') return true;
      if (targetStatus === 'PENDING' && a === 'REOPEN') return true;
      return false;
    });
    if (action) {
      transition(card, action);
    } else {
      toast(`Cannot move ${card.jobCardNumber} from ${card.status} to ${targetStatus}`, 'error');
    }
    setDragId(null);
  };

  const grouped = COLUMNS.map((col) => ({
    ...col,
    cards: cards.filter((c) => c.status === col.key),
  }));

  const totalCards = cards.length;

  return (
    <>
      <div className="pg-head">
        <h1>Job Card Kanban</h1>
        <p>Drag cards between columns to transition status · {totalCards} total</p>
      </div>

      {loading ? (
        <div className="panel"><div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div></div>
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, minHeight: 500 }}>
          {grouped.map((col) => (
            <div
              key={col.key}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.key)}
              style={{
                minWidth: 280, maxWidth: 320, flex: '1 0 280px',
                background: col.bg, borderRadius: 10, padding: 12,
                border: `2px solid ${col.color}20`, display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${col.color}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: col.color }}>{col.label}</span>
                </div>
                <span style={{ background: `${col.color}20`, color: col.color, borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>{col.cards.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.cards.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 20 }}>No cards</div>
                )}
                {col.cards.map((card) => {
                  const progress = card.plannedQuantity > 0 ? Math.round((card.completedQuantity / card.plannedQuantity) * 100) : 0;
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, card.id)}
                      style={{
                        background: '#fff', borderRadius: 8, padding: 10,
                        border: `1px solid ${dragId === card.id ? col.color : '#e5e7eb'}`,
                        boxShadow: dragId === card.id ? `0 4px 12px ${col.color}30` : '0 1px 3px rgba(0,0,0,0.06)',
                        cursor: 'grab', transition: 'box-shadow 0.15s',
                        opacity: busyCard === card.id ? 0.5 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{card.jobCardNumber}</span>
                        {card.priority && PRIORITY_COLORS[card.priority] && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, fontWeight: 600, color: '#fff', background: PRIORITY_COLORS[card.priority] }}>{card.priority}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>{card.partCode}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.partDescription}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                        Qty: <b>{card.completedQuantity ?? 0}</b> / {card.plannedQuantity ?? '—'}
                      </div>
                      <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: progress >= 100 ? '#16a34a' : col.color, borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                      {card.workOrderNumber && <div style={{ fontSize: 10, color: '#9ca3af' }}>WO: {card.workOrderNumber}</div>}
                      {col.allowedActions.length > 0 && can('production', 'Edit') && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {col.allowedActions.map((action) => (
                            <button
                              key={action}
                              onClick={(e) => { e.stopPropagation(); transition(card, action); }}
                              disabled={busyCard === card.id}
                              style={{
                                fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid #d1d5db',
                                background: action === 'CANCEL' ? '#fef2f2' : '#fff',
                                color: action === 'CANCEL' ? '#dc2626' : '#374151',
                                cursor: 'pointer', fontWeight: 500,
                              }}
                            >
                              {ACTION_LABELS[action] ?? action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
