import { useEffect, useState, useCallback, useMemo } from 'react';
import apiClient from '../../../api/axiosClient';
import { useToast } from '../../../contexts/ToastContext';
import { getApiErrorMessage } from '../../../utils/apiError';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import AuditHistoryDrawer from '../../../components/common/AuditHistoryDrawer';

/* ── Types ── */

export interface BomLine {
  id?: number;
  lineNo: number;
  componentItemCode: string;
  componentRevision: string;
  description: string;
  quantityPer: number;
  uom: string;
  componentType: string;
  weightPerQty: number;
  totalWeight: number;
  bomLevel: string;
  warehouse: string;
  scrapPercentage: number;
  childBomId: number | null;
  operationSequenceLink: number | null;
  issueMethod: string;
  supplyType: string;
  isPhantom: boolean;
  isActive: boolean;
  remarks: string;
}

export interface BomDoc {
  id: number;
  docNo: string;
  bomNumber: string;
  bomVersion: string;
  itemCode: string;
  itemRevision: string;
  description: string;
  itemType: string;
  bomType: string;
  baseQuantity: number;
  baseUom: string;
  weight: number;
  totalMaterialCost: number;
  specifications: string;
  salesOrderId: number | null;
  effectiveFrom: string;
  effectiveTo: string;
  approvedBy: string;
  releaseDate: string;
  obsoleteDate: string;
  parentBomId: number | null;
  previousRevisionId: number | null;
  revisionNo: number;
  status: string;
  isActive: boolean;
  active: boolean;
  remarks: string;
  lines: BomLine[];
}

interface ItemOption {
  id: number;
  code: string;
  name: string;
  weight: number;
  uom: string;
  itemType: string;
  active: boolean;
}

interface SoOption {
  id: number;
  orderNo: string;
  customerName: string;
  status: string;
}

interface TreeNode {
  id?: number;
  bomNumber?: string;
  itemCode: string;
  itemType?: string;
  lineNo?: number;
  componentItemCode?: string;
  componentRevision?: string;
  description?: string;
  quantityPer: number;
  weightPerQty?: number;
  totalWeight?: number;
  remarks?: string;
  level: number;
  levelPath: string;
  children?: TreeNode[];
}

interface BomRevision {
  id: number;
  revisionNo: number;
  bomVersion: string;
  createdAt: string;
  createdBy: string;
  remarks: string;
}

/* ── Constants ── */

const ITEM_TYPES = ['FG', 'SEMI_FG'];
const BOM_TYPES = ['Primary', 'Alternate'];

const emptyBom = (): Omit<BomDoc, 'id'> => ({
  docNo: '', bomNumber: '', bomVersion: '1.0', itemCode: '', itemRevision: '',
  description: '', itemType: 'FG', bomType: 'Primary',
  baseQuantity: 1, baseUom: 'PCS', weight: 0, totalMaterialCost: 0,
  specifications: '', salesOrderId: null,
  effectiveFrom: new Date().toISOString().slice(0, 10), effectiveTo: '',
  approvedBy: '', releaseDate: '', obsoleteDate: '',
  parentBomId: null, previousRevisionId: null, revisionNo: 0,
  status: 'DRAFT', isActive: true, active: true, remarks: '', lines: [],
});

const emptyLine = (n: number): BomLine => ({
  lineNo: n, componentItemCode: '', componentRevision: '', description: '',
  quantityPer: 1, uom: 'PCS', componentType: 'RAW_MATERIAL',
  weightPerQty: 0, totalWeight: 0, bomLevel: '1',
  warehouse: '', scrapPercentage: 0, childBomId: null,
  operationSequenceLink: null, issueMethod: 'Manual', supplyType: 'Make',
  isPhantom: false, isActive: true, remarks: '',
});

/* ── Component ── */

export default function BomMasterScreen() {
  const { toast } = useToast();

  // List state
  const [rows, setRows] = useState<BomDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  // Form state
  const [bom, setBom] = useState(emptyBom());
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [formTab, setFormTab] = useState<'details' | 'where-used' | 'version-compare' | 'revisions'>('details');

  // Lookup data
  const [items, setItems] = useState<ItemOption[]>([]);
  const [salesOrders, setSalesOrders] = useState<SoOption[]>([]);
  const [allBoms, setAllBoms] = useState<BomDoc[]>([]);

  // Copy BOM
  const [copyBomId, setCopyBomId] = useState('');

  // Where-used & version compare
  const [whereUsedRows, setWhereUsedRows] = useState<Array<{ type: string; reference: string; itemCode: string; status: string; quantity: number }>>([]);
  const [whereUsedLoading, setWhereUsedLoading] = useState(false);
  const [versionRows, setVersionRows] = useState<Array<{ currentVersion: string; previousVersion: string; componentCount: number; changed: boolean }>>([]);
  const [versionLoading, setVersionLoading] = useState(false);

  // Revision history
  const [revisionRows, setRevisionRows] = useState<BomRevision[]>([]);
  const [revisionLoading, setRevisionLoading] = useState(false);

  // Tree view
  const [treeOpen, setTreeOpen] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Next BOM number
  const [nextBomNumber, setNextBomNumber] = useState('');

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<BomDoc | null>(null);
  const [reviseModal, setReviseModal] = useState(false);
  const [reviseRemarks, setReviseRemarks] = useState('');
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ action: string; danger: boolean; body: string } | null>(null);

  /* ── Loaders ── */

  const loadBoms = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/v1/planning/production-bom', { params: { size: 500, page: 0 } });
      const list = data.content ?? data ?? [];
      setRows(list);
      setAllBoms(list);
    } catch (e) { toast(getApiErrorMessage(e, 'Load failed.'), 'error'); }
    setLoading(false);
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/master/items', { params: { size: 500, page: 0, active: true } });
      const list = (data.content ?? data ?? []).map((i: Record<string, unknown>) => ({
        id: i.id as number, code: i.code as string, name: (i.name as string) || (i.description as string) || '',
        weight: (i.weight as number) || 0, uom: (i.uom as string) || 'PCS',
        itemType: (i.itemType as string) || '', active: i.active as boolean,
      }));
      setItems(list);
    } catch { /* silent */ }
  }, []);

  const loadSalesOrders = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/v1/sales/sales-order', { params: { size: 500 } });
      const list = (data.content ?? data ?? []).map((s: Record<string, unknown>) => ({
        id: s.id as number, orderNo: (s.orderNo ?? s.docNo ?? '') as string,
        customerName: (s.customerName ?? s.customerCode ?? '') as string, status: (s.status ?? '') as string,
      }));
      setSalesOrders(list);
    } catch { /* silent */ }
  }, []);

  const loadNextNumber = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/v1/planning/production-bom/next-number');
      setNextBomNumber(data.nextNumber || '');
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadBoms(); loadItems(); loadSalesOrders(); loadNextNumber(); }, [loadBoms, loadItems, loadSalesOrders, loadNextNumber]);

  /* ── Derived ── */

  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return rows;
    const q = searchText.toLowerCase();
    return rows.filter((r) => (r.bomNumber || r.docNo || '').toLowerCase().includes(q) || (r.itemCode || '').toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
  }, [rows, searchText]);

  const filteredItems = useMemo(() => {
    if (!bom.itemType) return items;
    return items.filter((i) => {
      const t = (i.itemType || '').toUpperCase();
      if (bom.itemType === 'FG') return t === 'FG';
      if (bom.itemType === 'SEMI_FG') return t === 'SEMI_FG' || t === 'SFG';
      return true;
    });
  }, [items, bom.itemType]);

  const computedWeight = useMemo(() => {
    return bom.lines.filter((l) => !l.isActive || true).reduce((sum, l) => sum + (l.totalWeight || 0), 0);
  }, [bom.lines]);

  /* ── Field setters ── */

  const setField = (k: string, v: unknown) => setBom((p) => ({ ...p, [k]: v }));

  const setLine = (idx: number, k: string, v: unknown) => setBom((p) => {
    const lines = [...p.lines];
    lines[idx] = { ...lines[idx], [k]: v };
    return { ...p, lines };
  });

  const addLine = () => {
    const n = bom.lines.length + 1;
    const parentLevel = '1';
    setBom((p) => ({ ...p, lines: [...p.lines, { ...emptyLine(n), bomLevel: parentLevel }] }));
  };

  const removeLine = (idx: number) => setBom((p) => ({
    ...p,
    lines: p.lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, lineNo: i + 1 })),
  }));

  /* ── Item selection on component line ── */

  const onComponentItemSelect = (idx: number, itemCode: string) => {
    const item = items.find((i) => i.code === itemCode);
    setBom((p) => {
      const lines = [...p.lines];
      lines[idx] = {
        ...lines[idx],
        componentItemCode: itemCode,
        description: item?.name ?? '',
        weightPerQty: item?.weight ?? 0,
        uom: item?.uom || 'PCS',
        componentType: item?.itemType === 'FG' ? 'FINISHED_GOOD' : item?.itemType === 'SEMI_FG' ? 'SEMI_FG' : 'RAW_MATERIAL',
        totalWeight: (item?.weight ?? 0) * (lines[idx].quantityPer || 0),
      };
      const totalWt = lines.reduce((s, l) => s + (l.totalWeight || 0), 0);
      return { ...p, lines, weight: totalWt };
    });
  };

  const onComponentQtyChange = (idx: number, qty: number) => {
    setBom((p) => {
      const lines = [...p.lines];
      lines[idx] = { ...lines[idx], quantityPer: qty, totalWeight: qty * (lines[idx].weightPerQty || 0) };
      const totalWt = lines.reduce((s, l) => s + (l.totalWeight || 0), 0);
      return { ...p, lines, weight: totalWt };
    });
  };

  /* ── Save ── */

  const save = async () => {
    if (!bom.itemCode.trim()) { toast('BOM Item is mandatory.', 'error'); return; }
    if (!bom.itemType) { toast('Item Type is mandatory.', 'error'); return; }
    if (bom.baseQuantity <= 0) { toast('Quantity should be greater than zero.', 'error'); return; }
    const activeLines = bom.lines.filter((l) => l.componentItemCode.trim());
    if (activeLines.length === 0) { toast('At least one component is required.', 'error'); return; }
    // Check duplicate components
    const codes = new Set<string>();
    for (const l of activeLines) {
      const code = l.componentItemCode.trim();
      if (codes.has(code)) { toast(`Duplicate component item is not allowed: ${code}`, 'error'); return; }
      codes.add(code);
    }
    // Check qty > 0
    for (const l of activeLines) {
      if (l.quantityPer <= 0) { toast(`Component quantity must be greater than zero: ${l.componentItemCode}`, 'error'); return; }
    }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        itemCode: bom.itemCode, itemRevision: bom.itemRevision, bomVersion: bom.bomVersion,
        description: bom.description, itemType: bom.itemType, bomType: bom.bomType,
        baseQuantity: bom.baseQuantity, baseUom: bom.baseUom,
        weight: computedWeight, specifications: bom.specifications,
        salesOrderId: bom.salesOrderId || null,
        effectiveFrom: bom.effectiveFrom, effectiveTo: bom.effectiveTo || null,
        remarks: bom.remarks,
        lines: activeLines.map((l, i) => ({
          lineNo: i + 1, componentItemCode: l.componentItemCode,
          componentRevision: l.componentRevision, description: l.description,
          quantityPer: l.quantityPer, uom: l.uom, componentType: l.componentType,
          weightPerQty: l.weightPerQty, totalWeight: l.totalWeight,
          bomLevel: l.bomLevel, warehouse: l.warehouse,
          scrapPercentage: l.scrapPercentage, childBomId: l.childBomId,
          issueMethod: l.issueMethod, supplyType: l.supplyType,
          isPhantom: l.isPhantom, isActive: true, remarks: l.remarks,
        })),
      };
      if (editId) {
        const { data } = await apiClient.put(`/v1/planning/production-bom/${editId}`, payload);
        setBom({ ...data, lines: data.lines ?? [] });
        toast('BOM updated.');
      } else {
        const { data } = await apiClient.post('/v1/planning/production-bom', payload);
        setEditId(data.id);
        setBom({ ...data, lines: data.lines ?? [] });
        toast('BOM created. BOM Code: ' + (data.bomNumber || data.docNo));
      }
      loadBoms();
      loadNextNumber();
    } catch (e) { toast(getApiErrorMessage(e, 'Save failed.'), 'error'); }
    setBusy(false);
  };

  /* ── Workflow actions ── */

  const runAction = async (action: string, note = '') => {
    if (!editId) return;
    setBusy(true);
    try {
      const body = note ? { note } : {};
      const { data } = await apiClient.post(`/v1/planning/production-bom/${editId}/actions/${action}`, body);
      setBom({ ...data, lines: data.lines ?? [] });
      toast(`BOM ${action}d.`);
      setConfirmAction(null);
      loadBoms();
    } catch (e) { toast(getApiErrorMessage(e, `${action} failed.`), 'error'); }
    setBusy(false);
  };

  /* ── BOM Revision ── */

  const createRevision = async () => {
    if (!editId) return;
    if (!reviseRemarks.trim()) { toast('Remarks are mandatory for a new revision.', 'error'); return; }
    setBusy(true);
    try {
      const { data } = await apiClient.post(`/v1/planning/production-bom/${editId}/revise`, {
        newVersion: String(Number(bom.bomVersion) + 1),
        remarks: reviseRemarks,
      });
      setEditId(data.id);
      setBom({ ...data, lines: data.lines ?? [] });
      setReviseModal(false);
      setReviseRemarks('');
      toast('New revision created. New BOM Code: ' + (data.bomNumber || data.docNo));
      loadBoms();
    } catch (e) { toast(getApiErrorMessage(e, 'Revision failed.'), 'error'); }
    setBusy(false);
  };

  /* ── Copy BOM ── */

  const copyBom = async () => {
    if (!copyBomId) { toast('Select a BOM to copy.', 'error'); return; }
    setBusy(true);
    try {
      const source = allBoms.find((b) => String(b.id) === copyBomId || b.bomNumber === copyBomId || b.itemCode === copyBomId);
      const sourceCode = source?.bomNumber || source?.itemCode || copyBomId;
      const { data } = await apiClient.post('/v1/planning/production-bom/copy', {
        sourceBomCode: sourceCode,
        itemCode: bom.itemCode || undefined,
      });
      setEditId(data.id);
      setBom({ ...data, lines: data.lines ?? [] });
      setCopyBomId('');
      toast('BOM copied. New BOM Code: ' + (data.bomNumber || data.docNo));
      loadBoms();
    } catch (e) { toast(getApiErrorMessage(e, 'Copy failed.'), 'error'); }
    setBusy(false);
  };

  /* ── Delete ── */

  const del = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(`/v1/planning/production-bom/${deleteTarget.id}`);
      toast('BOM deleted.');
      setDeleteTarget(null);
      loadBoms();
    } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); }
    setBusy(false);
  };

  /* ── Where-Used ── */

  const fetchWhereUsed = async (id: number) => {
    setWhereUsedLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/production-bom/${id}/where-used`);
      setWhereUsedRows(Array.isArray(data) ? data : data.content ?? []);
    } catch { setWhereUsedRows([]); }
    setWhereUsedLoading(false);
  };

  /* ── Version Compare ── */

  const fetchVersionCompare = async (id: number) => {
    setVersionLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/production-bom/${id}/version-compare`);
      setVersionRows(Array.isArray(data) ? data : data.content ?? []);
    } catch { setVersionRows([]); }
    setVersionLoading(false);
  };

  /* ── Revision History ── */

  const fetchRevisions = async (id: number) => {
    setRevisionLoading(true);
    try {
      const { data } = await apiClient.get(`/v1/planning/production-bom/${id}/revisions`);
      setRevisionRows(Array.isArray(data) ? data : []);
    } catch { setRevisionRows([]); }
    setRevisionLoading(false);
  };

  /* ── Tree View ── */

  const fetchTree = async (_id?: number) => {
    setTreeLoading(true);
    setTreeOpen(true);
    try {
      // Build tree client-side from flat BOM lines
      const itemMap = new Map(items.map((i) => [i.code, i]));
      const activeLines = bom.lines.filter((l) => l.componentItemCode);
      const root: TreeNode = {
        itemCode: bom.itemCode || '',
        description: itemMap.get(bom.itemCode || '')?.name || '',
        quantityPer: bom.baseQuantity || 1,
        weightPerQty: itemMap.get(bom.itemCode || '')?.weight || 0,
        totalWeight: bom.weight || 0,
        level: 1,
        levelPath: '1',
        children: [],
      };

      let seq = 1;
      let lastSemiFg: TreeNode | null = null;

      for (const line of activeLines) {
        const item = itemMap.get(line.componentItemCode);
        const level = line.bomLevel || item?.itemType || 'RAW_MATERIAL';
        const path = seq === 0 ? '1' : '';

        if (level === 'SEMI_FG' || level === 'SFG') {
          const node: TreeNode = {
            componentItemCode: line.componentItemCode,
            description: item?.name || line.description || '',
            quantityPer: line.quantityPer,
            weightPerQty: line.weightPerQty || item?.weight || 0,
            totalWeight: line.totalWeight || 0,
            remarks: line.remarks || '',
            level: 2,
            levelPath: `${root.levelPath}.${seq}`,
            children: [],
          };
          root.children!.push(node);
          lastSemiFg = node;
          seq++;
        } else if (level === 'FG') {
          const node: TreeNode = {
            componentItemCode: line.componentItemCode,
            description: item?.name || line.description || '',
            quantityPer: line.quantityPer,
            weightPerQty: line.weightPerQty || item?.weight || 0,
            totalWeight: line.totalWeight || 0,
            remarks: line.remarks || '',
            level: 2,
            levelPath: `${root.levelPath}.${seq}`,
            children: [],
          };
          root.children!.push(node);
          lastSemiFg = null;
          seq++;
        } else {
          // RAW_MATERIAL — child of last Semi-FG or direct child of root
          if (lastSemiFg && lastSemiFg.children) {
            const childSeq = lastSemiFg.children.length + 1;
            lastSemiFg.children.push({
              componentItemCode: line.componentItemCode,
              description: item?.name || line.description || '',
              quantityPer: line.quantityPer,
              weightPerQty: line.weightPerQty || item?.weight || 0,
              totalWeight: line.totalWeight || 0,
              remarks: line.remarks || '',
              level: 3,
              levelPath: `${lastSemiFg.levelPath}.${childSeq}`,
            });
          } else {
            const node: TreeNode = {
              componentItemCode: line.componentItemCode,
              description: item?.name || line.description || '',
              quantityPer: line.quantityPer,
              weightPerQty: line.weightPerQty || item?.weight || 0,
              totalWeight: line.totalWeight || 0,
              remarks: line.remarks || '',
              level: 2,
              levelPath: `${root.levelPath}.${seq}`,
              children: [],
            };
            root.children!.push(node);
            seq++;
          }
        }
      }

      // Fix levelPaths after building
      root.children?.forEach((child, i) => {
        child.levelPath = `${root.levelPath}.${i + 1}`;
        child.children?.forEach((grandchild, j) => {
          grandchild.levelPath = `${child.levelPath}.${j + 1}`;
        });
      });

      setTreeData(root);
      // Expand all levels by default
      const expanded = new Set<string>();
      const expandAll = (node: TreeNode) => {
        if (node.children && node.children.length > 0) {
          expanded.add(node.levelPath);
          for (const child of node.children) expandAll(child);
        }
      };
      expandAll(root);
      setExpandedNodes(expanded);
    } catch { toast('Failed to load BOM tree.', 'error'); }
    setTreeLoading(false);
  };

  const toggleNode = (path: string) => setExpandedNodes((prev) => {
    const next = new Set(prev);
    if (next.has(path)) next.delete(path); else next.add(path);
    return next;
  });

  /* ── Navigation ── */

  const openNew = () => {
    setBom(emptyBom());
    setEditId(null);
    setFormTab('details');
    setViewMode('FORM');
  };

  const editBom = (r: BomDoc) => {
    if (!r.isActive && r.status !== 'DRAFT') {
      toast('This revision is inactive and cannot be edited.', 'error');
      return;
    }
    setBom({ ...r, lines: r.lines ? r.lines.map((l) => ({ ...l })) : [] });
    setEditId(r.id);
    setFormTab('details');
    setViewMode('FORM');
  };

  const openFormTab = (tab: typeof formTab) => {
    setFormTab(tab);
    if (!editId) return;
    if (tab === 'where-used') fetchWhereUsed(editId);
    if (tab === 'version-compare') fetchVersionCompare(editId);
    if (tab === 'revisions') fetchRevisions(editId);
  };

  /* ── List View ── */

  if (viewMode === 'LIST') {
    return (
      <>
        <div className="pg-head">
          <div>
            <h1>Bill of Material (BOM)</h1>
            <p>Multi-level BOM with components, quantities, and structure</p>
          </div>
          <button className="btn btn-sm btn-p" onClick={openNew}><span className="material-symbols-rounded">add</span> New BOM</button>
        </div>

        <div className="panel">
          <div className="panel-h">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="in" placeholder="Search BOM No / Item / Description..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 320 }} />
            </div>
            <span style={{ fontSize: '0.85em', color: '#6b7280' }}>{filteredRows.length} BOMs</span>
          </div>
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>BOM No</th>
                  <th>Version</th>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>BOM Type</th>
                  <th>Base Qty</th>
                  <th>Components</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="empty">Loading...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={11} className="empty">No BOMs found. Click "New BOM" to create one.</td></tr>
                ) : filteredRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.bomNumber || r.docNo || '\u2014'}</td>
                    <td>{r.bomVersion}</td>
                    <td>{r.itemCode}</td>
                    <td>{r.description || '\u2014'}</td>
                    <td><StatusBadge status={r.itemType === 'SEMI_FG' ? 'Semi-FG' : r.itemType || '\u2014'} /></td>
                    <td>{r.bomType || '\u2014'}</td>
                    <td>{r.baseQuantity} {r.baseUom}</td>
                    <td>{r.lines?.length || 0}</td>
                    <td>{r.weight ? `${r.weight} kg` : '\u2014'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" onClick={() => editBom(r)} title="Edit"><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>edit</span></button>
                      {r.status === 'DRAFT' && <button className="btn btn-sm btn-g" onClick={() => { setConfirmAction({ action: 'submit', danger: false, body: 'Submit this BOM for review?' }); setEditId(r.id); setBom({ ...r, lines: r.lines ?? [] }); setViewMode('FORM'); }} title="Submit"><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>send</span></button>}
                      {r.status === 'SUBMITTED' && <button className="btn btn-sm btn-g" onClick={() => { setConfirmAction({ action: 'approve', danger: false, body: 'Approve this BOM?' }); setEditId(r.id); setBom({ ...r, lines: r.lines ?? [] }); setViewMode('FORM'); }} title="Approve"><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>thumb_up</span></button>}
                      <button className="btn btn-sm btn-d" onClick={() => setDeleteTarget(r)} title="Delete"><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>delete</span></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {deleteTarget && (
          <ConfirmActionModal open title="Delete BOM" body={`Delete ${deleteTarget.bomNumber || deleteTarget.itemCode}? This action cannot be undone.`} okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
        )}
      </>
    );
  }

  /* ── Form View ── */

  const isEditable = bom.status === 'DRAFT' || bom.status === 'REJECTED';
  const canRevise = editId && (bom.status === 'APPROVED') && bom.isActive;
  const docNo = editId ? (bom.bomNumber || bom.docNo || '\u2014') : '\u2014';

  return (
    <>
      <div className="pg-head">
        <div>
          <h1>{editId ? 'Edit' : 'New'} Bill of Material (BOM) \u2014 {docNo}</h1>
          <p>{editId ? `Status: ${bom.status} | Version: ${bom.bomVersion} | Rev: ${bom.revisionNo}` : 'Create a new Bill of Material'}</p>
        </div>
      </div>

      {editId && (
        <div className="panel-h" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className={`btn btn-sm ${formTab === 'details' ? 'btn-p' : ''}`} onClick={() => openFormTab('details')}>Details</button>
            <button type="button" className={`btn btn-sm ${formTab === 'revisions' ? 'btn-p' : ''}`} onClick={() => openFormTab('revisions')}>Revisions</button>
            <button type="button" className={`btn btn-sm ${formTab === 'where-used' ? 'btn-p' : ''}`} onClick={() => openFormTab('where-used')}>Where-Used</button>
            <button type="button" className={`btn btn-sm ${formTab === 'version-compare' ? 'btn-p' : ''}`} onClick={() => openFormTab('version-compare')}>Version Compare</button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {editId && (bom.status === 'production-bom' || true) && (
              <>
                {isEditable && <button type="button" className="btn btn-sm btn-g" onClick={() => setConfirmAction({ action: 'submit', danger: false, body: 'Submit this BOM for review?' })} disabled={busy}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>send</span> Submit</button>}
                {bom.status === 'SUBMITTED' && <button type="button" className="btn btn-sm btn-g" onClick={() => setConfirmAction({ action: 'approve', danger: false, body: 'Approve this BOM?' })} disabled={busy}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>thumb_up</span> Approve</button>}
                {bom.status === 'SUBMITTED' && <button type="button" className="btn btn-sm btn-d" onClick={() => setConfirmAction({ action: 'reject', danger: true, body: 'Reason for rejection:' })} disabled={busy}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>thumb_down</span> Reject</button>}
                {canRevise && <button type="button" className="btn btn-sm btn-p" onClick={() => setReviseModal(true)} disabled={busy}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>edit_note</span> Revise</button>}
                {bom.status !== 'DRAFT' && bom.status !== 'CANCELLED' && <button type="button" className="btn btn-sm" onClick={() => setConfirmAction({ action: 'cancel', danger: true, body: 'Cancel this BOM?' })} disabled={busy}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>block</span> Cancel</button>}
              </>
            )}
            <a href={`/api/v1/planning/production-bom/${editId}/print`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" title="Print PDF"><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>print</span> PDF</a>
            <button type="button" className="btn btn-sm" onClick={() => fetchTree(editId!)} title="View BOM Tree"><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>account_tree</span> Tree</button>
            <button type="button" className="btn btn-sm" title="Audit History" onClick={() => setAuditOpen(true)}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>history</span></button>
            <StatusBadge status={bom.status} />
          </div>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()}>
        {formTab === 'details' && (<>
          {/* ── Header Section ── */}
          <div className="panel">
            <div className="panel-h"><h2><span className="material-symbols-rounded">description</span> BOM Header</h2></div>
            <div className="fgrid">
              <label className="fld"><span>BOM Code</span>
                <input className="in" value={bom.bomNumber || bom.docNo || nextBomNumber || (editId ? '\u2014' : '\u2014')} readOnly tabIndex={-1} style={{ background: '#f9fafb', fontWeight: 600 }} />
              </label>

              <label className="fld"><span>Sales Order No</span>
                <select className="in" value={bom.salesOrderId ?? ''} onChange={(e) => setField('salesOrderId', e.target.value ? Number(e.target.value) : null)} disabled={!isEditable && !!editId}>
                  <option value="">\u2014 No SO (Standard BOM) \u2014</option>
                  {salesOrders.map((s) => <option key={s.id} value={s.id}>{s.orderNo} {s.customerName ? `(${s.customerName})` : ''}</option>)}
                </select>
              </label>

              <label className="fld"><span>BOM Item *</span>
                <select className="in" value={bom.itemCode} onChange={(e) => {
                  const code = e.target.value;
                  setField('itemCode', code);
                  // Auto-fill weight and UOM from item master
                  const item = items.find((i) => i.code === code);
                  if (item) {
                    setField('baseUom', item.uom || 'PCS');
                  }
                  // Auto-add selected item as first component row
                  if (code && bom.lines.length === 0) {
                    const levelMap: Record<string, string> = { FG: 'FG', SEMI_FG: 'SEMI_FG', RAW_MATERIAL: 'RAW_MATERIAL' };
                    const bomLevel = levelMap[item?.itemType || ''] || 'FG';
                    setBom((p) => ({ ...p, lines: [{ ...emptyLine(1), bomLevel, componentItemCode: code, quantityPer: 1, weightPerQty: item?.weight || 0, totalWeight: item?.weight || 0 }] }));
                  }
                }} disabled={!isEditable && !!editId} required>
                  <option value="">\u2014 Select Item \u2014</option>
                  {filteredItems.map((i) => <option key={i.id} value={i.code}>{i.code} - {i.name}{i.weight ? ` (${i.weight} kg)` : ''}</option>)}
                </select>
              </label>

              <label className="fld"><span>Item Type *</span>
                <select className="in" value={bom.itemType} onChange={(e) => {
                  const newType = e.target.value;
                  // Clear itemCode if it doesn't match the new type
                  const matchItems = items.filter((i) => {
                    const t = (i.itemType || '').toUpperCase();
                    if (newType === 'FG') return t === 'FG';
                    if (newType === 'SEMI_FG') return t === 'SEMI_FG' || t === 'SFG';
                    return true;
                  });
                  const stillValid = matchItems.some((i) => i.code === bom.itemCode);
                  setField('itemType', newType);
                  if (!stillValid) setField('itemCode', '');
                }} disabled={!isEditable && !!editId}>
                  {ITEM_TYPES.map((t) => <option key={t} value={t}>{t === 'SEMI_FG' ? 'Semi FG' : t}</option>)}
                </select>
              </label>

              <label className="fld"><span>Quantity *</span>
                <input className="in" type="number" min="0.01" step="0.01" value={bom.baseQuantity} onChange={(e) => setField('baseQuantity', parseFloat(e.target.value) || 1)} disabled={!isEditable && !!editId} />
              </label>

              <label className="fld"><span>Weight (auto)</span>
                <input className="in" value={computedWeight > 0 ? computedWeight.toFixed(4) : '0'} readOnly tabIndex={-1} style={{ background: '#f9fafb', fontWeight: 600 }} />
              </label>

              <label className="fld"><span>UOM</span>
                <input className="in" value={bom.baseUom} onChange={(e) => setField('baseUom', e.target.value)} disabled={!isEditable && !!editId} />
              </label>

              <label className="fld" style={{ gridColumn: 'span 2' }}><span>Copy BOM</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select className="in" value={copyBomId} onChange={(e) => setCopyBomId(e.target.value)} style={{ flex: 1 }}>
                    <option value="">\u2014 Select BOM to Copy \u2014</option>
                    {allBoms.filter((b) => b.id !== editId).map((b) => <option key={b.id} value={String(b.id)}>{b.bomNumber || b.docNo} - {b.itemCode} ({b.bomVersion})</option>)}
                  </select>
                  <button type="button" className="btn btn-sm btn-p" onClick={copyBom} disabled={busy || !copyBomId}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>content_copy</span> Copy</button>
                </div>
              </label>

              <label className="fld"><span>BOM Type</span>
                <select className="in" value={bom.bomType} onChange={(e) => setField('bomType', e.target.value)} disabled={!isEditable && !!editId}>
                  {BOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="fld" style={{ gridColumn: 'span 2' }}><span>Specifications</span>
                <textarea className="in" rows={2} value={bom.specifications || ''} onChange={(e) => setField('specifications', e.target.value)} disabled={!isEditable && !!editId} />
              </label>

              <label className="fld" style={{ gridColumn: 'span 2' }}><span>Remarks {editId && bom.status !== 'DRAFT' ? '' : ''}</span>
                <textarea className="in" rows={2} value={bom.remarks || ''} onChange={(e) => setField('remarks', e.target.value)} disabled={!editId} />
              </label>
            </div>
          </div>

          {/* ── Component Table ── */}
          <div className="panel">
            <div className="panel-h">
              <h2><span className="material-symbols-rounded">table_view</span> BOM Components ({bom.lines.length})</h2>
              {isEditable && <button type="button" className="btn btn-sm" onClick={addLine} disabled={busy}><span className="material-symbols-rounded">add</span> Add Row</button>}
            </div>
            {bom.lines.length > 0 ? (
              <div className="twrap">
                <table className="tbl lines">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Level</th>
                      <th>Item Name *</th>
                      <th>Qty *</th>
                      <th>Wt/Unit</th>
                      <th>Total Wt</th>
                      <th>Remarks</th>
                      {isEditable && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bom.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td>{line.lineNo}</td>
                        <td>
                          <select className="in" value={line.bomLevel || 'FG'} onChange={(e) => setLine(idx, 'bomLevel', e.target.value)} disabled={!isEditable}>
                            <option value="FG">FG</option>
                            <option value="SEMI_FG">Semi FG</option>
                            <option value="RAW_MATERIAL">RM</option>
                          </select>
                        </td>
                        <td>
                          <select className="in" value={line.componentItemCode} onChange={(e) => onComponentItemSelect(idx, e.target.value)} disabled={!isEditable}>
                            <option value="">\u2014 Select Item \u2014</option>
                            {items.filter((i) => !line.bomLevel || i.itemType === line.bomLevel).map((i) => <option key={i.id} value={i.code}>{i.code} - {i.name}{i.weight ? ` (${i.weight} kg)` : ''}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="in" type="number" min="0.01" step="0.01" value={line.quantityPer} onChange={(e) => onComponentQtyChange(idx, parseFloat(e.target.value) || 0)} disabled={!isEditable} style={{ width: 80 }} />
                        </td>
                        <td style={{ background: '#f9fafb', fontWeight: 500 }}>{line.weightPerQty > 0 ? line.weightPerQty.toFixed(4) : '\u2014'}</td>
                        <td style={{ background: '#f9fafb', fontWeight: 600 }}>{line.totalWeight > 0 ? line.totalWeight.toFixed(4) : '\u2014'}</td>
                        <td>
                          <input className="in" value={line.remarks || ''} onChange={(e) => setLine(idx, 'remarks', e.target.value)} disabled={!isEditable} style={{ width: 120 }} />
                        </td>
                        {isEditable && (
                          <td>
                            <button type="button" className="ibtn danger" onClick={() => removeLine(idx)} disabled={busy} title="Delete row">
                              <span className="material-symbols-rounded">delete</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty" style={{ padding: 20 }}>
                <span className="material-symbols-rounded">playlist_add</span> No components added. Click "Add Row" to start.
              </div>
            )}
          </div>
        </>)}

        {/* ── Revisions Tab ── */}
        {formTab === 'revisions' && (
          <div className="panel">
            <div className="panel-h"><h2><span className="material-symbols-rounded">history</span> Revision History</h2></div>
            {revisionLoading ? <div className="empty" style={{ padding: 16 }}>Loading...</div> : (
              revisionRows.length > 0 ? (
                <div className="twrap">
                  <table className="tbl">
                    <thead><tr><th>Rev #</th><th>Version</th><th>Created At</th><th>Created By</th><th>Remarks</th></tr></thead>
                    <tbody>
                      {revisionRows.map((r) => (
                        <tr key={r.id}>
                          <td>R{r.revisionNo}</td>
                          <td>{r.bomVersion}</td>
                          <td>{r.createdAt}</td>
                          <td>{r.createdBy}</td>
                          <td>{r.remarks || '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty" style={{ padding: 16 }}>No revision history.</div>
            )}
          </div>
        )}

        {/* ── Where-Used Tab ── */}
        {formTab === 'where-used' && (
          <div className="panel">
            <div className="panel-h"><h2><span className="material-symbols-rounded">search</span> Where-Used</h2></div>
            {whereUsedLoading ? <div className="empty" style={{ padding: 16 }}>Loading...</div> : (
              whereUsedRows.length > 0 ? (
                <div className="twrap">
                  <table className="tbl">
                    <thead><tr><th>Type</th><th>Reference</th><th>Item Code</th><th>Status</th><th>Quantity</th></tr></thead>
                    <tbody>
                      {whereUsedRows.map((r, i) => (
                        <tr key={i}><td>{r.type}</td><td>{r.reference}</td><td>{r.itemCode}</td><td><StatusBadge status={r.status} /></td><td>{r.quantity}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty" style={{ padding: 16 }}>No references found.</div>
            )}
          </div>
        )}

        {/* ── Version Compare Tab ── */}
        {formTab === 'version-compare' && (
          <div className="panel">
            <div className="panel-h"><h2><span className="material-symbols-rounded">compare</span> Version Compare</h2></div>
            {versionLoading ? <div className="empty" style={{ padding: 16 }}>Loading...</div> : (
              versionRows.length > 0 ? (
                <div className="twrap">
                  <table className="tbl">
                    <thead><tr><th>Current Version</th><th>Previous Version</th><th>Components</th><th>Changed</th></tr></thead>
                    <tbody>
                      {versionRows.map((r, i) => (
                        <tr key={i}><td>{r.currentVersion}</td><td>{r.previousVersion}</td><td>{r.componentCount}</td><td>{r.changed ? 'Yes' : 'No'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty" style={{ padding: 16 }}>No version comparison data.</div>
            )}
          </div>
        )}

        {/* ── Action Bar ── */}
        <div className="panel">
          <div className="actbar">
            <div className="lft">
              <button type="button" className="btn btn-sm" onClick={() => setViewMode('LIST')} disabled={busy}><span className="material-symbols-rounded">arrow_back</span> Back</button>
              <span className="material-symbols-rounded">lock</span>{editId ? 'Audited document' : 'New document'}
            </div>
            <div className="rgt">
              {isEditable && (
                <button type="button" className="btn btn-sm btn-p" onClick={save} disabled={busy}><span className="material-symbols-rounded">save</span> {editId ? 'Update' : 'Create Draft'}</button>
              )}
              {!editId && (
                <button type="button" className="btn btn-sm btn-p" onClick={save} disabled={busy}><span className="material-symbols-rounded">save</span> Create Draft</button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <ConfirmActionModal open title="Delete BOM" body={`Delete ${deleteTarget.bomNumber || deleteTarget.itemCode}? This action cannot be undone.`} okLabel="Delete" danger busy={busy} onClose={() => setDeleteTarget(null)} onConfirm={del} />
      )}

      {/* ── Revise Modal ── */}
      {reviseModal && (
        <div className="modal-overlay" onClick={() => setReviseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create BOM Revision</h3>
            <p style={{ marginBottom: 12, color: '#6b7280' }}>This will deactivate the current BOM and create a new revision.</p>
            <label className="fld" style={{ marginBottom: 12 }}>
              <span>Remarks (required)</span>
              <textarea className="in" rows={3} value={reviseRemarks} onChange={(e) => setReviseRemarks(e.target.value)} placeholder="Enter reason for revision..." autoFocus />
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={() => { setReviseModal(false); setReviseRemarks(''); }}>Cancel</button>
              <button className="btn btn-sm btn-p" onClick={createRevision} disabled={busy || !reviseRemarks.trim()}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>edit_note</span> Create Revision</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Workflow Action Modal ── */}
      {confirmAction && (
        <ConfirmActionModal
          open title={`${confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1)} BOM`}
          body={confirmAction.body}
          okLabel={confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1)}
          danger={confirmAction.danger} busy={busy}
          onClose={() => setConfirmAction(null)}
          onConfirm={(note) => { if (confirmAction.action === 'reject') { runAction(confirmAction.action, note); } else { runAction(confirmAction.action, note); } }}
        />
      )}

      {/* ── Tree View Modal ── */}
      {treeOpen && (
        <div className="mwrap" onClick={() => setTreeOpen(false)} style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'fixed', inset: 24, background: '#fff', borderRadius: 16, boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 120,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="material-symbols-rounded" style={{ color: '#fff', fontSize: '1.5rem' }}>account_tree</span>
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 600 }}>BOM Structure</h2>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}>{bom.bomNumber || bom.docNo} — {bom.itemCode}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" className="btn btn-sm" onClick={() => { setExpandedNodes(new Set()); }} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>unfold_less</span> Collapse All
                </button>
                <button type="button" className="btn btn-sm" onClick={() => {
                  const all = new Set<string>();
                  const collect = (n: TreeNode) => { if (n.children?.length) { all.add(n.levelPath); n.children.forEach(collect); } };
                  if (treeData) collect(treeData);
                  setExpandedNodes(all);
                }} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>unfold_more</span> Expand All
                </button>
                <button className="btn btn-sm" onClick={() => setTreeOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
            </div>

            {/* Column Headers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '10px 32px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span style={{ width: 36, flexShrink: 0 }}></span>
              <span style={{ width: 56, flexShrink: 0 }}>Level</span>
              <span style={{ flex: 1, minWidth: 200 }}>Item · Name</span>
              <span style={{ width: 120, flexShrink: 0, textAlign: 'right' }}>Qty</span>
              <span style={{ width: 140, flexShrink: 0, textAlign: 'right' }}>Wt/Unit</span>
              <span style={{ width: 140, flexShrink: 0, textAlign: 'right', marginRight: 32 }}>Total Wt</span>
              <span style={{ flex: 0.5, minWidth: 200 }}>Remarks</span>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 0 24px' }}>
              {treeLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#94a3b8' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '2rem', marginRight: 8, animation: 'spin 1s linear infinite' }}>progress_activity</span> Loading tree...
                </div>
              ) : treeData ? (
                <div style={{ paddingTop: 4 }}>
                  {renderTreeRows(treeData, expandedNodes, toggleNode, true)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#94a3b8' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '3rem', marginBottom: 8 }}>account_tree</span> No tree data.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Drawer ── */}
      <AuditHistoryDrawer open={auditOpen} entityType="production_bom" entityId={editId ?? undefined} onClose={() => setAuditOpen(false)} />
    </>
  );
}

/* ── Tree Row Renderer ── */

function renderTreeRows(node: TreeNode, expanded: Set<string>, toggle: (path: string) => void, isRoot = false): React.ReactNode[] {
  const rows: React.ReactNode[] = [];
  const isLeaf = !node.children || node.children.length === 0;
  const path = node.levelPath || '1';
  const isExpanded = expanded.has(path);
  const depth = path.split('.').length;
  const indent = (depth - 1) * 28;

  const code = node.itemCode || node.componentItemCode || '';
  const desc = node.description || '';
  const qty = node.quantityPer || 0;
  const wt = node.weightPerQty && node.weightPerQty > 0 ? node.weightPerQty.toFixed(4) : '';
  const totalWt = node.totalWeight && node.totalWeight > 0 ? node.totalWeight.toFixed(4) : '';
  const rmk = node.remarks || '';

  const levelColors: Record<number, { bg: string; badge: string }> = {
    0: { bg: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)', badge: '#6366f1' },
    1: { bg: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)', badge: '#3b82f6' },
    2: { bg: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', badge: '#22c55e' },
    3: { bg: 'transparent', badge: '#f59e0b' },
  };
  const style = levelColors[depth] || levelColors[3];

  const isFg = (node.componentItemCode || '').startsWith('FG') || (node.itemCode || '').startsWith('FG');
  const isSfg = (node.componentItemCode || '').startsWith('SFG') || (node.componentItemCode || '').startsWith('SMFG') || (node.itemCode || '').startsWith('SFG');
  const typeLabel = isRoot ? 'ROOT' : isFg ? 'FG' : isSfg ? 'SFG' : 'RM';
  const typeColor = isRoot ? '#6366f1' : isFg ? '#3b82f6' : isSfg ? '#22c55e' : '#f59e0b';

  rows.push(
    <div
      key={path}
      onClick={() => !isLeaf && toggle(path)}
      style={{
        display: 'flex', alignItems: 'center', gap: 24,
        padding: '10px 32px',
        marginLeft: indent,
        cursor: isLeaf ? 'default' : 'pointer',
        borderBottom: '1px solid #f1f5f9',
        borderRadius: isRoot ? 8 : 0,
        background: style.bg,
        transition: 'all 0.15s ease',
        marginTop: isRoot ? 8 : 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = isRoot ? style.bg : 'rgba(99,102,241,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = style.bg; }}
    >
      {/* Expand/Collapse icon */}
      <span style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!isLeaf ? (
          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem', color: style.badge }}>
            {isExpanded ? 'expand_more' : 'chevron_right'}
          </span>
        ) : (
          <span style={{ display: 'inline-block', width: 16 }} />
        )}
      </span>

      {/* Level path */}
      <span style={{ width: 56, flexShrink: 0, fontWeight: isRoot ? 700 : 500, color: style.badge, fontSize: '0.85rem', fontFamily: 'monospace' }}>
        {path}
      </span>

      {/* Item Code + Type Badge + Description (combined) */}
      <span style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10, marginRight: 16 }}>
        <span style={{
          display: 'inline-flex', padding: '3px 10px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700,
          background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30`,
          letterSpacing: '0.03em', flexShrink: 0,
        }}>{typeLabel}</span>
        <span style={{ fontWeight: isRoot ? 700 : 600, color: '#1e293b', fontSize: isRoot ? '0.95rem' : '0.875rem', flexShrink: 0 }}>
          {code}
        </span>
        {desc && (
          <>
            <span style={{ color: '#cbd5e1', flexShrink: 0 }}>—</span>
            <span style={{ color: '#64748b', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {desc}
            </span>
          </>
        )}
      </span>

      {/* Qty */}
      <span style={{ width: 120, flexShrink: 0, textAlign: 'right', color: '#334155', fontWeight: 500, fontSize: '0.875rem' }}>
        {qty}
      </span>

      {/* Wt/Unit */}
      <span style={{ width: 140, flexShrink: 0, textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>
        {wt || '\u2014'}
      </span>

      {/* Total Wt */}
      <span style={{ width: 140, flexShrink: 0, textAlign: 'right', fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', marginRight: 32 }}>
        {totalWt ? `${totalWt} kg` : '\u2014'}
      </span>

      {/* Remarks */}
      <span style={{ flex: 0.5, minWidth: 200, color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {rmk || '\u2014'}
      </span>
    </div>
  );

  if (isExpanded && node.children) {
    for (const child of node.children) {
      rows.push(...renderTreeRows(child, expanded, toggle, false));
    }
  }

  return rows;
}
