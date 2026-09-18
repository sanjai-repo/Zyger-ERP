import UomName from '../../components/common/UomName';
import { useCallback, useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../contexts/ToastContext';
import { useTabs } from '../../contexts/TabsContext';
import { getScreenComponent } from '../../config/screenRegistry';
import { exportSimpleCsv } from '../../utils/csvExport';
import ReportPager from '../inventory/reports/ReportPager';
import StoreName from '../../components/common/StoreName';

interface RejectedRow {
  sourceType: string;
  stage: string;
  sourceDocNo: string;
  sourceDate: string;
  itemCode: string;
  itemName?: string;
  batchNo?: string;
  location?: string;
  rejectedQty: number;
  uom?: string;
  reason?: string;
  party?: string;
  rate?: number | null;
  value?: number | null;
  disposition?: string;
  linkedRef?: string;
}

interface HeldRow {
  itemCode: string;
  itemName?: string;
  location: string;
  batchNo?: string;
  heatNo?: string;
  stockStatus: string;
  qty: number;
  uom?: string;
}

interface RankItem { name: string; qty: number }

interface Summary {
  totalEvents: number;
  totalQty: number;
  totalValue: number;
  byStage: Record<string, number>;
  byParty: RankItem[];
  byReason: RankItem[];
  topParty: string;
  topReason: string;
}

type Tab = 'all' | 'held' | 'party' | 'reason';

const PAGE_SIZE = 25;

const STAGES = ['Inward', 'Inspection', 'Production', 'Return', 'Customer Return'];

const SOURCE_LABELS: Record<string, string> = {
  PO_INWARD: 'PO Inward',
  GENERAL_INWARD: 'General Inward',
  LO_INWARD: 'LO Inward',
  JO_INWARD: 'JO Inward',
  INSPECTION_IQC: 'IQC Inspection',
  INSPECTION_LO: 'LO Inspection',
  INSPECTION_JOMIN: 'JOMIN Inspection',
  INSPECTION_FAI: 'First Inspection',
  INSPECTION_IPQC: 'Process Inspection',
  INSPECTION_LINE: 'Line Inspection',
  INSPECTION_LAST_OFF: 'Last Off Inspection',
  INSPECTION_FINAL: 'Final Inspection',
  PRODUCTION_REJECTION: 'Production Rejection',
  PRODUCTION_ENTRY: 'Production Entry',
  STOCK_RETURN: 'Stock Return',
  DC_RETURN: 'DC Return',
  INVOICE_RETURN: 'Invoice Return',
};

const SOURCE_SCREEN: Record<string, { screenId: string; icon: string }> = {
  PO_INWARD: { screenId: 'inward-entry', icon: 'move_to_inbox' },
  GENERAL_INWARD: { screenId: 'inward-entry', icon: 'move_to_inbox' },
  LO_INWARD: { screenId: 'inward-entry', icon: 'move_to_inbox' },
  JO_INWARD: { screenId: 'inward-entry', icon: 'move_to_inbox' },
  INSPECTION_IQC: { screenId: 'inward-inspection-iqc', icon: 'fact_check' },
  INSPECTION_LO: { screenId: 'lo-inspection', icon: 'fact_check' },
  INSPECTION_JOMIN: { screenId: 'jomin-inspection', icon: 'fact_check' },
  INSPECTION_FAI: { screenId: 'first-inspection', icon: 'fact_check' },
  INSPECTION_IPQC: { screenId: 'process-inspection-ipqc', icon: 'fact_check' },
  INSPECTION_LINE: { screenId: 'line-inspection', icon: 'fact_check' },
  INSPECTION_LAST_OFF: { screenId: 'last-off-inspection', icon: 'fact_check' },
  INSPECTION_FINAL: { screenId: 'final-inspection', icon: 'fact_check' },
  PRODUCTION_REJECTION: { screenId: 'production-rejections', icon: 'report_problem' },
  PRODUCTION_ENTRY: { screenId: 'production-entry', icon: 'engineering' },
  STOCK_RETURN: { screenId: 'stock-return', icon: 'assignment_return' },
  DC_RETURN: { screenId: 'dc-return', icon: 'keyboard_return' },
  INVOICE_RETURN: { screenId: 'invoice-return', icon: 'receipt_long' },
};

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function RejectedItemsPage() {
  const { toast } = useToast();
  const { openTab } = useTabs();

  const [tab, setTab] = useState<Tab>('all');
  const [rows, setRows] = useState<RejectedRow[]>([]);
  const [held, setHeld] = useState<HeldRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [party, setParty] = useState('');
  const [reason, setReason] = useState('');
  const [heldStatus, setHeldStatus] = useState('');

  type Overrides = Partial<{ search: string; stage: string; sourceType: string; from: string; to: string; party: string; reason: string }>;

  const filterParams = useCallback((o: Overrides = {}) => {
    const v = { search, stage, sourceType, from, to, party, reason, ...o };
    const p = new URLSearchParams();
    (Object.entries(v) as [string, string][]).forEach(([k, val]) => { if (val) p.set(k, val); });
    return p;
  }, [search, stage, sourceType, from, to, party, reason]);

  // Overrides let a click (stage chip, drill-down link, Clear) reload with its new value
  // immediately instead of waiting for the state update to reach the next render.
  const load = useCallback(async (targetPage = 0, o: Overrides = {}) => {
    setLoading(true);
    try {
      const p = filterParams(o);
      p.set('page', String(targetPage));
      p.set('size', String(PAGE_SIZE));
      const [listRes, heldRes] = await Promise.all([
        axiosClient.get(`/v1/quality/rejected-items?${p}`),
        axiosClient.get(`/v1/quality/rejected-items/held${(o.search ?? search) ? `?itemCode=${encodeURIComponent(o.search ?? search)}` : ''}`),
      ]);
      setRows(listRes.data.content as RejectedRow[]);
      setSummary(listRes.data.summary as Summary);
      setTotalElements(listRes.data.totalElements as number);
      setTotalPages(listRes.data.totalPages as number);
      setPage(targetPage);
      setHeld(heldRes.data as HeldRow[]);
    } catch {
      toast('Failed to load rejected items', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterParams, search, toast]);

  useEffect(() => { load(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearFilters = () => {
    setSearch(''); setStage(''); setSourceType(''); setFrom(''); setTo(''); setParty(''); setReason('');
  };

  const downloadServer = async (format: 'xlsx' | 'pdf') => {
    try {
      const isHeld = tab === 'held';
      const p = isHeld ? new URLSearchParams() : filterParams();
      p.set('format', format);
      const res = await axiosClient.get(
        `/v1/quality/rejected-items${isHeld ? '/held' : ''}/export?${p}`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${isHeld ? 'rejected-stock-held' : 'rejected-items'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast('Export failed', 'error');
    }
  };

  const openSource = (r: RejectedRow) => {
    const target = SOURCE_SCREEN[r.sourceType];
    if (!target) return;
    openTab({
      id: target.screenId,
      label: SOURCE_LABELS[r.sourceType] ?? r.sourceType,
      icon: target.icon,
      component: getScreenComponent(target.screenId),
      props: { title: SOURCE_LABELS[r.sourceType] ?? r.sourceType, screenId: target.screenId },
    });
  };

  const openScreen = (screenId: string, label: string, icon: string) => {
    openTab({ id: screenId, label, icon, component: getScreenComponent(screenId), props: { title: label, screenId } });
  };

  const visibleHeld = useMemo(
    () => (heldStatus ? held.filter((h) => h.stockStatus === heldStatus) : held),
    [held, heldStatus],
  );
  const heldQty = useMemo(() => held.reduce((s, h) => s + Number(h.qty), 0), [held]);

  const kpis = [
    { label: 'Rejected Qty', value: fmt(summary?.totalQty), icon: 'block', color: 'var(--red)' },
    { label: 'Rejection Events', value: fmt(summary?.totalEvents), icon: 'event_busy', color: 'var(--yellow)' },
    { label: 'Rejected Value (₹)', value: fmt(summary?.totalValue), icon: 'currency_rupee', color: 'var(--blue)' },
    { label: 'Top Supplier / Party', value: summary?.topParty ?? '—', icon: 'local_shipping', color: 'var(--purple, #7c3aed)' },
    { label: 'Top Reason', value: summary?.topReason ?? '—', icon: 'report', color: 'var(--orange, #ea580c)' },
    { label: 'Held in Rejected Stock', value: fmt(heldQty), icon: 'inventory_2', color: 'var(--green)' },
  ];

  return (
    <div>
      <div className="panel">
        <div className="panel-h">
          <h2><span className="material-symbols-rounded">block</span> Rejected Items</h2>
        </div>
        <div className="ir-kpi-grid" style={{ padding: '0 16px' }}>
          {kpis.map((k) => (
            <div key={k.label} className="ir-kpi-tile" style={{ cursor: 'default' }}>
              <div className="ir-kpi-top">
                <span className="ir-kpi-label">{k.label}</span>
                <span className="ir-kpi-ic" style={{ color: k.color, background: `color-mix(in srgb, ${k.color} 16%, transparent)` }}>
                  <span className="material-symbols-rounded">{k.icon}</span>
                </span>
              </div>
              <div className="ir-kpi-value" style={{ fontSize: k.value.length > 12 ? 16 : undefined }}>{k.value}</div>
            </div>
          ))}
        </div>

        {summary && Object.keys(summary.byStage).length > 0 && (
          <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(summary.byStage).map(([s, q]) => (
              <button key={s} className={`btn btn-sm ${stage === s ? 'btn-p' : ''}`}
                onClick={() => { const next = stage === s ? '' : s; setStage(next); load(0, { stage: next }); }}>
                {s}: <b>{fmt(q)}</b>
              </button>
            ))}
          </div>
        )}

        <div className="toolbar" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input className="in" placeholder="Search doc, item, party, reason…" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(0)} style={{ width: 240 }} />
          <select className="in" value={stage} onChange={(e) => setStage(e.target.value)} style={{ width: 150 }}>
            <option value="">All stages</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="in" value={sourceType} onChange={(e) => setSourceType(e.target.value)} style={{ width: 180 }}>
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="in" type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
          <input className="in" type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
          <input className="in" placeholder="Supplier / customer" value={party} onChange={(e) => setParty(e.target.value)} style={{ width: 160 }} />
          <input className="in" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: 140 }} />
          <button className="btn btn-p" onClick={() => load(0)} disabled={loading}>
            <span className="material-symbols-rounded">search</span> Apply
          </button>
          <button className="btn" onClick={() => { clearFilters(); load(0, { search: '', stage: '', sourceType: '', from: '', to: '', party: '', reason: '' }); }}>Clear</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => downloadServer('xlsx')}>
            <span className="material-symbols-rounded">table_view</span> Excel
          </button>
          <button className="btn" onClick={() => downloadServer('pdf')}>
            <span className="material-symbols-rounded">picture_as_pdf</span> PDF
          </button>
          <button className="btn" onClick={() => {
            const data = tab === 'held' ? visibleHeld : tab === 'party' ? summary?.byParty : tab === 'reason' ? summary?.byReason : rows;
            exportSimpleCsv((data ?? []) as unknown as Record<string, unknown>[], 'rejected-items');
          }}>
            <span className="material-symbols-rounded">download</span> CSV
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px' }}>
          <button className={`btn ${tab === 'all' ? 'btn-p' : ''}`} onClick={() => setTab('all')}>All Rejections</button>
          <button className={`btn ${tab === 'held' ? 'btn-p' : ''}`} onClick={() => setTab('held')}>Currently Held Stock</button>
          <button className={`btn ${tab === 'party' ? 'btn-p' : ''}`} onClick={() => setTab('party')}>By Supplier / Party</button>
          <button className={`btn ${tab === 'reason' ? 'btn-p' : ''}`} onClick={() => setTab('reason')}>By Reason</button>
        </div>
      </div>

      {tab === 'all' && (
        <div className="panel">
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th><th>Stage</th><th>Source</th><th>Document</th><th>Item</th><th>Batch</th>
                  <th>Location</th><th className="num">Rejected Qty</th><th>Reason</th><th>Supplier / Customer</th>
                  <th className="num">Value (₹)</th><th>Disposition</th><th>Linked Doc</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} className="empty">Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={14} className="empty">No rejected items found</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={`${r.sourceType}-${r.sourceDocNo}-${r.itemCode}-${i}`}>
                    <td>{r.sourceDate}</td>
                    <td>{r.stage}</td>
                    <td>{SOURCE_LABELS[r.sourceType] ?? r.sourceType}</td>
                    <td>
                      {SOURCE_SCREEN[r.sourceType]
                        ? <a href="#" onClick={(e) => { e.preventDefault(); openSource(r); }}><b>{r.sourceDocNo}</b></a>
                        : <b>{r.sourceDocNo}</b>}
                    </td>
                    <td><b>{r.itemCode}</b>{r.itemName ? <div className="mut" style={{ fontSize: 12 }}>{r.itemName}</div> : null}</td>
                    <td>{r.batchNo || '—'}</td>
                    <td><StoreName code={r.location} /></td>
                    <td className="num" style={{ color: 'var(--red)', fontWeight: 600 }}>{fmt(r.rejectedQty)} <UomName value={r.uom} /></td>
                    <td>{r.reason || '—'}</td>
                    <td>{r.party || '—'}</td>
                    <td className="num">{fmt(r.value)}</td>
                    <td>{r.disposition || '—'}</td>
                    <td>{r.linkedRef || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {(r.stage === 'Inward' || r.stage === 'Inspection') && r.party ? (
                        <button className="btn btn-sm" title="Open Purchase Return to send this back to the supplier" onClick={() => openScreen('purchase-return', 'Purchase Return', 'assignment_return')}>Return to supplier</button>
                      ) : null}{' '}
                      <button className="btn btn-sm" title="Open Non-Conformance Report" onClick={() => openScreen('quality-ncr', 'Non-Conformance Report', 'report')}>Raise NCR</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReportPager page={page} pageSize={PAGE_SIZE} totalElements={totalElements} totalPages={totalPages} onChange={(p) => load(p)} />
        </div>
      )}

      {tab === 'held' && (
        <div className="panel">
          <div className="toolbar" style={{ gap: 8 }}>
            <select className="in" value={heldStatus} onChange={(e) => setHeldStatus(e.target.value)} style={{ width: 180 }}>
              <option value="">All held statuses</option>
              {['REJECTED', 'SCRAP', 'DAMAGED', 'QUARANTINE', 'BLOCKED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="mut">Stock physically sitting in non-usable buckets right now.</span>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Item</th><th>Location</th><th>Batch</th><th>Heat</th><th>Status</th><th className="num">Qty</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="empty">Loading...</td></tr>
                ) : visibleHeld.length === 0 ? (
                  <tr><td colSpan={6} className="empty">No stock is currently held as rejected / scrap / damaged / quarantine</td></tr>
                ) : visibleHeld.map((h, i) => (
                  <tr key={i}>
                    <td><b>{h.itemCode}</b>{h.itemName ? <div className="mut" style={{ fontSize: 12 }}>{h.itemName}</div> : null}</td>
                    <td><StoreName code={h.location} /></td>
                    <td>{h.batchNo || '—'}</td>
                    <td>{h.heatNo || '—'}</td>
                    <td><span style={{ color: 'var(--red)' }}>{h.stockStatus}</span></td>
                    <td className="num">{fmt(h.qty)} <UomName value={h.uom} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(tab === 'party' || tab === 'reason') && (
        <div className="panel">
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>#</th><th>{tab === 'party' ? 'Supplier / Customer' : 'Reason'}</th><th className="num">Rejected Qty</th></tr>
              </thead>
              <tbody>
                {(tab === 'party' ? summary?.byParty : summary?.byReason)?.length ? (
                  (tab === 'party' ? summary!.byParty : summary!.byReason).map((x, i) => (
                    <tr key={x.name}>
                      <td>{i + 1}</td>
                      <td>
                        <a href="#" onClick={(e) => {
                          e.preventDefault();
                          if (tab === 'party') setParty(x.name); else setReason(x.name);
                          setTab('all');
                          load(0, tab === 'party' ? { party: x.name } : { reason: x.name });
                        }}><b>{x.name}</b></a>
                      </td>
                      <td className="num">{fmt(x.qty)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="empty">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
