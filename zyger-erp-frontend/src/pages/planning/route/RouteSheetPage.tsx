import { useEffect, useState } from 'react';
import PlanningDocScreen from '../PlanningDocScreen';
import { ROUTE_SHEET_CONFIG } from '../planningDocConfigs';
import { planningApi } from '../../../services/planning-api';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';
import { exportToCsv } from '../../../utils/csvExport';

interface ResourceUtilizationRow {
  resourceId: number;
  resourceCode: string;
  resourceName: string;
  resourceType: string;
  department?: string;
  capacity: number;
  capacityUom: string;
  assignedOperationsCount: number;
  totalSetupTimeMin: number;
  totalCycleTimeMin: number;
  totalTimeMin: number;
  status: string;
}

interface OutsourceProcessRow {
  routeId: number;
  routeNumber: string;
  itemCode: string;
  itemRevision: string;
  routeStatus: string;
  sequenceNo: number;
  processCode: string;
  processName: string;
  resourceName: string;
  resourceType: string;
  processType: string;
  setupTime: number;
  cycleTime: number;
  inspectionRequired: boolean;
  remarks?: string;
}

export default function RouteSheetPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'routes' | 'utilization' | 'outsource'>('routes');

  // Utilization report state
  const [utilRows, setUtilRows] = useState<ResourceUtilizationRow[]>([]);
  const [utilLoading, setUtilLoading] = useState(false);
  const [utilSearch, setUtilSearch] = useState('');

  // Outsource report state
  const [outsourceRows, setOutsourceRows] = useState<OutsourceProcessRow[]>([]);
  const [outsourceLoading, setOutsourceLoading] = useState(false);
  const [outsourceSearch, setOutsourceSearch] = useState('');

  const loadUtilizationReport = async () => {
    setUtilLoading(true);
    try {
      const res = await planningApi.getResourceUtilizationReport();
      setUtilRows(Array.isArray(res?.content) ? res.content : []);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load Resource Utilization Report'), 'error');
    }
    setUtilLoading(false);
  };

  const loadOutsourceReport = async () => {
    setOutsourceLoading(true);
    try {
      const res = await planningApi.getOutsourceProcessReport();
      setOutsourceRows(Array.isArray(res?.content) ? res.content : []);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Failed to load Outsource Process Report'), 'error');
    }
    setOutsourceLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'utilization') loadUtilizationReport();
    if (activeTab === 'outsource') loadOutsourceReport();
  }, [activeTab]);

  const filteredUtilRows = utilRows.filter((r) => {
    if (!utilSearch.trim()) return true;
    const q = utilSearch.toLowerCase();
    return (
      r.resourceCode?.toLowerCase().includes(q) ||
      r.resourceName?.toLowerCase().includes(q) ||
      r.resourceType?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q)
    );
  });

  const filteredOutsourceRows = outsourceRows.filter((r) => {
    if (!outsourceSearch.trim()) return true;
    const q = outsourceSearch.toLowerCase();
    return (
      r.routeNumber?.toLowerCase().includes(q) ||
      r.itemCode?.toLowerCase().includes(q) ||
      r.processCode?.toLowerCase().includes(q) ||
      r.processName?.toLowerCase().includes(q) ||
      r.resourceName?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Sub-Header Module Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--panel-bg, #ffffff)',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e5e7eb)',
          marginBottom: '16px',
        }}
      >
        <button
          className={`btn btn-sm ${activeTab === 'routes' ? 'btn-p' : ''}`}
          onClick={() => setActiveTab('routes')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
            route
          </span>
          Route Sheets
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'utilization' ? 'btn-p' : ''}`}
          onClick={() => setActiveTab('utilization')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
            precision_manufacturing
          </span>
          Resource Utilization Report
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'outsource' ? 'btn-p' : ''}`}
          onClick={() => setActiveTab('outsource')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
            local_shipping
          </span>
          Outsource Process Report
        </button>
      </div>

      {activeTab === 'routes' && <PlanningDocScreen config={ROUTE_SHEET_CONFIG} />}

      {activeTab === 'utilization' && (
        <>
          <div className="pg-head">
            <h1>Process-wise Resource Utilization Report</h1>
            <p>FRD §7.2 — Cross-reference of Route Sheet operation sequences against Resource Master capacity</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div className="panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Active Resources</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#1f2937' }}>
                {utilRows.length}
              </div>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Total Assigned Ops</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#2563eb' }}>
                {utilRows.reduce((acc, r) => acc + (r.assignedOperationsCount || 0), 0)}
              </div>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Total Setup Time</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#059669' }}>
                {utilRows.reduce((acc, r) => acc + Number(r.totalSetupTimeMin || 0), 0)} min
              </div>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Total Cycle Time</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#d97706' }}>
                {utilRows.reduce((acc, r) => acc + Number(r.totalCycleTimeMin || 0), 0)} min
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="toolbar">
              <div className="searchwrap">
                <span className="material-symbols-rounded">search</span>
                <input
                  className="in"
                  value={utilSearch}
                  placeholder="Search resources..."
                  onChange={(e) => setUtilSearch(e.target.value)}
                />
              </div>
              <button
                className="ibtn"
                title="Export CSV"
                onClick={() =>
                  exportToCsv(
                    filteredUtilRows as unknown as Record<string, unknown>[],
                    [
                      { key: 'resourceCode', label: 'Resource Code' },
                      { key: 'resourceName', label: 'Resource Name' },
                      { key: 'resourceType', label: 'Resource Type' },
                      { key: 'department', label: 'Department' },
                      { key: 'capacity', label: 'Capacity' },
                      { key: 'capacityUom', label: 'Capacity UOM' },
                      { key: 'assignedOperationsCount', label: 'Assigned Ops' },
                      { key: 'totalSetupTimeMin', label: 'Setup Time (min)' },
                      { key: 'totalCycleTimeMin', label: 'Cycle Time (min)' },
                      { key: 'totalTimeMin', label: 'Total Time (min)' },
                      { key: 'status', label: 'Status' },
                    ],
                    'resource-utilization-report'
                  )
                }
              >
                <span className="material-symbols-rounded">download</span>
              </button>
              <button className="btn btn-sm" onClick={loadUtilizationReport} disabled={utilLoading}>
                <span className="material-symbols-rounded">refresh</span> Refresh
              </button>
            </div>

            {utilLoading ? (
              <div className="empty">Loading resource utilization report...</div>
            ) : (
              <div className="twrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Resource Code</th>
                      <th>Resource Name</th>
                      <th>Type</th>
                      <th>Dept</th>
                      <th className="num">Capacity</th>
                      <th>Capacity UOM</th>
                      <th className="num">Assigned Ops</th>
                      <th className="num">Setup (min)</th>
                      <th className="num">Cycle (min)</th>
                      <th className="num">Total Time (min)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUtilRows.map((r) => (
                      <tr key={r.resourceId}>
                        <td>{r.resourceCode}</td>
                        <td style={{ fontWeight: 600 }}>{r.resourceName}</td>
                        <td>
                          <StatusBadge status={r.resourceType} />
                        </td>
                        <td>{r.department || '—'}</td>
                        <td className="num">{r.capacity}</td>
                        <td>{r.capacityUom}</td>
                        <td className="num" style={{ fontWeight: 600 }}>
                          {r.assignedOperationsCount}
                        </td>
                        <td className="num">{r.totalSetupTimeMin}</td>
                        <td className="num">{r.totalCycleTimeMin}</td>
                        <td className="num" style={{ fontWeight: 700, color: '#2563eb' }}>
                          {r.totalTimeMin}
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                    {filteredUtilRows.length === 0 && (
                      <tr>
                        <td colSpan={11} className="empty">
                          No resource utilization records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'outsource' && (
        <>
          <div className="pg-head">
            <h1>Outsource Process Report</h1>
            <p>FRD §7.3 — All Route Sheet operations assigned to external vendors or outsource processes</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div className="panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Total Outsource Ops</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#7c3aed' }}>
                {outsourceRows.length}
              </div>
            </div>
            <div className="panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Unique Items</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#1f2937' }}>
                {new Set(outsourceRows.map((r) => r.itemCode)).size}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="toolbar">
              <div className="searchwrap">
                <span className="material-symbols-rounded">search</span>
                <input
                  className="in"
                  value={outsourceSearch}
                  placeholder="Search outsource operations..."
                  onChange={(e) => setOutsourceSearch(e.target.value)}
                />
              </div>
              <button
                className="ibtn"
                title="Export CSV"
                onClick={() =>
                  exportToCsv(
                    filteredOutsourceRows as unknown as Record<string, unknown>[],
                    [
                      { key: 'routeNumber', label: 'Route Sheet No' },
                      { key: 'itemCode', label: 'Item Code' },
                      { key: 'itemRevision', label: 'Revision' },
                      { key: 'sequenceNo', label: 'Seq #' },
                      { key: 'processCode', label: 'Process Code' },
                      { key: 'processName', label: 'Process Name' },
                      { key: 'resourceName', label: 'Vendor / Resource' },
                      { key: 'processType', label: 'Process Type' },
                      { key: 'setupTime', label: 'Setup (min)' },
                      { key: 'cycleTime', label: 'Cycle (min)' },
                      { key: 'inspectionRequired', label: 'QC Required' },
                      { key: 'routeStatus', label: 'Route Status' },
                    ],
                    'outsource-process-report'
                  )
                }
              >
                <span className="material-symbols-rounded">download</span>
              </button>
              <button className="btn btn-sm" onClick={loadOutsourceReport} disabled={outsourceLoading}>
                <span className="material-symbols-rounded">refresh</span> Refresh
              </button>
            </div>

            {outsourceLoading ? (
              <div className="empty">Loading outsource process report...</div>
            ) : (
              <div className="twrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Route No</th>
                      <th>Item</th>
                      <th>Rev</th>
                      <th className="num">Seq</th>
                      <th>Process</th>
                      <th>Vendor / Resource</th>
                      <th>Process Type</th>
                      <th className="num">Setup (min)</th>
                      <th className="num">Cycle (min)</th>
                      <th>QC</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutsourceRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.routeNumber}</td>
                        <td>{r.itemCode}</td>
                        <td>{r.itemRevision}</td>
                        <td className="num">{r.sequenceNo}</td>
                        <td>
                          {r.processCode} — {r.processName}
                        </td>
                        <td style={{ fontWeight: 600, color: '#6d28d9' }}>{r.resourceName}</td>
                        <td>
                          <StatusBadge status={r.processType} />
                        </td>
                        <td className="num">{r.setupTime}</td>
                        <td className="num">{r.cycleTime}</td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: r.inspectionRequired ? '#dcfce7' : '#f3f4f6',
                              color: r.inspectionRequired ? '#166534' : '#6b7280',
                            }}
                          >
                            {r.inspectionRequired ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={r.routeStatus} />
                        </td>
                      </tr>
                    ))}
                    {filteredOutsourceRows.length === 0 && (
                      <tr>
                        <td colSpan={11} className="empty">
                          No outsource operations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
