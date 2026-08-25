import { ReactNode } from 'react';
import { useTabs } from '../../contexts/TabsContext';

interface FormActionsProps {
  tabIndex: string;
  isViewOnly?: boolean;
  busy?: boolean;
  status?: string;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  leftExtra?: ReactNode;
  rightExtra?: ReactNode;
  deleteLabel?: string;
}

export default function FormActions({ tabIndex, isViewOnly, busy,   status: _status, onSave, onCancel, onDelete, leftExtra, rightExtra, deleteLabel }: FormActionsProps) {
  const { closeTab } = useTabs();
  const handleBack = () => closeTab(tabIndex);
  const editable = !isViewOnly;

  return (
    <div className="actbar">
      <div className="lft">
        <button type="button" className="btn btn-sm" onClick={handleBack}>
          <span className="material-symbols-rounded">arrow_back</span> Back
        </button>
        {leftExtra}
      </div>
      <div className="rgt">
        {rightExtra}
        {!isViewOnly && onDelete && (
          <button type="button" className="btn btn-sm btn-d" disabled={busy} onClick={onDelete}>
            <span className="material-symbols-rounded">delete</span> {deleteLabel ?? 'Delete'}
          </button>
        )}
        {editable && onCancel && (
          <button type="button" className="btn btn-sm" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        )}
        {editable && onSave && (
          <button type="button" className="btn btn-sm btn-p" disabled={busy} onClick={onSave}>
            <span className="material-symbols-rounded">save</span> Save
          </button>
        )}
      </div>
    </div>
  );
}
