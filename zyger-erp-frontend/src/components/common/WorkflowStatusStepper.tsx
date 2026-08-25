import { useMemo } from 'react';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'var(--muted)',
  SUBMITTED: 'var(--blue)',
  IN_PROGRESS: 'var(--yellow)',
  APPROVED: 'var(--green)',
  REJECTED: 'var(--red)',
  CLOSED: 'var(--text)',
  CANCELLED: 'var(--muted)',
  PASS: 'var(--green)',
  FAIL: 'var(--red)',
  HOLD: 'var(--yellow)',
};

interface Props {
  currentStatus: string;
  allowedTransitions?: string[];
  isTerminal?: boolean;
  onAction?: (action: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'Submit',
  APPROVED: 'Approve',
  REJECTED: 'Reject',
  IN_PROGRESS: 'Start',
  CLOSED: 'Close',
  CANCELLED: 'Cancel',
  DRAFT: 'Reopen',
  PASS: 'Pass',
  FAIL: 'Fail',
  HOLD: 'Hold',
};

export default function WorkflowStatusStepper({ currentStatus, allowedTransitions = [], isTerminal, onAction }: Props) {
  const badge = useMemo(() => ({
    background: STATUS_COLORS[currentStatus] || 'var(--muted)',
    color: '#000',
  }), [currentStatus]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', padding: '4px 14px',
          borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
          textTransform: 'uppercase', ...badge,
        }}
      >
        {currentStatus}
      </span>

      {isTerminal && (
        <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
          Terminal — no further transitions
        </span>
      )}

      {!isTerminal && allowedTransitions.length > 0 && onAction && (
        <div style={{ display: 'flex', gap: 6 }}>
          {allowedTransitions.map(target => {
            const isDanger = target === 'REJECTED' || target === 'CANCELLED';
            return (
              <button
                key={target}
                className={`btn btn-sm ${isDanger ? 'btn-d' : 'btn-p'}`}
                onClick={() => onAction(target.toLowerCase())}
              >
                {ACTION_LABELS[target] || target}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
