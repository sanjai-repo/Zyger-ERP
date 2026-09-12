import { useEffect, useMemo, useState } from 'react';
import { useQualityInspectionList, useQualityInspectionDelete } from '../../../hooks/useQuality';
import type { InspectionListRowDto, InspectionStatus, InspectionType } from '../../../types/quality/quality.types';
import { formatDate, formatNumber } from '../../../utils/format';
import { getApiErrorMessage } from '../../../utils/apiError';
import { useToast } from '../../../contexts/ToastContext';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import { exportToCsv } from '../../../utils/csvExport';

const PAGE_SIZE = 8;

const STATUS_OPTIONS: InspectionStatus[] = [
  'DRAFT',
  'IN_PROGRESS',
  'SUBMITTED',
  'PASS',
  'HOLD',
  'FAIL',
  'APPROVED',
  'CLOSED',
  'CANCELLED',
];

const TYPE_OPTIONS: InspectionType[] = ['IQC', 'LO', 'JOMIN', 'FAI', 'IPQC', 'LINE', 'LAST_OFF', 'FINAL'];

const TYPE_LABELS: Record<InspectionType, string> = {
  IQC: 'Inward (IQC)',
  LO: 'LO',
  JOMIN: 'JOMIN',
  FAI: 'First Article (FAI)',
  IPQC: 'Process (IPQC)',
  LINE: 'Line',
  LAST_OFF: 'Last Off',
  FINAL: 'Final',
};

interface ColumnConfig {
  label: string;
  field: keyof InspectionListRowDto;
  numeric?: boolean;
}

const COLUMNS: ColumnConfig[] = [
  { label: 'Doc No', field: 'docNo' },
  { label: 'Date', field: 'inspectionDate' },
  { label: 'Type', field: 'inspectionType' },
  { label: 'Item', field: 'itemCode' },
  { label: 'Insp Qty', field: 'inspectionQuantity', numeric: true },
  { label: 'Recv Qty', field: 'receivedQuantity', numeric: true },
  { label: 'Result', field: 'decisionStatus' },
  { label: 'Status', field: 'inspectionStatus' },
];

interface QualityListProps {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  defaultStatus?: string;
  defaultInspectionType?: InspectionType;
}

export default function QualityList({ onAdd, onEdit, onView, defaultStatus = '', defaultInspectionType }: QualityListProps) {
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(defaultStatus);
  const [type, setType] = useState<InspectionType | ''>(defaultInspectionType ?? '');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<keyof InspectionListRowDto>('inspectionDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] = useState<InspectionListRowDto | null>(null);

  const deleteMutation = useQualityInspectionDelete();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus]);

  useEffect(() => {
    setType(defaultInspectionType ?? '');
  }, [defaultInspectionType]);

  useEffect(() => {
    setPage(0);
  }, [search, status, type]);

  const params = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      sort: `${String(sortField)},${sortDir}`,
      search,
      status: (status || undefined) as InspectionStatus | undefined,
      inspectionType: type || undefined,
    }),
    [page, sortField, sortDir, search, status, type]
  );

  const { data, isPending, isError, error, refetch } = useQualityInspectionList(params);

  const rows = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSort = (field: keyof InspectionListRowDto) => {
    if (sortField === field) {
      setSortDir((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }

    setPage(0);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
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
          Loading inspection records...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="panel">
        <div className="empty">
          <span className="material-symbols-rounded">error</span>
          {getApiErrorMessage(error, 'Unable to load inspection records.')}
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
      <div className="panel">
        <div className="toolbar" style={{ gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="searchwrap" style={{ flex: '0 0 auto' }}>
            <span className="material-symbols-rounded">search</span>
            <input
              className="in"
              style={{ width: '240px' }}
              value={searchInput}
              placeholder="Search doc no / item..."
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <button
            className="ibtn"
            title="Export CSV"
            onClick={() =>
              exportToCsv(
                rows as unknown as Record<string, unknown>[],
                COLUMNS.map((c) => ({
                  key: String(c.field),
                  label: c.label,
                  render: (value: unknown, row: Record<string, unknown>) => {
                    const r = row as unknown as InspectionListRowDto;
                    return c.field === 'inspectionDate'
                      ? formatDate(r.inspectionDate)
                      : c.field === 'inspectionType'
                        ? TYPE_LABELS[r.inspectionType] ?? String(r.inspectionType ?? '')
                        : c.field === 'itemCode'
                          ? r.itemCode || ''
                          : String(value ?? '');
                  },
                })),
                'quality-inspections'
              )
            }
          >
            <span className="material-symbols-rounded">download</span>
          </button>

          <select
            className="in"
            style={{ flex: '0 0 auto', width: '160px' }}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            className="in"
            style={{ flex: '0 0 auto', width: '180px' }}
            value={type}
            disabled={Boolean(defaultInspectionType)}
            onChange={(event) => setType(event.target.value as InspectionType | '')}
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {TYPE_LABELS[option]}
              </option>
            ))}
          </select>

          <span className="count" style={{ marginLeft: '4px' }}>
            {formatNumber(totalElements)} record{totalElements === 1 ? '' : 's'}
          </span>

          <div className="sp" />

          <button className="btn btn-p" onClick={onAdd}>
            <span className="material-symbols-rounded">add</span>
            New Inspection
          </button>
        </div>

        <div className="twrap">
          <table className="tbl">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={String(column.field)}
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
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="cell-b">{row.docNo}</span>
                    </td>
                    <td>{formatDate(row.inspectionDate)}</td>
                    <td>{TYPE_LABELS[row.inspectionType] ?? row.inspectionType}</td>
                    <td>{row.itemCode || '—'}</td>
                    <td className="num">{formatNumber(row.inspectionQuantity ?? 0)}</td>
                    <td className="num">{formatNumber(row.receivedQuantity ?? 0)}</td>
                    <td>
                      {row.decisionStatus ? (
                        <StatusBadge status={row.decisionStatus} />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <StatusBadge status={row.inspectionStatus} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="ibtn"
                        title="View"
                        onClick={() => onView(String(row.id))}
                      >
                        <span className="material-symbols-rounded">visibility</span>
                      </button>

                      <button
                        className="ibtn"
                        title="Edit / Open"
                        onClick={() => onEdit(String(row.id))}
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
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={COLUMNS.length + 1}>
                    <div className="empty">
                      <span className="material-symbols-rounded">fact_check</span>
                      No inspections found. Click “New Inspection”.
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

            {Array.from({ length: totalPages }, (_, index) => index).map((pageIndex) => (
              <button
                key={pageIndex}
                className={pageIndex === page ? 'on' : ''}
                onClick={() => setPage(pageIndex)}
              >
                {pageIndex + 1}
              </button>
            ))}

            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((previous) => Math.min(totalPages - 1, previous + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.docNo ?? ''}`}
        body="The inspection will be permanently removed. Only DRAFT/REJECTED inspections can be deleted."
        okLabel="Delete"
        danger
        busy={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
