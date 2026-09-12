import { useState, useEffect } from 'react';
import { useToast } from '../../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../../utils/apiError';

type AllotTab =
  | 'allotment'
  | 'ageing'
  | 'release'
  | 'amendment'
  | 'pending'
  | 'variance';

export default function AllotmentAdjustmentReports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AllotTab>('allotment');
  const [loading, setLoading] = useState<boolean>(false);

  // Allotment Register
  const [allotStartDate, setAllotStartDate] = useState<string>('');
  const [allotEndDate, setAllotEndDate] = useState<string>('');
  const [allotStatus, setAllotStatus] = useState<string>('ALL');
  const [allotRows, setAllotRows] = useState<any[]>([]);

  const [ageingRows, setAgeingRows] = useState<any[]>([]);

  // Release Register
  const [releaseStartDate, setReleaseStartDate] = useState<string>('');
  const [releaseEndDate, setReleaseEndDate] = useState<string>('');
  const [releaseStatus, setReleaseStatus] = useState<string>('ALL');
  const [releaseRows, setReleaseRows] = useState<any[]>([]);

  // Amendment Analysis
  const [amendmentType, setAmendmentType] = useState<string>('ALL');
  const [amendStartDate, setAmendStartDate] = useState<string>('');
  const [amendEndDate, setAmendEndDate] = useState<string>('');
  const [amendReason, setAmendReason] = useState<string>('');
  const [amendmentRows, setAmendmentRows] = useState<any[]>([]);

  // Pending Approval
  const [pendingModule, setPendingModule] = useState<string>('ALL');
  const [pendingRows, setPendingRows] = useState<any[]>([]);

  // Physical Variance
  const [varLocation, setVarLocation] = useState<string>('');
  const [varItem, setVarItem] = useState<string>('');
  const [varianceRows, setVarianceRows] = useState<any[]>([]);

  const fetchAllotment = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (allotStartDate) q.set('startDate', allotStartDate);
      if (allotEndDate) q.set('endDate', allotEndDate);
      if (allotStatus !== 'ALL') q.set('status', allotStatus);
      const res = await fetch(`/api/inventory/allotment/reports/register?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch allotment register');
      setAllotRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Allotment Register'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgeing = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/allotment/reports/ageing');
      if (!res.ok) throw new Error('Failed to fetch allotment ageing');
      setAgeingRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Allotment Ageing'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelease = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (releaseStartDate) q.set('startDate', releaseStartDate);
      if (releaseEndDate) q.set('endDate', releaseEndDate);
      if (releaseStatus !== 'ALL') q.set('status', releaseStatus);
      const res = await fetch(`/api/inventory/allotment/reports/release-register?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch release register');
      setReleaseRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Release Register'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAmendment = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (amendmentType !== 'ALL') q.set('type', amendmentType);
      if (amendStartDate) q.set('startDate', amendStartDate);
      if (amendEndDate) q.set('endDate', amendEndDate);
      if (amendReason) q.set('reasonCode', amendReason);
      const res = await fetch(`/api/inventory/adjustment/reports/amendment-analysis?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch amendment analysis');
      setAmendmentRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Amendment Analysis'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (pendingModule !== 'ALL') q.set('module', pendingModule);
      const res = await fetch(`/api/inventory/allotment/reports/pending-approval?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch pending approvals');
      setPendingRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Pending Approvals'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVariance = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (varLocation) q.set('location', varLocation);
      if (varItem) q.set('itemCode', varItem);
      const res = await fetch(`/api/inventory/adjustment/reports/physical-variance?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch physical variance');
      setVarianceRows(await res.json());
    } catch (err) {
      toast(getApiErrorMessage(err, 'Failed to load Physical Variance Report'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'allotment') fetchAllotment();
    else if (activeTab === 'ageing') fetchAgeing();
    else if (activeTab === 'release') fetchRelease();
    else if (activeTab === 'amendment') fetchAmendment();
    else if (activeTab === 'pending') fetchPending();
    else if (activeTab === 'variance') fetchVariance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div>
      <div className="pg-head">
        <h1>
          <span className="material-symbols-rounded" style={{ marginRight: '8px', verticalAlign: 'bottom' }}>all_inclusive</span>
          Stock Allotment & Adjustment Registers & Reports
        </h1>
        <p>Allotment, release, amendment analysis, pending approvals and physical variance</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid var(--border, #e0e0e0)', paddingBottom: '8px' }}>
        {([
          ['allotment', 'table_chart', 'Allotment Register'],
          ['ageing', 'schedule', 'Allotment Ageing'],
          ['release', 'output', 'Release Register'],
          ['amendment', 'analytics', 'Amendment Analysis'],
          ['pending', 'task_alt', 'Pending Approval'],
          ['variance', 'difference', 'Physical Variance'],
        ] as Array<[AllotTab, string, string]>).map(([key, icon, label]) => (
          <button key={key} type="button" className={`btn ${activeTab === key ? 'btn-p' : ''}`} onClick={() => setActiveTab(key)}>
            <span className="material-symbols-rounded">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'allotment' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld"><span>From Date</span><input type="date" className="in" value={allotStartDate} onChange={(e) => setAllotStartDate(e.target.value)} /></label>
            <label className="fld"><span>To Date</span><input type="date" className="in" value={allotEndDate} onChange={(e) => setAllotEndDate(e.target.value)} /></label>
            <label className="fld">
              <span>Status</span>
              <select className="in" value={allotStatus} onChange={(e) => setAllotStatus(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="RELEASED">RELEASED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
            <div className="fld" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-p" onClick={fetchAllotment} disabled={loading}>
                <span className="material-symbols-rounded">search</span>
                Apply Filters
              </button>
            </div>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Allotment No</th><th>Date</th><th>Item Code</th><th>Location</th><th>Total Qty</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : allotRows.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No allotments found</td></tr>
                : allotRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.docNo}</b></td><td>{r.docDate}</td><td>{r.itemCode || '-'}</td><td>{r.location || '-'}</td>
                    <td className="num">{r.totalQty}</td>
                    <td><span className={`badge ${r.status === 'APPROVED' || r.status === 'RELEASED' ? 'success' : r.status === 'CANCELLED' ? 'danger' : 'warn'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ageing' && (
        <div className="panel">
          <div className="panel-h"><h2>Approved Allotments Pending Release (Ageing)</h2></div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Allotment No</th><th>Date</th><th>Item Code</th><th>Location</th><th>Allotted Qty</th><th>Days Ageing</th><th>Bucket</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : ageingRows.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>No pending allotments</td></tr>
                : ageingRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.docNo}</b></td><td>{r.docDate}</td><td>{r.itemCode || '-'}</td><td>{r.location || '-'}</td>
                    <td className="num">{r.allottedQty}</td><td className="num">{r.ageingDays}</td><td>{r.ageingBucket}</td>
                    <td><span className="badge warn">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'release' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld"><span>From Date</span><input type="date" className="in" value={releaseStartDate} onChange={(e) => setReleaseStartDate(e.target.value)} /></label>
            <label className="fld"><span>To Date</span><input type="date" className="in" value={releaseEndDate} onChange={(e) => setReleaseEndDate(e.target.value)} /></label>
            <label className="fld">
              <span>Status</span>
              <select className="in" value={releaseStatus} onChange={(e) => setReleaseStatus(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="POSTED">POSTED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </label>
            <div className="fld" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-p" onClick={fetchRelease} disabled={loading}>
                <span className="material-symbols-rounded">search</span>
                Apply Filters
              </button>
            </div>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Release No</th><th>Date</th><th>Allotment No</th><th>Item Code</th><th>Location</th><th>Total Qty</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : releaseRows.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No releases found</td></tr>
                : releaseRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.docNo}</b></td><td>{r.docDate}</td><td>{r.referenceNo || '-'}</td><td>{r.itemCode || '-'}</td><td>{r.location || '-'}</td>
                    <td className="num">{r.totalQty}</td>
                    <td><span className={`badge ${r.status === 'POSTED' ? 'success' : r.status === 'CANCELLED' ? 'danger' : 'warn'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'amendment' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld">
              <span>Type</span>
              <select className="in" value={amendmentType} onChange={(e) => setAmendmentType(e.target.value)}>
                <option value="ALL">All Types</option>
                <option value="stock-amendment">Stock Amendment</option>
                <option value="physical-stock-amendment">Physical Stock Amendment</option>
              </select>
            </label>
            <label className="fld"><span>From Date</span><input type="date" className="in" value={amendStartDate} onChange={(e) => setAmendStartDate(e.target.value)} /></label>
            <label className="fld"><span>To Date</span><input type="date" className="in" value={amendEndDate} onChange={(e) => setAmendEndDate(e.target.value)} /></label>
            <label className="fld"><span>Reason Code</span><input className="in" value={amendReason} onChange={(e) => setAmendReason(e.target.value)} /></label>
            <div className="fld" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-p" onClick={fetchAmendment} disabled={loading}>
                <span className="material-symbols-rounded">search</span>
                Apply Filters
              </button>
            </div>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Doc No</th><th>Date</th><th>Item Code</th><th>Location</th><th>Reason</th><th>Total Qty</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : amendmentRows.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No amendments found</td></tr>
                : amendmentRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.docNo}</b></td><td>{r.docDate}</td><td>{r.itemCode || '-'}</td><td>{r.location || '-'}</td>
                    <td>{r.reasonCode || '-'}</td><td className="num">{r.totalQty}</td>
                    <td><span className={`badge ${r.status === 'POSTED' ? 'success' : r.status === 'CANCELLED' ? 'danger' : 'warn'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld">
              <span>Module</span>
              <select className="in" value={pendingModule} onChange={(e) => setPendingModule(e.target.value)}>
                <option value="ALL">All Modules</option>
                <option value="allotment">Allotment</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </label>
            <div className="fld" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-p" onClick={fetchPending} disabled={loading}>
                <span className="material-symbols-rounded">search</span>
                Apply Filters
              </button>
            </div>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Doc No</th><th>Date</th><th>Item Code</th><th>Location</th><th>Reason</th><th>Days Ageing</th><th>Bucket</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : pendingRows.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>No pending approvals</td></tr>
                : pendingRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.docNo}</b></td><td>{r.docDate}</td><td>{r.itemCode || '-'}</td><td>{r.location || '-'}</td>
                    <td>{r.reasonCode || '-'}</td><td className="num">{r.ageingDays}</td><td>{r.ageingBucket}</td>
                    <td><span className="badge warn">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'variance' && (
        <div className="panel">
          <div className="fgrid" style={{ marginBottom: '16px' }}>
            <label className="fld"><span>Location</span><input className="in" value={varLocation} onChange={(e) => setVarLocation(e.target.value)} /></label>
            <label className="fld"><span>Item Code</span><input className="in" value={varItem} onChange={(e) => setVarItem(e.target.value)} /></label>
            <div className="fld" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-p" onClick={fetchVariance} disabled={loading}>
                <span className="material-symbols-rounded">search</span>
                Apply Filters
              </button>
            </div>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr><th>Amendment No</th><th>Date</th><th>Location</th><th>Count Team</th><th>Count Sheet</th><th>Item Code</th><th>System</th><th>Physical</th><th>Variance Qty</th><th>Variance %</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>Loading...</td></tr>
                : varianceRows.length === 0 ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>No physical variance records</td></tr>
                : varianceRows.map((r, i) => (
                  <tr key={i}>
                    <td><b>{r.amendmentNo}</b></td><td>{r.docDate}</td><td>{r.location}</td><td>{r.countTeam || '-'}</td><td>{r.countSheetNo || '-'}</td>
                    <td>{r.itemCode}</td><td className="num">{r.systemQty}</td><td className="num">{r.physicalQty}</td>
                    <td className="num">{r.varianceQty}</td><td className="num">{r.variancePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}