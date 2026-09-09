import { useEffect, useMemo, useState } from 'react';
import {
  useIssueInternalExternalList,
  useIssueInternalExternalMutations,
} from '../../../../hooks/useIssueInternalExternal';
import {
  useIssueRequestLookup,
  useStoreNameLookup,
} from '../../../../hooks/useIssueDocListLookups';
import {
  issueInternalExternalService,
  type IssueInternalExternalExportFormat,
} from '../../../../services/issueInternalExternalService';
import { stockIssueService } from '../../../../services/stockIssueService';
import type { IssueInternalExternalListRowDto } from '../../../../types/inventory/issueInternalExternal.types';
import { formatDate, formatNumber } from '../../../../utils/format';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { useToast } from '../../../../contexts/ToastContext';
import StatusBadge from '../../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../../components/common/ConfirmActionModal';

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'POSTED',
  'REJECTED',
  'CANCELLED',
];

const TYPE_OPTIONS = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'EXTERNAL', label: 'External' },
];

const RETURNABLE_OPTIONS = [
  { value: 'Yes', label: 'Returnable' },
  { value: 'No', label: 'Non-Returnable' },
];

function typeLabel(value?: string): string {
  return (
    TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    value ??
    '—'
  );
}

function returnableLabel(value?: string): string {
  if (value === 'Yes') return 'Returnable';
  if (value === 'No') return 'Non-Returnable';
  return '—';
}

function partyLabel(row: IssueInternalExternalListRowDto): string {
  if (row.issueType === 'INTERNAL') return row.toDepartment || '—';
  if (row.issueType === 'EXTERNAL') return row.issuedTo || '—';
  return row.toDepartment || row.issuedTo || '—';
}

const LIST_COLUMN_COUNT = 12;

interface IssueInternalExternalListProps {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

export default function IssueInternalExternalList({
  onAdd,
  onEdit,
  onView,
}: IssueInternalExternalListProps) {
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [issueType, setIssueType] = useState('');
  const [returnable, setReturnable] = useState('');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] =
    useState<IssueInternalExternalListRowDto | null>(null);

  const { removeMutation } = useIssueInternalExternalMutations();
  const requestLookupQuery = useIssueRequestLookup();
  const storeNameQuery = useStoreNameLookup();

  const requestedDateFor = (row: IssueInternalExternalListRowDto): string => {
    const entry = row.issueRequestNo
      ? requestLookupQuery.data?.[row.issueRequestNo]
      : undefined;
    return entry?.date ? formatDate(entry.date) : '—';
  };

  const requestedByFor = (row: IssueInternalExternalListRowDto): string => {
    const entry = row.issueRequestNo
      ? requestLookupQuery.data?.[row.issueRequestNo]
      : undefined;
    return entry?.requestedBy || '—';
  };

  const storeNameFor = (row: IssueInternalExternalListRowDto): string =>
    (row.sourceLocation && storeNameQuery.data?.[row.sourceLocation]) ||
    row.sourceLocation ||
    '—';

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [search, status, issueType, returnable]);

  const params = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      sort: `${sortField},${sortDir}`,
      search,
      status,
      issueType,
      returnable,
    }),
    [page, sortField, sortDir, search, status, issueType, returnable]
  );

  const { data, isPending, isError, error, refetch } =
    useIssueInternalExternalList(params);

  const rows = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSort = (field: string) => {
    if (field === 'party') {
      return;
    }

    if (sortField === field) {
      setSortDir((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }

    setPage(0);
  };

  const handleExport = async (
    format: IssueInternalExternalExportFormat
  ) => {
    try {
      await issueInternalExternalService.exportFile(
        'Issue_Internal_External',
        {
          search,
          status,
          issueType,
          returnable,
          sort: `${sortField},${sortDir}`,
        },
        format
      );

      toast('Export downloaded.');
    } catch (exportError) {
      toast(
        getApiErrorMessage(
          exportError,
          'Export failed. Backend export endpoint is not available.'
        ),
        'error'
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

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
          Loading Issue Internal / External records...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span>
          {getApiErrorMessage(
            error,
            'Unable to load Issue Internal / External records.'
          )}
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
        <h1>Issue Internal / External</h1>
        <p>
          Stock issue to a department (internal) or external party — stock
          reduces on posting
        </p>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div className="searchwrap" style={{ minWidth: '200px', flex: '0 1 240px' }}>
            <span className="material-symbols-rounded">search</span>
            <input
              className="in"
              value={searchInput}
              placeholder="Search..."
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Type:</span>
            <select
              className="in"
              value={issueType}
              onChange={(event) => setIssueType(event.target.value)}
              style={{ width: '125px' }}
            >
              <option value="">All Type</option>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Returnable:</span>
            <select
              className="in"
              value={returnable}
              onChange={(event) => setReturnable(event.target.value)}
              style={{ width: '135px' }}
            >
              <option value="">All Returnable</option>
              {RETURNABLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Status:</span>
            <select
              className="in"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={{ width: '130px' }}
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
            {formatNumber(totalElements)} record
            {totalElements === 1 ? '' : 's'}
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
              Add Issue
            </button>
          </div>
        </div>

        <div className="twrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="num">S.No</th>
                <th
                  data-sort="1"
                  onClick={() => handleSort('docNo')}
                >
                  Doc No ⇅
                </th>
                <th>Requested Date</th>
                <th
                  data-sort="1"
                  onClick={() => handleSort('date')}
                >
                  Issued Date ⇅
                </th>
                <th
                  data-sort="1"
                  onClick={() => handleSort('issueType')}
                >
                  Type ⇅
                </th>
                <th
                  data-sort="1"
                  onClick={() => handleSort('party')}
                >
                  To / Issued To ⇅
                </th>
                <th
                  data-sort="1"
                  onClick={() => handleSort('returnable')}
                >
                  Returnable ⇅
                </th>
                <th
                  data-sort="1"
                  onClick={() => handleSort('sourceLocation')}
                >
                  From ⇅
                </th>
                <th>Requested By</th>
                <th
                  data-sort="1"
                  className="num"
                  onClick={() => handleSort('qty')}
                >
                  Qty ⇅
                </th>
                <th
                  data-sort="1"
                  onClick={() => handleSort('status')}
                >
                  Status ⇅
                </th>
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
                    <td>{requestedDateFor(row)}</td>
                    <td>{formatDate(row.date)}</td>
                    <td>{typeLabel(row.issueType)}</td>
                    <td>{partyLabel(row)}</td>
                    <td>{returnableLabel(row.returnable)}</td>
                    <td>{storeNameFor(row)}</td>
                    <td>{requestedByFor(row)}</td>
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
                          stockIssueService.printDocument('/inventory/stock-issue/issue-internal-external', row.id, 'download')
                        }
                      >
                        <span className="material-symbols-rounded">download</span>
                      </button>

                      <button
                        className="ibtn"
                        title="Print"
                        onClick={() =>
                          stockIssueService.printDocument('/inventory/stock-issue/issue-internal-external', row.id, 'print')
                        }
                      >
                        <span className="material-symbols-rounded">print</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={LIST_COLUMN_COUNT}>
                    <div className="empty">
                      <span className="material-symbols-rounded">
                        folder_open
                      </span>
                      No records found. Click “Add Issue”.
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
        body="The document will be permanently removed from the database."
        okLabel="Delete"
        danger
        busy={removeMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}