import { formatNumber } from '../../../utils/format';

interface ReportPagerProps {
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function ReportPager({
  page,
  pageSize,
  totalElements,
  totalPages,
  onChange,
}: ReportPagerProps) {
  const start = totalElements === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalElements);

  return (
    <div className="pager">
      <span>
        Showing {start}–{end} of {formatNumber(totalElements)}
      </span>
      <div className="pgs">
        <button
          disabled={page === 0}
          onClick={() => onChange(Math.max(0, page - 1))}
        >
          ‹
        </button>
        {Array.from({ length: Math.max(1, totalPages) }, (_, index) => index).map(
          (pageIndex) => (
            <button
              key={pageIndex}
              className={pageIndex === page ? 'on' : ''}
              onClick={() => onChange(pageIndex)}
            >
              {pageIndex + 1}
            </button>
          )
        )}
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        >
          ›
        </button>
      </div>
    </div>
  );
}