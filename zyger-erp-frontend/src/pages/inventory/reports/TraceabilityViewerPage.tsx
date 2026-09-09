import { useState } from 'react';
import { useTabs } from '../../../contexts/TabsContext';
import { useToast } from '../../../contexts/ToastContext';
import { inventoryReportsService } from '../../../services/inventoryReportsService';
import { getApiErrorMessage } from '../../../utils/apiError';
import { formatDate, formatNumber } from '../../../utils/format';
import StatusBadge from '../../../components/common/StatusBadge';
import { docTypeScreenMap } from './docTypeScreenMap';

type TraceNode = {
  nodeId: string;
  docType: string;
  docNo: string;
  date: string;
  status: string;
  qty: number;
  location: string;
  batchNo: string;
  heatNo: string;
  actor: string;
};

type SearchMode = 'item' | 'document';

/** DOCUMENT 02 v2.0 §03.3 — Traceability Viewer: full backward/forward document genealogy. */
export default function TraceabilityViewerPage() {
  const { setActiveTab } = useTabs();
  const { toast } = useToast();

  const [mode, setMode] = useState<SearchMode>('item');
  const [itemCode, setItemCode] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [heatNo, setHeatNo] = useState('');
  const [docType, setDocType] = useState(docTypeScreenMap.DOC_KEYS[0] ?? '');
  const [docNo, setDocNo] = useState('');

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [nodes, setNodes] = useState<TraceNode[]>([]);
  const [error, setError] = useState('');

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const params =
        mode === 'item'
          ? { itemCode: itemCode.trim(), batchNo: batchNo.trim() || undefined, heatNo: heatNo.trim() || undefined }
          : { docType, docNo: docNo.trim() };
      const result = await inventoryReportsService.getTraceability(params);
      if (result.error) {
        setError(result.error);
        setNodes([]);
      } else {
        const sorted = [...result.nodes].sort((a, b) => a.date.localeCompare(b.date));
        setNodes(sorted);
      }
      setSearched(true);
    } catch (err) {
      toast(getApiErrorMessage(err, 'Traceability search failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const canSearch =
    mode === 'item' ? itemCode.trim().length > 0 : docType.length > 0 && docNo.trim().length > 0;

  return (
    <>
      <div className="pg-head">
        <h1>Traceability Viewer</h1>
        <p>Full backward / forward document genealogy for an item + batch, or any document number</p>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <button className="btn" onClick={() => setActiveTab('reports')}>
            <span className="material-symbols-rounded">arrow_back</span>
            Back
          </button>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className={mode === 'item' ? 'btn primary' : 'btn'}
              onClick={() => setMode('item')}
            >
              By Item
            </button>
            <button
              className={mode === 'document' ? 'btn primary' : 'btn'}
              onClick={() => setMode('document')}
            >
              By Document
            </button>
          </div>

          {mode === 'item' ? (
            <>
              <input
                className="in"
                value={itemCode}
                placeholder="Item code *"
                onChange={(event) => setItemCode(event.target.value)}
                style={{ width: '160px' }}
              />
              <input
                className="in"
                value={batchNo}
                placeholder="Batch no (optional)"
                onChange={(event) => setBatchNo(event.target.value)}
                style={{ width: '150px' }}
              />
              <input
                className="in"
                value={heatNo}
                placeholder="Heat no (optional)"
                onChange={(event) => setHeatNo(event.target.value)}
                style={{ width: '150px' }}
              />
            </>
          ) : (
            <>
              <select
                className="in"
                value={docType}
                onChange={(event) => setDocType(event.target.value)}
                style={{ width: '190px' }}
              >
                {docTypeScreenMap.DOC_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              <input
                className="in"
                value={docNo}
                placeholder="Document no *"
                onChange={(event) => setDocNo(event.target.value)}
                style={{ width: '170px' }}
              />
            </>
          )}

          <button className="btn primary" disabled={!canSearch || loading} onClick={() => void search()}>
            <span className="material-symbols-rounded">search</span>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="empty" style={{ padding: '24px' }}>
            <span className="material-symbols-rounded">error</span>
            <p>{error}</p>
          </div>
        )}

        {!error && searched && nodes.length === 0 && (
          <div className="empty" style={{ padding: '24px' }}>
            <span className="material-symbols-rounded">folder_open</span>
            <p>No linked documents found.</p>
          </div>
        )}

        {!error && nodes.length > 0 && (
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="num">S.No</th>
                  <th>Date</th>
                  <th>Doc Type</th>
                  <th>Doc No</th>
                  <th>Status</th>
                  <th className="num">Qty</th>
                  <th>Store</th>
                  <th>Batch</th>
                  <th>Heat</th>
                  <th>Posted By</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((n, idx) => (
                  <tr key={n.nodeId}>
                    <td className="num mut">{idx + 1}</td>
                    <td>{formatDate(n.date)}</td>
                    <td>{n.docType}</td>
                    <td>{n.docNo}</td>
                    <td>
                      <StatusBadge status={n.status} />
                    </td>
                    <td className="num">{formatNumber(n.qty)}</td>
                    <td>{n.location || '—'}</td>
                    <td>{n.batchNo || '—'}</td>
                    <td>{n.heatNo || '—'}</td>
                    <td>{n.actor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
