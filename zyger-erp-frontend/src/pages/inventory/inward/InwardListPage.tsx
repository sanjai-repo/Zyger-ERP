import { useEffect, useMemo, useState } from 'react';
import { useTabs } from '../../../contexts/TabsContext';
import { useToast } from '../../../contexts/ToastContext';
import { INWARD_TYPES, type InwardType } from '../../../config/inwardConfig';
import { useInwardList, useInwardMutations } from '../../../hooks/useInward';
import { inwardService } from '../../../services/inwardService';
import { formatDate, formatMoney, formatNumber } from '../../../utils/format';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import InwardForm from './InwardForm';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'POSTED',
  'REJECTED',
  'CANCELLED',
];

interface InwardListPageProps {
  inwardType: InwardType | 'ALL';
}

interface EditState {
  id: string | null;
  viewOnly: boolean;
}

export default function InwardListPage({ inwardType }: InwardListPageProps) {
  const { setActiveTab } = useTabs();
  const { toast } = useToast();
  const { removeMutation } = useInwardMutations();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; docNo: string } | null>(null);

  // For the unified dashboard we list PO by default when ALL is chosen.
  const resolvedType: InwardType =
    inwardType === 'ALL' ? 'PO_INWARD' : inwardType;

  const config = INWARD_TYPES[resolvedType];

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [search, status, fromDate, toDate]);

  const params = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      sort: 'date,desc',
      search,
      status,
      fromDate,
      toDate,
    }),
    [page, search, status, fromDate, toDate]
  );

  const { data, isPending, isError, error, refetch } = useInwardList(
    resolvedType,
    params
  );

  const rows = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const goBack = () => {
    setActiveTab('inward-entry');
  };

  const title =
    inwardType === 'ALL' ? 'All Inward' : `${config.label} — Details`;

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await removeMutation.mutateAsync({
        inwardType: resolvedType,
        id: deleteTarget.id,
      });
      toast(`${deleteTarget.docNo} deleted.`);
      setDeleteTarget(null);
    } catch (deleteError) {
      toast(getApiErrorMessage(deleteError, 'Delete failed.'), 'error');
    }
  };

  if (editing) {
    return (
      <InwardForm
        key={editing.id ?? 'new'}
        inwardType={resolvedType}
        documentId={editing.id}
        viewOnly={editing.viewOnly}
        onBack={() => setEditing(null)}
        onSaved={() => {}}
      />
    );
  }

  return (
    <>
      <div className="pg-head">
        <h1>{title}</h1>
        <p>{config.subtitle}</p>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <button className="btn" onClick={goBack}>
            <span className="material-symbols-rounded">arrow_back</span>
            Back
          </button>

          <div className="searchwrap" style={{ minWidth: '200px', flex: '0 1 240px' }}>
            <span className="material-symbols-rounded">search</span>
            <input
              className="in"
              value={searchInput}
              placeholder="Search Inward..."
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>From:</span>
            <input
              type="date"
              className="in"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '135px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>To:</span>
            <input
              type="date"
              className="in"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: '135px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Status:</span>
            <select
              className="in"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '135px' }}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <span className="count" style={{ marginLeft: '4px' }}>{formatNumber(totalElements)} records</span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-p" onClick={() => setEditing({ id: null, viewOnly: false })}>
              <span className="material-symbols-rounded">add</span>
              Add Inward
            </button>
          </div>
        </div>

        {isPending ? (
          <div className="empty">
            <span className="material-symbols-rounded">hourglass_empty</span>
            Loading {config.label} records...
          </div>
        ) : isError ? (
          <div className="empty">
            <span className="material-symbols-rounded">error</span>
            {getApiErrorMessage(error, 'Unable to load records.')}
            <div style={{ marginTop: 14 }}>
              <button className="btn" onClick={() => refetch()}>
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
                    rows.map((row, idx) => (
                      <tr key={row.id}>
                        <td className="num mut">{page * PAGE_SIZE + idx + 1}</td>
                        <td>{formatDate(row.date)}</td>
                        <td>
                          <span className="cell-b">{row.docNo}</span>
                        </td>
                        <td>{row.itemCode || '—'}</td>
                        <td>{row.reference || '—'}</td>
                        <td>{row.party || '—'}</td>
                        <td className="num">{formatNumber(row.qty ?? 0)}</td>
                        <td className="num">{formatMoney(row.amount ?? 0)}</td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            className="ibtn"
                            title="View"
                            onClick={() =>
                              setEditing({ id: String(row.id), viewOnly: true })
                            }
                          >
                            <span className="material-symbols-rounded">visibility</span>
                          </button>

                          <button
                            className="ibtn"
                            title="Edit"
                            onClick={() =>
                              setEditing({ id: String(row.id), viewOnly: false })
                            }
                          >
                            <span className="material-symbols-rounded">edit</span>
                          </button>

                          <button
                            className="ibtn danger"
                            title="Delete"
                            onClick={() =>
                              setDeleteTarget({ id: String(row.id), docNo: row.docNo })
                            }
                          >
                            <span className="material-symbols-rounded">delete</span>
                          </button>

                          <button
                            className="ibtn"
                            title="Download PDF"
                            onClick={() =>
                              inwardService.printDocument(config.apiPath, row.id, 'download')
                            }
                          >
                            <span className="material-symbols-rounded">download</span>
                          </button>

                          <button
                            className="ibtn"
                            title="Print"
                            onClick={() =>
                              inwardService.printDocument(config.apiPath, row.id, 'print')
                            }
                          >
                            <span className="material-symbols-rounded">print</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10}>
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

            <div className="pager">
              <span>
                Showing {rows.length === 0 ? 0 : page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, totalElements)} of{' '}
                {formatNumber(totalElements)}
              </span>

              <div className="pgs">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, index) => index).map(
                  (pageIndex) => (
                    <button
                      key={pageIndex}
                      className={pageIndex === page ? 'on' : ''}
                      onClick={() => setPage(pageIndex)}
                    >
                      {pageIndex + 1}
                    </button>
                  )
                )}

                <button
                  disabled={page >= totalPages - 1}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                >
                  ›
                </button>
              </div>
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
