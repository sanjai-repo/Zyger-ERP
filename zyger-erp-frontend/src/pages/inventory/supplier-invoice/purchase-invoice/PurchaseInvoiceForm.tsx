import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import {
  usePurchaseInvoiceDocument,
  usePurchaseInvoiceLookups,
  usePurchaseInvoiceMutations,
  usePurchaseInvoiceNextNumber,
} from '../../../../hooks/useSupplierInvoice';
import { purchaseInvoiceService } from '../../../../services/supplierInvoiceService';
import type {
  PurchaseInvoiceDto,
  SupplierInvoiceAttachment,
  SupplierInvoiceDocumentAction,
} from '../../../../types/inventory/supplierInvoice.types';
import { getApiErrorMessage } from '../../../../utils/apiError';
import StatusBadge from '../../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../../components/common/ConfirmActionModal';
import {
  buildPayload,
  createEmptyForm,
  formFromDto,
  validatePurchaseInvoiceForm,
  type PurchaseInvoiceFormState,
} from './purchaseInvoiceForm';

interface ActionModalState {
  action: SupplierInvoiceDocumentAction;
  title: string;
  body: string;
  okLabel: string;
  danger?: boolean;
}

interface PurchaseInvoiceFormProps {
  documentId?: string | null;
  viewOnly?: boolean;
  onBack: () => void;
  onSaved?: (id: string) => void;
}

export default function PurchaseInvoiceForm({
  documentId,
  viewOnly = false,
  onBack,
  onSaved,
}: PurchaseInvoiceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const lookups = usePurchaseInvoiceLookups();
  const documentQuery = usePurchaseInvoiceDocument(documentId ?? null);
  const nextNumberQuery = usePurchaseInvoiceNextNumber();

  const { createMutation, updateMutation, actionMutation } =
    usePurchaseInvoiceMutations();

  const [form, setForm] = useState<PurchaseInvoiceFormState>(() =>
    createEmptyForm()
  );
  const [currentDocument, setCurrentDocument] =
    useState<PurchaseInvoiceDto | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);

  const validationBoxRef = useRef<HTMLDivElement | null>(null);
  const initializedFor = useRef<string | null>(null);

  const suppliers = lookups.suppliers;
  const purchaseOrders = lookups.purchaseOrders;

  const status = currentDocument?.status ?? 'DRAFT';
  const editable = !viewOnly && (status === 'DRAFT' || status === 'REJECTED');

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const attachmentRoom = 3 - form.attachments.length - pendingFiles.length;

  const docNo =
    currentDocument?.docNo ||
    nextNumberQuery.data?.nextNumber ||
    'Auto';

  useEffect(() => {
    if (!documentId) {
      initializedFor.current = null;
      setCurrentDocument(null);
      setForm(createEmptyForm());
      setPendingFiles([]);
      return;
    }

    if (documentQuery.data && initializedFor.current !== documentId) {
      initializedFor.current = documentId;
      setCurrentDocument(documentQuery.data);
      setForm(formFromDto(documentQuery.data));
      setPendingFiles([]);
    }
  }, [documentId, documentQuery.data]);

  useEffect(() => {
    if (validationErrors.length > 0 && validationBoxRef.current) {
      validationBoxRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [validationErrors]);

  const updateField = (
    key: keyof PurchaseInvoiceFormState,
    value: string
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    actionMutation.isPending;

  const save = async (submit: boolean) => {
    if (!editable) {
      return;
    }

    const errors = validatePurchaseInvoiceForm(form);
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    try {
      const targetId = documentId ?? currentDocument?.id ?? null;

      if (targetId && status === 'REJECTED') {
        await actionMutation.mutateAsync({
          id: targetId,
          action: 'reopen',
          note: '',
        });
      }

      const payload = buildPayload(form);

      let saved: PurchaseInvoiceDto;

      if (targetId) {
        saved = await updateMutation.mutateAsync({
          id: targetId,
          payload,
        });
      } else {
        saved = await createMutation.mutateAsync(payload);
      }

      if (submit && saved.status !== 'SUBMITTED' && saved.id) {
        saved = await actionMutation.mutateAsync({
          id: saved.id,
          action: 'submit',
          note: '',
        });
      }

      if (saved.id && pendingFiles.length > 0) {
        try {
          saved = await purchaseInvoiceService.uploadAttachments(
            saved.id,
            pendingFiles
          );
        } catch (attachmentError) {
          toast(
            getApiErrorMessage(attachmentError, 'Attachment upload failed.'),
            'error'
          );
        }
      }
      setPendingFiles([]);

      setCurrentDocument(saved);
      setForm(formFromDto(saved));

      if (saved.id) {
        initializedFor.current = saved.id;
        onSaved?.(saved.id);
      }

      toast(
        `${saved.docNo || 'Purchase Invoice'} ${
          submit ? 'submitted' : 'saved as draft'
        }.`
      );
    } catch (saveError) {
      toast(
        getApiErrorMessage(
          saveError,
          submit ? 'Submit failed.' : 'Save failed.'
        ),
        'error'
      );
    }
  };

  const onSelectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (selected.length > attachmentRoom) {
      toast('Maximum 3 attachments allowed.', 'error');
    }

    setPendingFiles((previous) => [
      ...previous,
      ...selected.slice(0, Math.max(attachmentRoom, 0)),
    ]);
  };

  const dropPendingFile = (name: string) => {
    setPendingFiles((previous) =>
      previous.filter((file) => file.name !== name)
    );
  };

  const downloadAttachment = async (attachment: SupplierInvoiceAttachment) => {
    const id = currentDocument?.id ?? documentId;
    if (!id) {
      toast('Document is not saved yet.', 'error');
      return;
    }

    try {
      await purchaseInvoiceService.downloadAttachment(
        id,
        attachment.id,
        attachment.fileName
      );
    } catch (attachmentError) {
      toast(
        getApiErrorMessage(attachmentError, 'Attachment download failed.'),
        'error'
      );
    }
  };

  const removeAttachment = async (attachment: SupplierInvoiceAttachment) => {
    const id = currentDocument?.id ?? documentId;
    if (!id) {
      toast('Document is not saved yet.', 'error');
      return;
    }

    setAttachmentBusy(true);
    try {
      const updated = await purchaseInvoiceService.removeAttachment(
        id,
        attachment.id
      );
      setCurrentDocument(updated);
      setForm(formFromDto(updated));
      toast('Attachment removed.');
    } catch (attachmentError) {
      toast(
        getApiErrorMessage(attachmentError, 'Attachment removal failed.'),
        'error'
      );
    } finally {
      setAttachmentBusy(false);
    }
  };

  const runAction = async (
    action: SupplierInvoiceDocumentAction,
    note: string
  ) => {
    const id = currentDocument?.id ?? documentId;

    if (!id) {
      toast('Document is not saved yet.', 'error');
      return;
    }

    try {
      const updated = await actionMutation.mutateAsync({
        id,
        action,
        note,
      });

      setCurrentDocument(updated);
      setForm(formFromDto(updated));
      setActionModal(null);

      toast(`${updated.docNo || 'Purchase Invoice'} • ${action} completed.`);
    } catch (actionError) {
      toast(getApiErrorMessage(actionError, 'Action failed.'), 'error');
    }
  };

  const openActionModal = (action: 'approve' | 'reject' | 'cancel') => {
    const id = currentDocument?.id ?? documentId;

    if (!id) {
      toast('Document is not saved yet.', 'error');
      return;
    }

    const docNumber = currentDocument?.docNo || 'Purchase Invoice';

    if (action === 'approve') {
      setActionModal({
        action,
        title: `Approve ${docNumber}`,
        body: 'Add approval comment (optional).',
        okLabel: 'Approve',
      });
    }

    if (action === 'reject') {
      setActionModal({
        action,
        title: `Reject ${docNumber}`,
        body: 'Reason for rejection:',
        okLabel: 'Reject',
        danger: true,
      });
    }

    if (action === 'cancel') {
      setActionModal({
        action,
        title: `Cancel ${docNumber}`,
        body: 'This creates an auditable reversal.',
        okLabel: 'Cancel Document',
        danger: true,
      });
    }
  };

  if (documentId && documentQuery.isPending) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span>
          Loading Purchase Invoice document...
        </div>
      </div>
    );
  }

  if (documentId && documentQuery.isError) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span>
          {getApiErrorMessage(
            documentQuery.error,
            'Unable to load Purchase Invoice document.'
          )}
          <div style={{ marginTop: '14px' }}>
            <button className="btn" onClick={() => documentQuery.refetch()}>
              <span className="material-symbols-rounded">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (lookups.isLoading) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span>
          Loading Purchase Invoice master data...
        </div>
      </div>
    );
  }

  if (lookups.isError) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span>
          {lookups.errorMessage}
          <div style={{ marginTop: '14px' }}>
            <button className="btn" onClick={() => lookups.refetch()}>
              <span className="material-symbols-rounded">refresh</span>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pg-head">
        <h1>
          {viewOnly ? 'View' : documentId ? 'Edit' : 'Add'} Purchase Invoice —{' '}
          {docNo}
        </h1>
        <p>Three-way match: Supplier Invoice vs PO + Receipt</p>
      </div>

      <div className="note">
        <span className="material-symbols-rounded">info</span>
        <span>
          Workflow: DRAFT → SUBMITTED → APPROVED → POSTED • Financial document
          — no stock movement
        </span>
      </div>

      <div id="valBox" ref={validationBoxRef}>
        {validationErrors.length > 0 && (
          <div className="vals">
            <span className="material-symbols-rounded">warning</span>
            <div>
              <b>Please fix the following:</b>
              <ul>
                {validationErrors.map((errorMessage) => (
                  <li key={errorMessage}>{errorMessage}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(event) => event.preventDefault()}>
        <div className="panel">
          <div className="panel-h">
            <h2>
              <span className="material-symbols-rounded">description</span>
              Invoice Details
            </h2>

            <StatusBadge status={status} />
          </div>

          <div className="fgrid">
            <label className="fld">
              <span>Doc No</span>
              <input className="in" value={docNo} readOnly tabIndex={-1} />
            </label>

            <label className="fld">
              <span>
                Date <em>*</em>
              </span>
              <input
                type="date"
                className="in"
                value={form.date}
                readOnly={!editable}
                onChange={(event) => updateField('date', event.target.value)}
              />
            </label>

            <label className="fld">
              <span>
                Supplier <em>*</em>
              </span>
              <select
                className="in"
                value={form.supplier}
                disabled={!editable}
                onChange={(event) =>
                  updateField('supplier', event.target.value)
                }
              >
                <option value="">— Select —</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.code} value={supplier.code}>
                    {supplier.code} — {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="fld">
              <span>
                Purchase Order <em>*</em>
              </span>
              <select
                className="in"
                value={form.purchaseOrderNo}
                disabled={!editable}
                onChange={(event) =>
                  updateField('purchaseOrderNo', event.target.value)
                }
              >
                <option value="">— Select —</option>
                {purchaseOrders.map((po) => (
                  <option key={po.number} value={po.number}>
                    {po.number}
                  </option>
                ))}
              </select>
            </label>

            <label className="fld">
              <span>
                Attachment{editable ? ' (up to 3)' : ''}
              </span>
              <span className="atch">
                {form.attachments.map((attachment) => (
                  <span className="achip" key={attachment.id}>
                    <button
                      type="button"
                      className="lbtn"
                      onClick={() => downloadAttachment(attachment)}
                    >
                      <span className="material-symbols-rounded">
                        download
                      </span>
                      {attachment.fileName}
                    </button>
                    {editable && (
                      <button
                        type="button"
                        className="lbtn danger"
                        disabled={attachmentBusy}
                        onClick={() => removeAttachment(attachment)}
                      >
                        <span className="material-symbols-rounded">
                          delete
                        </span>
                        Remove
                      </button>
                    )}
                  </span>
                ))}

                {pendingFiles.map((file) => (
                  <span className="achip" key={`pending-${file.name}`}>
                    <span className="nm">{file.name}</span>
                    {editable && (
                      <button
                        type="button"
                        className="lbtn danger"
                        onClick={() => dropPendingFile(file.name)}
                      >
                        <span className="material-symbols-rounded">close</span>
                      </button>
                    )}
                  </span>
                ))}

                {editable && attachmentRoom > 0 ? (
                  <input
                    type="file"
                    multiple
                    className="in"
                    onChange={onSelectFiles}
                  />
                ) : (
                  form.attachments.length === 0 &&
                  pendingFiles.length === 0 && (
                    <span className="nm">None</span>
                  )
                )}
              </span>
            </label>

            <label className="fld">
              <span>
                Supplier Invoice No <em>*</em>
              </span>
              <input
                className="in"
                value={form.supplierInvoiceNo}
                readOnly={!editable}
                onChange={(event) =>
                  updateField('supplierInvoiceNo', event.target.value)
                }
              />
            </label>

            <label className="fld">
              <span>Tax Amount</span>
              <input
                type="number"
                step="any"
                className="in"
                value={form.taxAmount}
                readOnly={!editable}
                onChange={(event) =>
                  updateField('taxAmount', event.target.value)
                }
              />
            </label>

            <label className="fld">
              <span>
                Total Amount <em>*</em>
              </span>
              <input
                type="number"
                step="any"
                className="in"
                value={form.totalAmount}
                readOnly={!editable}
                onChange={(event) =>
                  updateField('totalAmount', event.target.value)
                }
              />
            </label>

            <label className="fld">
              <span>Due Date</span>
              <input
                type="date"
                className="in"
                value={form.dueDate}
                readOnly={!editable}
                onChange={(event) => updateField('dueDate', event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="actbar">
            <span className="lft">
              <span className="material-symbols-rounded">lock</span>
              Audited as {user?.username || 'System'}
            </span>

            <button type="button" className="btn" onClick={onBack}>
              <span className="material-symbols-rounded">arrow_back</span>
              Back
            </button>

            {editable && (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => save(false)}
                  disabled={isBusy}
                >
                  <span className="material-symbols-rounded">save</span>
                  Save Draft
                </button>

                <button
                  type="button"
                  className="btn btn-p"
                  onClick={() => save(true)}
                  disabled={isBusy}
                >
                  <span className="material-symbols-rounded">send</span>
                  Submit
                </button>
              </>
            )}

            {status === 'REJECTED' && (
              <button
                type="button"
                className="btn"
                onClick={() => runAction('reopen', '')}
                disabled={isBusy}
              >
                <span className="material-symbols-rounded">restart_alt</span>
                Reopen
              </button>
            )}

            {status === 'SUBMITTED' && (
              <>
                <button
                  type="button"
                  className="btn btn-g"
                  onClick={() => openActionModal('approve')}
                  disabled={isBusy}
                >
                  <span className="material-symbols-rounded">thumb_up</span>
                  Approve
                </button>

                <button
                  type="button"
                  className="btn btn-d"
                  onClick={() => openActionModal('reject')}
                  disabled={isBusy}
                >
                  <span className="material-symbols-rounded">thumb_down</span>
                  Reject
                </button>
              </>
            )}

            {status === 'APPROVED' && (
              <button
                type="button"
                className="btn btn-g"
                onClick={() => runAction('post', '')}
                disabled={isBusy}
              >
                <span className="material-symbols-rounded">
                  published_with_changes
                </span>
                Post
              </button>
            )}

            {!['POSTED', 'CANCELLED'].includes(status) && (
              <button
                type="button"
                className="btn btn-d"
                onClick={() => openActionModal('cancel')}
                disabled={isBusy}
              >
                <span className="material-symbols-rounded">block</span>
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      <ConfirmActionModal
        open={Boolean(actionModal)}
        title={actionModal?.title ?? ''}
        body={actionModal?.body ?? ''}
        okLabel={actionModal?.okLabel ?? 'Confirm'}
        danger={actionModal?.danger}
        busy={actionMutation.isPending}
        onClose={() => setActionModal(null)}
        onConfirm={(note) => {
          if (actionModal) {
            runAction(actionModal.action, note);
          }
        }}
      />
    </>
  );
}