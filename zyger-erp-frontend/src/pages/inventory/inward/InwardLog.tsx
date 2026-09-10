import { useEffect, useMemo, useState } from 'react';
import { useTabs } from '../../../contexts/TabsContext';
import {
  INWARD_TYPES,
  INWARD_TYPE_LIST,
  type InwardType,
} from '../../../config/inwardConfig';
import { useInwardLog } from '../../../hooks/useInward';
import { inwardService } from '../../../services/inwardService';
import { formatDate, formatMoney, formatNumber } from '../../../utils/format';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';
import InwardForm from './InwardForm';

const STATUS_OPTIONS = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'POSTED',
  'REJECTED',
  'CANCELLED',
];

const TYPE_LABELS: Record<InwardType, string> = {
  PO_INWARD: 'PO',
  LO_INWARD: 'LO',
  JO_INWARD: 'JO',
  GENERAL_INWARD: 'General',
};

function toInwardType(raw: string): InwardType {
  return raw in INWARD_TYPES ? (raw as InwardType) : 'PO_INWARD';
}

export default function InwardLog() {
  const { openTab, closeTab } = useTabs();
  const query = useInwardLog();
  const allRows = useMemo(() => query.data ?? [], [query.data]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const rows = useMemo(() => {
    const needle = search.toLowerCase();

    return allRows.filter((row) => {
      if (type && String(row.type) !== type) {
        return false;
      }
      if (status && row.status !== status) {
        return false;
      }
      if (fromDate && String(row.date).slice(0, 10) < fromDate) {
        return false;
      }
      if (toDate && String(row.date).slice(0, 10) > toDate) {
        return false;
      }
      if (needle) {
        const haystack = String(
          `${row.docNo} ${row.itemCode ?? ''} ${row.itemName ?? ''} ${
            row.reference ?? ''
          } ${row.party ?? ''}`
        ).toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [allRows, type, status, fromDate, toDate, search]);

  const getNetAmount = (r: typeof allRows[0]): number => {
    if (typeof r.netAmount === 'number' && r.netAmount > 0) return r.netAmount;
    if (Array.isArray(r.lines) && r.lines.length > 0) {
      const sumNet = r.lines.reduce((sum, l) => sum + (Number(l.netAmount) || 0), 0);
      if (sumNet > 0) return sumNet;
    }
    const base = r.totalAmount ?? 0;
    const tax = typeof r.taxAmount === 'number' ? r.taxAmount : 0;
    return base + tax;
  };

  const openView = (row: (typeof allRows)[number]) => {
    const tabId = `inward-view-${row.id}`;
    openTab({
      id: tabId,
      label: `${row.docNo} — View`,
      icon: 'visibility',
      component: InwardForm,
      props: {
        inwardType: toInwardType(String(row.type)),
        documentId: String(row.id),
        viewOnly: true,
        onBack: () => closeTab(tabId),
        onSaved: () => undefined,
      },
    });
  };

  return (
    <div className="panel">
      <div className="panel-h">
        <h2>
          <span className="material-symbols-rounded">history</span>
          Inward Log
        </h2>
        <span className="count">{formatNumber(rows.length)} records</span>
      </div>

      <div className="toolbar" style={{ gap: '8px', justifyContent: 'flex-start' }}>
        <div className="searchwrap" style={{ flex: '0 0 auto' }}>
          <span className="material-symbols-rounded">search</span>
          <input
            className="in"
            value={searchInput}
            placeholder="Search..."
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select
          className="in"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ flex: '0 0 auto', width: '150px' }}
        >
          <option value="">All Types</option>
          {INWARD_TYPE_LIST.map((config) => (
            <option key={config.type} value={config.type}>
              {config.label}
            </option>
          ))}
        </select>

        <select
          className="in"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ flex: '0 0 auto', width: '150px' }}
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>From</label>
        <input
          type="date"
          className="in"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          style={{ flex: '0 0 auto', width: '160px' }}
        />

        <label style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>To</label>
        <input
          type="date"
          className="in"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          style={{ flex: '0 0 auto', width: '160px' }}
        />
      </div>

      {query.isPending ? (
        <div className="empty">
          <span className="material-symbols-rounded">hourglass_empty</span>
          Loading inward log...
        </div>
      ) : query.isError ? (
        <div className="empty">
          <span className="material-symbols-rounded">error</span>
          {getApiErrorMessage(query.error, 'Unable to load inward log.')}
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
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length > 0 ? (
                rows.map((row, idx) => {
                  const config = INWARD_TYPES[toInwardType(String(row.type))];
                  return (
                    <tr key={String(row.id)}>
                      <td className="num mut">{idx + 1}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <span className="cell-b">{row.docNo}</span>
                      </td>
                      <td>
                        <span className="bdg" style={{ color: config.color }}>
                          {TYPE_LABELS[toInwardType(String(row.type))] ??
                            String(row.type)}
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
                      <td className="num">{formatNumber(row.qty ?? 0)}</td>
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
                          onClick={() => openView(row)}
                        >
                          <span className="material-symbols-rounded">
                            visibility
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
      )}
    </div>
  );
}
