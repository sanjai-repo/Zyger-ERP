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
import InwardEntryPage from './InwardEntryPage';

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
  const { setActiveTab, openTab, tabs: openTabs } = useTabs();
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
    // Reopen the Inward Entry tab if it was closed, rather than switching to
    // an id with no matching open tab (which left the screen blank).
    if (openTabs.some((t) => t.id === 'inward-entry')) {
      setActiveTab('inward-entry');
    } else {
      openTab({
        id: 'inward-entry',
        label: 'Inward Entry',
        icon: 'move_to_inbox',
        component: InwardEntryPage,
        props: { title: 'Inward Entry', screenId: 'inward-entry' },
      });
    }
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

  const getTaxAmount = (r: typeof rows[0]): number => {
    if (typeof r.taxAmount === 'number') return r.taxAmount;
    if (Array.isArray(r.lines)) {
      return r.lines.reduce((sum, l) => sum + (Number(l.taxAmount) || 0), 0);
    }
    return 0;
  };

  const getNetAmount = (r: typeof rows[0]): number => {
    if (typeof r.netAmount === 'number' && r.netAmount > 0) return r.netAmount;
    const base = r.totalAmount ?? 0;
    const tax = getTaxAmount(r);
    if (Array.isArray(r.lines) && r.lines.length > 0) {
      const sumNet = r.lines.reduce((sum, l) => sum + (Number(l.netAmount) || 0), 0);
      if (sumNet > 0) return sumNet;
    }
    return base + tax;
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
        <div className="toolbar">
          <button className="btn" onClick={goBack}>
            <span className="material-symbols-rounded">arrow_back</span>
            Back
          </button>

          <span className="count">{formatNumber(rows.length)} records</span>

          <button
            className="btn icon-only"
            title="Refresh"
            onClick={() => query.refetch()}
            style={{ marginLeft: 'auto' }}
          >
            <span className="material-symbols-rounded">refresh</span>
          </button>
        </div>

        {query.isPending ? (
          <div className="empty">
            <span className="material-symbols-rounded">hourglass_empty</span>
            Loading records...
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
                  <th className="num">Tax Amt</th>
                  <th className="num">Net Amt</th>
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
                          {formatMoney(getNetAmount(row))}
                        </td>
                        <td className="num">
                          {formatMoney(getTaxAmount(row))}
                        </td>
                        <td className="num">
                          {formatMoney(getNetAmount(row))}
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
                            <span className="material-symbols-rounded">
                              download
                            </span>
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
                    <td colSpan={13}>
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
