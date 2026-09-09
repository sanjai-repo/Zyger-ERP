import { useState } from 'react';
import { useTabs } from '../../../contexts/TabsContext';
import { INWARD_TYPES, type InwardType } from '../../../config/inwardConfig';
import {
  useInwardLog,
  useInwardMutations,
  useInwardPending,
} from '../../../hooks/useInward';
import { inwardService } from '../../../services/inwardService';
import { formatDate, formatMoney, formatNumber } from '../../../utils/format';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import InwardForm from './InwardForm';

interface PendingInwardListPageProps {
  showLog?: boolean;
  screenId?: string;
}

interface EditState {
  id: string | null;
  viewOnly: boolean;
  type: InwardType;
}

export default function PendingInwardListPage({
  showLog,
  screenId,
}: PendingInwardListPageProps) {
  const { setActiveTab } = useTabs();
  const { removeMutation } = useInwardMutations();

  const pendingQuery = useInwardPending();
  const logQuery = useInwardLog();
  const isLog = showLog ?? screenId === 'inward-log';
  const query = isLog ? logQuery : pendingQuery;
  const rows = query.data ?? [];

  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string | number;
    docNo: string;
    type: InwardType;
  } | null>(null);

  const goBack = () => {
    setActiveTab('inward-entry');
  };

  const toInwardType = (raw: string): InwardType => {
    return raw in INWARD_TYPES ? (raw as InwardType) : 'PO_INWARD';
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await removeMutation.mutateAsync({
        inwardType: deleteTarget.type,
        id: String(deleteTarget.id),
      });
      query.refetch();
      setDeleteTarget(null);
    } catch (deleteError) {
      console.error(deleteError);
      setDeleteTarget(null);
    }
  };

  if (editing) {
    return (
      <InwardForm
        key={editing.id ?? 'new'}
        inwardType={editing.type}
        documentId={editing.id}
        viewOnly={editing.viewOnly}
        onBack={() => setEditing(null)}
        onSaved={() => query.refetch()}
      />
    );
  }

  const typeConfig = (type: string) => {
    const config = INWARD_TYPES[type as InwardType];
    return config ?? INWARD_TYPES.PO_INWARD;
  };

  return (
    <>
      <div className="pg-head">
        <h1>{isLog ? 'Inward Log' : 'Pending Inward'}</h1>
        <p>
          {isLog
            ? 'All inward documents across PO / LO / JO / General'
            : 'Inward documents awaiting approval or posting'}
        </p>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <button className="btn" onClick={goBack}>
            <span className="material-symbols-rounded">arrow_back</span>
            Back
          </button>

          <span className="count" style={{ marginLeft: '4px' }}>
            {formatNumber(rows.length)} records
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-p"
              onClick={() =>
                setEditing({ id: null, viewOnly: false, type: 'PO_INWARD' })
              }
            >
              <span className="material-symbols-rounded">add</span>
              Add Inward
            </button>
          </div>
        </div>

        {query.isPending ? (
          <div className="empty">
            <span className="material-symbols-rounded">hourglass_empty</span>
            Loading inward documents...
          </div>
        ) : query.isError ? (
          <div className="empty">
            <span className="material-symbols-rounded">error</span>
            {getApiErrorMessage(query.error, 'Unable to load records.')}
            <div style={{ marginTop: 14 }}>
              <button className="btn" onClick={() => query.refetch()}>
                <span className="material-symbols-rounded">refresh</span>
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="twrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="num">S.No</th>
                    <th>Date</th>
                    <th>Doc No</th>
                    <th>Type</th>
                    <th>Item</th>
                    <th>Reference</th>
                    <th>Party</th>
                    <th className="num">Qty</th>
                    <th className="num">Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row, idx) => {
                      const config = typeConfig(String(row.type));
                      return (
                        <tr key={String(row.id)}>
                          <td className="num mut">{idx + 1}</td>
                          <td>{formatDate(row.date)}</td>
                          <td>
                            <span className="cell-b">{row.docNo}</span>
                          </td>
                          <td>
                            <span className="bdg" style={{ color: config.color }}>
                              {String(row.type).replace(/_INWARD$/, '')}
                            </span>
                          </td>
                          <td>
                            {row.itemCode || '—'}
                            {row.itemName ? (
                              <div className="mut">{row.itemName}</div>
                            ) : null}
                          </td>
                          <td>{row.reference || '—'}</td>
                          <td>{row.party || '—'}</td>
                          <td className="num">
                            {formatNumber(row.qty ?? 0)}
                          </td>
                          <td className="num">
                            {formatMoney(row.totalAmount ?? 0)}
                          </td>
                          <td>
                            <StatusBadge status={row.status} />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button
                              className="ibtn"
                              title="View"
                              onClick={() =>
                                setEditing({
                                  id: String(row.id),
                                  viewOnly: true,
                                  type: toInwardType(String(row.type)),
                                })
                              }
                            >
                              <span className="material-symbols-rounded">
                                visibility
                              </span>
                            </button>

                            <button
                              className="ibtn"
                              title="Edit"
                              onClick={() =>
                                setEditing({
                                  id: String(row.id),
                                  viewOnly: false,
                                  type: toInwardType(String(row.type)),
                                })
                              }
                            >
                              <span className="material-symbols-rounded">
                                edit
                              </span>
                            </button>

                            <button
                              className="ibtn danger"
                              title="Delete"
                              disabled={!['DRAFT', 'REJECTED'].includes(row.status)}
                              onClick={() =>
                                setDeleteTarget({
                                  id: row.id,
                                  docNo: row.docNo,
                                  type: toInwardType(String(row.type)),
                                })
                              }
                            >
                              <span className="material-symbols-rounded">
                                delete
                              </span>
                            </button>

                            <button
                              className="ibtn"
                              title="Download PDF"
                              onClick={() =>
                                inwardService.printDocument(
                                  INWARD_TYPES[toInwardType(String(row.type))].apiPath,
                                  row.id,
                                  'download'
                                )
                              }
                            >
                              <span className="material-symbols-rounded">download</span>
                            </button>

                            <button
                              className="ibtn"
                              title="Print"
                              onClick={() =>
                                inwardService.printDocument(
                                  INWARD_TYPES[toInwardType(String(row.type))].apiPath,
                                  row.id,
                                  'print'
                                )
                              }
                            >
                              <span className="material-symbols-rounded">print</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11}>
                        <div className="empty">
                          <span className="material-symbols-rounded">
                            folder_open
                          </span>
                          No records found.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.docNo ?? ''}`}
        body="The inward document will be permanently removed from the database."
        okLabel="Delete"
        danger
        busy={removeMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
