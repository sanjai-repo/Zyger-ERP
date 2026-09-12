import { useEffect, useState } from 'react';

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  body: string;
  okLabel: string;
  busy?: boolean;
  danger?: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

export default function ConfirmActionModal({
  open,
  title,
  body,
  okLabel,
  busy = false,
  danger = false,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setNote('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="mwrap"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div className="modal">
        <h3>{title}</h3>
        <p>{body}</p>

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Comment / reason…"
        />

        <div className="acts">
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>

          <button
            className={`btn ${danger ? 'btn-d' : 'btn-p'}`}
            onClick={() => onConfirm(note)}
            disabled={busy}
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}