import { useEffect, useMemo, useState } from 'react';
import { useSirList, useSirMutations } from '../../../../hooks/useStockIssueRequest';
import {
  stockIssueRequestService,
  type SirExportFormat,
} from '../../../../services/stockIssueRequestService';
import { stockIssueService } from '../../../../services/stockIssueService';
import type { SirListRowDto } from '../../../../types/inventory/stockIssueRequest.types';
import { formatDate, formatNumber } from '../../../../utils/format';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { useToast } from '../../../../contexts/ToastContext';
import StatusBadge from '../../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../../components/common/ConfirmActionModal';

const PAGE_SIZE = 8;

const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'];

interface ColumnConfig {
  label: string;
  field: string;
  numeric?: boolean;
}

const COLUMNS: ColumnConfig[] = [
  { label: 'Doc No', field: 'docNo' },
  { label: 'Date', field: 'date' },
  { label: 'Department', field: 'department' },
  { label: 'Requested By', field: 'requestedBy' },
  { label: 'Qty', field: 'qty', numeric: true },
  { label: 'Status', field: 'status' },
];

interface StockIssueRequestListProps {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

export default function StockIssueRequestList({
  onAdd,
  onEdit,
  onView,
}: StockIssueRequestListProps) {
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] = useState<SirListRowDto | null>(null);

  const { removeMutation } = useSirMutations();

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [search, status]);

  const params = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      sort: `${sortField},${sortDir}`,
      search,
      status,
    }),
    [page, sortField, sortDir, search, status]
  );

  const { data, isPending, isError, error, refetch } = useSirList(params);

  const rows = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const handleExport = async (format: SirExportFormat) => {
    try {
      await stockIssueRequestService.exportFile(
        { search, status, sort: `${sortField},${sortDir}` },
        format
      );
      toast('Export downloaded.');
    } catch (exportError) {
      toast(
        getApiErrorMessage(exportError, 'Export failed. Backend export endpoint is not available.'),
        'error'
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await removeMutation.mutateAsync(deleteTarget.id);
      toast(`${deleteTarget.docNo} deleted.`);
      setDeleteTarget(null);
    } catch (deleteError) {
      toast(getApiErrorMessage(deleteError, 'Delete failed.'), 'error');
    }
  };

  if (isPending) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span>
          Loading Stock Issue Requests...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span>
          {getApiErrorMessage(error, 'Unable to load Stock Issue Requests.')}
          <div style={{ marginTop: '14px' }}>
            <button className="btn" onClick={() => refetch()}>
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
        <h1>Stock Issue Request</h1>
        <p>Department request for material — does not reduce stock</p>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div className="searchwrap" style={{ minWidth: '220px', flex: '0 1 260px' }}>
            <span className="material-symbols-rounded">search</span>
            <input
              className="in"
              value={searchInput}
              placeholder="Search Stock Issue Request..."
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>Status:</span>
            <select
              className="in"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={{ width: '140px' }}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <span className="count" style={{ marginLeft: '4px' }}>
            {formatNumber(totalElements)} record{totalElements === 1 ? '' : 's'}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn" onClick={() => handleExport('xlsx')}>
              <span className="material-symbols-rounded">download</span>
              Excel
            </button>

            <button className="btn" onClick={() => handleExport('pdf')}>
              <span className="material-symbols-rounded">picture_as_pdf</span>
              PDF
            </button>

            <button className="btn btn-p" onClick={onAdd}>
              <span className="material-symbols-rounded">add</span>
              Add Stock Issue Request
            </button>
          </div>
        </div>

        <div className="twrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="num">S.No</th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.field}
                    data-sort="1"
                    className={column.numeric ? 'num' : ''}
                    onClick={() => handleSort(column.field)}
                  >
                    {column.label} ⇅
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length > 0 ? (
                rows.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="num mut">{page * PAGE_SIZE + idx + 1}</td>
                    <td>
                      <span className="cell-b">{row.docNo}</span>
                    </td>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.department || '—'}</td>
                    <td>{row.requestedBy || '—'}</td>
                    <td className="num">{formatNumber(row.qty ?? 0)}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="ibtn"
                        title="View"
                        onClick={() => onView(row.id)}
                      >
                        <span className="material-symbols-rounded">visibility</span>
                      </button>

                      <button
                        className="ibtn"
                        title="Edit / Open"
                        onClick={() => onEdit(row.id)}
                      >
                        <span className="material-symbols-rounded">edit</span>
                      </button>

                      <button
                        className="ibtn danger"
                        title="Delete"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <span className="material-symbols-rounded">delete</span>
                      </button>

                      <button
                        className="ibtn"
                        title="Download PDF"
                        onClick={() =>
                          stockIssueService.printDocument('/inventory/stock-issue-request', row.id, 'download')
                        }
                      >
                        <span className="material-symbols-rounded">download</span>
                      </button>

                      <button
                        className="ibtn"
                        title="Print"
                        onClick={() =>
                          stockIssueService.printDocument('/inventory/stock-issue-request', row.id, 'print')
                        }
                      >
                        <span className="material-symbols-rounded">print</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={COLUMNS.length + 2}>
                    <div className="empty">
                      <span className="material-symbols-rounded">folder_open</span>
                      No records found. Click “Add Stock Issue Request”.
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
              onClick={() => setPage((previous) => Math.max(0, previous - 1))}
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
                setPage((previous) => Math.min(totalPages - 1, previous + 1))
              }
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.docNo ?? ''}`}
        body="The request will be permanently removed from the database."
        okLabel="Delete"
        danger
        busy={removeMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}