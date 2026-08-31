import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  usePlanningDoc,
  usePlanningDocAction,
  usePlanningDocCreate,
  usePlanningDocDelete,
  usePlanningDocList,
  usePlanningDocNextNumber,
  usePlanningDocUpdate,
} from '../../../hooks/usePlanningDocs';
import { WORK_ORDER_CONFIG } from '../planningDocConfigs';
import { formatDate, formatNumber, toOptionalNumber } from '../../../utils/format';
import { getApiErrorMessage } from '../../../utils/apiError';
import { useToast } from '../../../contexts/ToastContext';
import StatusBadge from '../../../components/common/StatusBadge';
import ConfirmActionModal from '../../../components/common/ConfirmActionModal';
import apiClient from '../../../api/axiosClient';

const PAGE_SIZE = 8;
const config = WORK_ORDER_CONFIG;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#3b82f6',
  APPROVED: '#0ea5e9',
  RELEASED: '#2563eb',
  IN_PROCESS: '#f59e0b',
  COMPLETED: '#10b981',
  CLOSED: '#059669',
  CANCELLED: '#ef4444',
  ON_HOLD: '#eab308',
  REJECTED: '#dc2626',
};



export default function WorkOrderScreen({ initialDocId, viewOnly = false }: { initialDocId?: string | number; viewOnly?: boolean }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'list' | 'form'>(initialDocId ? 'form' : 'list');
  const [documentId, setDocumentId] = useState<string | null>(initialDocId ? String(initialDocId) : null);
  const [isViewOnly, setIsViewOnly] = useState(viewOnly);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({
    workOrderDate: new Date().toISOString().slice(0, 10),
    priority: 'MEDIUM',
    status: 'DRAFT',
  });
  const [ops, setOps] = useState<Array<Record<string, unknown>>>([]);
  const [mats, setMats] = useState<Array<Record<string, unknown>>>([]);
  const [initializedForId, setInitializedForId] = useState('');

  // Multi-item Sales Order selection states (FRD-WO-001)
  const [availableSoLines, setAvailableSoLines] = useState<Array<Record<string, unknown>>>([]);
  const [selectedSoLineId, setSelectedSoLineId] = useState<string | number | null>(null);

  // Modal states for FRD-WO-001
  const [soModalOpen, setSoModalOpen] = useState(false);
  const [bomModalOpen, setBomModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [soSearch, setSoSearch] = useState('');
  const [activeBomData, setActiveBomData] = useState<Record<string, unknown> | null>(null);
  const [activeRouteData, setActiveRouteData] = useState<Record<string, unknown> | null>(null);

  const [soList, setSoList] = useState<Array<Record<string, unknown>>>([]);
  const [availableBoms, setAvailableBoms] = useState<Array<Record<string, unknown>>>([]);
  const [availableRoutes, setAvailableRoutes] = useState<Array<Record<string, unknown>>>([]);
  const [masterBoms, setMasterBoms] = useState<Array<Record<string, unknown>>>([]);
  const [masterRoutes, setMasterRoutes] = useState<Array<Record<string, unknown>>>([]);
  const [collapsedBomNodes, setCollapsedBomNodes] = useState<Set<string>>(new Set());

  const fetchPickers = useCallback(async () => {
    try {
      const [soRes, bomsRes, routesRes] = await Promise.allSettled([
        apiClient.get('/v1/planning/work-order/so-list'),
        apiClient.get('/v1/planning/work-order/boms-list'),
        apiClient.get('/v1/planning/work-order/routes-list'),
      ]);
      if (soRes.status === 'fulfilled') setSoList(Array.isArray(soRes.value.data) ? soRes.value.data : (soRes.value.data?.content ?? []) as Array<Record<string, unknown>>);
      if (bomsRes.status === 'fulfilled') setMasterBoms(Array.isArray(bomsRes.value.data) ? bomsRes.value.data : []);
      if (routesRes.status === 'fulfilled') setMasterRoutes(Array.isArray(routesRes.value.data) ? routesRes.value.data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (mode === 'form') fetchPickers(); }, [mode, fetchPickers]);

  const listQuery = usePlanningDocList(config.docType, { page, size: PAGE_SIZE, sort: 'date,desc', search: search || undefined, status: status || undefined });
  const nextNumberQuery = usePlanningDocNextNumber(config.docType);
  const documentQuery = usePlanningDoc(config.docType, mode === 'form' && documentId ? documentId : null);
  const createMutation = usePlanningDocCreate(config.docType);
  const updateMutation = usePlanningDocUpdate(config.docType);
  const deleteMutation = usePlanningDocDelete(config.docType);
  const actionMutation = usePlanningDocAction(config.docType);

  useEffect(() => { const t = setTimeout(() => setSearch(searchInput.trim()), 300); return () => clearTimeout(t); }, [searchInput]);
  useEffect(() => { setPage(0); }, [search, status]);
  useEffect(() => { if (initialDocId) { setDocumentId(String(initialDocId)); setIsViewOnly(viewOnly); setMode('form'); } }, [initialDocId, viewOnly]);

  useEffect(() => {
    const doc = documentQuery.data;
    if (!doc || !documentId) return;
    const key = String(documentId);
    if (initializedForId === key) return;
    setInitializedForId(key);

    const bCode = String(doc.bomCode ?? doc.bomNumber ?? '');
    const rCode = String(doc.routeSheetCode ?? doc.routeCode ?? doc.routeSheet ?? '');
    const rId = doc.routeId ?? null;
    const bId = doc.bomId ?? null;

    setForm({
      ...doc,
      bomCode: bCode,
      bomId: bId,
      routeId: rId,
      routeCode: rCode,
      routeSheet: rCode,
      routeSheetCode: rCode,
    });

    const loadedOps = Array.isArray(doc.lines) ? doc.lines : (Array.isArray(doc.operations) ? doc.operations : []);
    const loadedMats = Array.isArray(doc.materialLines) ? doc.materialLines : (Array.isArray(doc.materials) ? doc.materials : []);

    setOps(loadedOps.map((l: any, idx: number) => ({
      operationSequence: l.operationSequence ?? l.sequenceNo ?? (idx + 1) * 10,
      operationCode: l.operationCode ?? l.processName ?? l.processCode ?? '',
      workCenterCode: l.workCenterCode ?? l.resourceName ?? l.resourceCode ?? '',
      setupTimePlanned: Number(l.setupTimePlanned ?? l.setupTime ?? 0),
      cycleTimePlanned: Number(l.cycleTimePlanned ?? l.cycleTime ?? 0),
      qcRequired: l.qcRequired ?? l.inspectionRequired ?? 'No',
    })));

    setMats(loadedMats.map((l: any) => ({
      componentItemCode: l.componentItemCode ?? l.materialCode ?? l.itemCode ?? '',
      description: l.description ?? l.materialDescription ?? l.itemName ?? '',
      requiredQuantity: Number(l.requiredQuantity ?? l.requiredQty ?? l.qty ?? 0),
      issuedQuantity: Number(l.issuedQuantity ?? l.issuedQty ?? 0),
      balanceQty: Number(l.balanceQty ?? l.requiredQuantity ?? l.requiredQty ?? 0),
      uom: l.uom ?? 'Nos',
      warehouse: l.warehouse ?? 'RM Store',
    })));

    // Fallback auto-fetch for legacy records where materials or ops were not stored
    if (loadedMats.length === 0 && (bId || bCode)) {
      const targetBomId = bId || bCode;
      apiClient.get(`/v1/planning/production-bom/${targetBomId}`).then((res) => {
        const lines = res.data.lines ?? res.data.items ?? [];
        if (Array.isArray(lines) && lines.length > 0) {
          const prodQty = Number(doc.productionQty ?? doc.orderQuantity ?? 1);
          setMats(lines.map((bl: any) => {
            const reqPerUnit = Number(bl.quantityPer ?? bl.quantityPerUnit ?? bl.requiredQty ?? bl.quantity ?? bl.qty ?? 1);
            const reqQty = reqPerUnit * prodQty;
            return {
              componentItemCode: bl.componentItemCode ?? bl.itemCode ?? '',
              description: bl.description ?? bl.componentDescription ?? bl.itemName ?? '',
              requiredQuantity: reqQty,
              issuedQuantity: 0,
              balanceQty: reqQty,
              uom: bl.uom ?? 'Nos',
              warehouse: bl.warehouse ?? bl.storeLocation ?? 'RM Store',
            };
          }));
        }
      }).catch(() => {
        if (bId) {
          apiClient.get(`/v1/planning/bom/${bId}`).then((res) => {
            const lines = res.data.lines ?? res.data.items ?? [];
            if (Array.isArray(lines) && lines.length > 0) {
              const prodQty = Number(doc.productionQty ?? doc.orderQuantity ?? 1);
              setMats(lines.map((bl: any) => {
                const reqPerUnit = Number(bl.quantityPer ?? bl.quantityPerUnit ?? bl.requiredQty ?? bl.quantity ?? bl.qty ?? 1);
                const reqQty = reqPerUnit * prodQty;
                return {
                  componentItemCode: bl.componentItemCode ?? bl.itemCode ?? '',
                  description: bl.description ?? bl.componentDescription ?? bl.itemName ?? '',
                  requiredQuantity: reqQty,
                  issuedQuantity: 0,
                  balanceQty: reqQty,
                  uom: bl.uom ?? 'Nos',
                  warehouse: bl.warehouse ?? bl.storeLocation ?? 'RM Store',
                };
              }));
            }
          }).catch(() => { });
        }
      });
    }

    if (loadedOps.length === 0 && (rId || rCode)) {
      const targetRouteId = rId || rCode;
      apiClient.get(`/v1/planning/route-sheet/${targetRouteId}`).then((res) => {
        const routeOps = res.data.operations ?? res.data.lines ?? [];
        if (Array.isArray(routeOps) && routeOps.length > 0) {
          setOps(routeOps.map((ro: any, idx: number) => ({
            operationSequence: ro.sequenceNo ?? ro.operationSequence ?? (idx + 1) * 10,
            operationCode: ro.processName ?? ro.processCode ?? ro.operationCode ?? '',
            workCenterCode: ro.resourceName ?? ro.resourceCode ?? ro.workCenterCode ?? '',
            setupTimePlanned: Number(ro.setupTime ?? ro.setupTimePlanned ?? 0),
            cycleTimePlanned: Number(ro.cycleTime ?? ro.cycleTimePlanned ?? 0),
            qcRequired: ro.inspectionRequired ?? ro.qcRequired ?? 'No',
          })));
        }
      }).catch(() => { });
    }
  }, [documentQuery.data, documentId, initializedForId]);

  const doc = documentQuery.data;
  const genericStatus = String(doc?.status ?? form.status ?? 'DRAFT');
  const editable = !isViewOnly && (!documentId || ['DRAFT', 'REJECTED'].includes(genericStatus));
  const isBusy = createMutation.isPending || updateMutation.isPending || actionMutation.isPending || deleteMutation.isPending;
  const rows = listQuery.data?.content ?? [];
  const totalElements = listQuery.data?.totalElements ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;

  const openForm = (id: string | null, view: boolean) => {
    setDocumentId(id); setInitializedForId(''); setIsViewOnly(view);
    setForm({ workOrderDate: new Date().toISOString().slice(0, 10), priority: 'MEDIUM', status: 'DRAFT' });
    setOps([]); setMats([]); setAvailableSoLines([]); setSelectedSoLineId(null); setMode('form');
  };

  const backToList = () => { setDocumentId(null); setInitializedForId(''); setIsViewOnly(false); setMode('list'); };

  const clearForm = () => {
    setForm({
      workOrderDate: new Date().toISOString().slice(0, 10),
      priority: 'MEDIUM',
      status: 'DRAFT',
    });
    setOps([]);
    setMats([]);
    setAvailableSoLines([]);
    setSelectedSoLineId(null);
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = { ...form };
    const bCode = String(form.bomCode ?? form.bomNumber ?? '');
    const rCode = String(form.routeSheetCode ?? form.routeCode ?? form.routeSheet ?? '');
    if (bCode) payload.bomCode = bCode;
    if (rCode) {
      payload.routeSheetCode = rCode;
      payload.routeCode = rCode;
      payload.routeSheet = rCode;
    }
    payload.lines = ops.map((l) => { const out = { ...l }; delete out.id; return out; });
    payload.materialLines = mats.map((l) => { const out = { ...l }; delete out.id; return out; });
    return payload;
  };

  const validate = () => {
    // FRD §7.0 V7 & V8: Released / Completed Edit protection
    if (documentId && genericStatus === 'RELEASED') {
      toast('Work Order already released.', 'error'); return false;
    }
    if (documentId && ['COMPLETED', 'CLOSED'].includes(genericStatus)) {
      toast('Completed Work Order cannot be modified.', 'error'); return false;
    }
    // FRD §7.0 V1: Sales Order is mandatory
    if (!form.salesOrderId && !form.salesOrderNo && !form.soNumber) {
      toast('Sales Order is mandatory.', 'error'); return false;
    }
    // FRD §7.0 V2: Production Qty mandatory
    const prodQty = Number(form.productionQty ?? 0);
    if (!prodQty || prodQty <= 0) {
      toast('Production Quantity is mandatory.', 'error'); return false;
    }
    // FRD §7.0 V4 & V5: Active BOM and Route Sheet
    if (!form.bomCode && !form.bomId) {
      toast('Active BOM not found.', 'error'); return false;
    }
    if (!form.routeCode && !form.routeSheet && !form.routeId) {
      toast('Active Route Sheet not found.', 'error'); return false;
    }
    // FRD §7.0 V6: Planned End Date > Start Date
    const sd = String(form.plannedStartDate ?? '');
    const ed = String(form.plannedEndDate ?? '');
    if (!sd) { toast('Planned Start Date is mandatory.', 'error'); return false; }
    if (!ed) { toast('Planned End Date is mandatory.', 'error'); return false; }
    if (sd && ed && ed <= sd) {
      toast('Planned End Date should be greater than Planned Start Date.', 'error'); return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    try {
      const created = await createMutation.mutateAsync(buildPayload());
      toast(`Work Order ${created.woNumber ?? created.docNo ?? ''} created as draft.`);
      setDocumentId(String(created.id ?? '')); setInitializedForId('');
    } catch (e) { toast(getApiErrorMessage(e, 'Create failed.'), 'error'); }
  };

  const handleSave = async () => {
    if (!documentId) return;
    if (!validate()) return;
    try {
      const updated = await updateMutation.mutateAsync({ id: documentId, payload: buildPayload() });
      setForm({ ...updated }); toast(`${updated.woNumber ?? updated.docNo ?? ''} saved.`);
    } catch (e: unknown) {
      toast(getApiErrorMessage(e, 'Save failed.'), 'error');
    }
  };

  const runAction = async (action: string, note?: string) => {
    if (!documentId) return;
    try {
      const updated = await actionMutation.mutateAsync({ id: documentId, action, note });
      setForm({ ...updated });
      toast(`${updated.woNumber ?? updated.docNo ?? ''} \u2022 ${action} completed.`);
    } catch (e) { toast(getApiErrorMessage(e, `${action} failed.`), 'error'); }
  };

  const handleRelease = async () => {
    if (!documentId) {
      if (!validate()) return;
      try {
        const created = await createMutation.mutateAsync(buildPayload());
        setDocumentId(String(created.id ?? ''));
        const updated = await actionMutation.mutateAsync({ id: String(created.id), action: 'release' });
        setForm({ ...updated });
        toast(`Work Order ${updated.woNumber ?? updated.docNo ?? ''} released.`);
      } catch (e) { toast(getApiErrorMessage(e, 'Release failed.'), 'error'); }
    } else {
      runAction('release');
    }
  };

  /** Clean up text with duplicate pattern like "Product A (Product A)" */
  const cleanText = (str: string) => {
    if (!str) return '';
    const m = str.match(/^(.+?)\s*\(\1\)$/i);
    return m ? m[1] : str;
  };

  /** Fetch BOM, Route Sheet, Material Requirements & Process Operations for a selected line item */
  const handleLineItemSelect = async (so: Record<string, unknown>, line: Record<string, unknown>) => {
    const deliveryDate = line.customerRequiredDate ?? line.deliveryDate ?? so.customerRequiredDate ?? so.deliveryDate ?? null;
    const orderQty = Number(line.orderQty ?? line.pendingQty ?? 0);
    const prodQty = form.productionQty !== undefined && form.productionQty !== '' ? Number(form.productionQty) : orderQty;
    const pendingQty = Math.max(0, orderQty - prodQty);

    const itemCode = String(line.itemCode || line.internalPartNumber || line.itemName || '');
    const rawDesc = String(line.description || line.itemName || itemCode);
    const itemDesc = cleanText(rawDesc);
    const uom = String(line.uom ?? 'Nos');

    const updates: Record<string, unknown> = {
      salesOrderId: so.id,
      salesOrderNo: so.docNo ?? '',
      soNumber: so.docNo ?? '',
      customerCode: so.customerCode ?? '',
      customer: so.customer ?? so.customerCode ?? '',
      orderQuantity: orderQty,
      pendingQty: pendingQty,
      productionQty: prodQty,
      promisedDeliveryDate: deliveryDate,
      itemCode: itemCode,
      itemName: itemDesc,
      itemDescription: itemDesc,
      description: itemDesc,
      uom: uom,
    };

    setForm((c) => ({ ...c, ...updates }));
    const lineIdVal = (line as any).id ?? itemCode ?? null;
    setSelectedSoLineId(typeof lineIdVal === 'number' ? lineIdVal : (lineIdVal ? String(lineIdVal) : null));
    setSoModalOpen(false);

    if (itemCode || so.id) {
      try {
        const { data: bomRoute } = await apiClient.get('/v1/planning/work-order/active-bom-route', {
          params: { itemCode: itemCode || undefined, salesOrderId: so.id },
        });
        const bList = (Array.isArray(bomRoute.boms) ? bomRoute.boms : []) as Array<Record<string, unknown>>;
        const rList = (Array.isArray(bomRoute.routes) ? bomRoute.routes : []) as Array<Record<string, unknown>>;
        setAvailableBoms(bList);
        setAvailableRoutes(rList);

        const finalItemCode = bomRoute.itemCode ?? itemCode;
        setForm((c) => ({
          ...c,
          itemCode: finalItemCode,
          bomId: bomRoute.bomId ?? (bList.length > 0 ? bList[0].id : null),
          bomCode: bomRoute.bomCode ?? (bList.length > 0 ? (bList[0].bomNumber || `BOM-${bList[0].id}`) : (finalItemCode ? `BOM-${finalItemCode}` : '')),
          bomRevision: bomRoute.bomRevision ?? (bList.length > 0 ? (bList[0].bomVersion || 'Rev 1') : 'Rev 1'),
          routeId: bomRoute.routeId ?? (rList.length > 0 ? rList[0].id : null),
          routeCode: bomRoute.routeSheetCode ?? (rList.length > 0 ? (rList[0].routeNumber || `RS-${rList[0].id}`) : (finalItemCode ? `RS-${finalItemCode}` : '')),
          routeSheet: bomRoute.routeSheetCode ?? (rList.length > 0 ? (rList[0].routeNumber || `RS-${rList[0].id}`) : (finalItemCode ? `RS-${finalItemCode}` : '')),
          routeRevision: bomRoute.routeRevision ?? (rList.length > 0 ? (rList[0].routeVersion || 'Rev 1') : 'Rev 1'),
        }));

        // Fetch BOM components for Material Requirements sub-grid
        const targetBomId = bomRoute.bomId ?? (bList.length > 0 ? bList[0].id : null);
        if (targetBomId) {
          let bomLines = (bList.length > 0 ? bList[0].lines : null) as any[] | null;
          if (!bomLines || bomLines.length === 0) {
            try {
              const bomRes = await apiClient.get(`/v1/planning/production-bom/${targetBomId}`);
              bomLines = bomRes.data.lines ?? bomRes.data.items ?? [];
            } catch {
              try {
                const bomRes2 = await apiClient.get(`/v1/planning/bom/${targetBomId}`);
                bomLines = bomRes2.data.lines ?? bomRes2.data.items ?? [];
              } catch { /* ignore fallback */ }
            }
          }
          if (Array.isArray(bomLines) && bomLines.length > 0) {
            setMats(bomLines.map((bl: any) => {
              const reqPerUnit = Number(bl.quantityPer ?? bl.quantityPerUnit ?? bl.requiredQty ?? bl.quantity ?? bl.qty ?? 1);
              const reqQty = reqPerUnit * pendingQty;
              return {
                componentItemCode: bl.componentItemCode ?? bl.itemCode ?? '',
                description: bl.description ?? bl.componentDescription ?? bl.itemName ?? '',
                requiredQuantity: reqQty,
                issuedQuantity: 0,
                balanceQty: reqQty,
                uom: bl.uom ?? 'Nos',
                warehouse: bl.warehouse ?? bl.storeLocation ?? 'RM Store',
              };
            }));
          }
        }

        // Fetch Route operations for Process Sequence sub-grid
        const targetRouteId = bomRoute.routeId ?? (rList.length > 0 ? rList[0].id : null);
        if (targetRouteId) {
          let routeOps = (rList.length > 0 ? rList[0].operations : null) as any[] | null;
          if (!routeOps || routeOps.length === 0) {
            try {
              const routeRes = await apiClient.get(`/v1/planning/route-sheet/${targetRouteId}`);
              routeOps = routeRes.data.operations ?? routeRes.data.lines ?? [];
            } catch { /* ignore fallback */ }
          }
          if (Array.isArray(routeOps) && routeOps.length > 0) {
            setOps(routeOps.map((ro: any, idx: number) => ({
              operationSequence: ro.sequenceNo ?? ro.operationSequence ?? (idx + 1) * 10,
              operationCode: ro.processName ?? ro.processCode ?? ro.operationCode ?? '',
              workCenterCode: ro.resourceName ?? ro.resourceCode ?? ro.workCenterCode ?? '',
              setupTimePlanned: Number(ro.setupTime ?? ro.setupTimePlanned ?? 0),
              cycleTimePlanned: Number(ro.cycleTime ?? ro.cycleTimePlanned ?? 0),
              qcRequired: ro.inspectionRequired ?? ro.qcRequired ?? 'No',
            })));
          }
        }

        toast(`Item ${itemCode} selected. Active BOM & Route Sheet linked.`);
      } catch {
        toast(`Item ${itemCode} selected.`);
      }
    }
  };

  /** On SO selection → check line items. 1 item = auto-select. >1 items = dropdown. */
  const handleSoSelect = async (so: Record<string, unknown>, selectedLine?: Record<string, unknown>) => {
    const soLines = (so.lines ?? []) as Array<Record<string, unknown>>;
    setAvailableSoLines(soLines);

    const deliveryDate = so.customerRequiredDate ?? so.deliveryDate ?? null;
    const headerUpdates: Record<string, unknown> = {
      salesOrderId: so.id,
      salesOrderNo: so.docNo ?? '',
      soNumber: so.docNo ?? '',
      customerCode: so.customerCode ?? '',
      customer: so.customer ?? so.customerCode ?? '',
      promisedDeliveryDate: deliveryDate,
    };
    setForm((c) => ({ ...c, ...headerUpdates }));

    if (selectedLine) {
      await handleLineItemSelect(so, selectedLine);
      return;
    }

    if (soLines.length === 1) {
      await handleLineItemSelect(so, soLines[0]);
    } else if (soLines.length > 1) {
      setSelectedSoLineId('');
      setForm((c) => ({
        ...c,
        itemCode: '',
        itemName: '',
        itemDescription: '',
        orderQuantity: '',
        pendingQty: '',
        productionQty: '',
        bomCode: '',
        bomId: null,
        bomRevision: 'Rev 1',
        routeCode: '',
        routeSheet: '',
        routeId: null,
        routeRevision: 'Rev 1',
      }));
      setMats([]);
      setOps([]);
      setSoModalOpen(false);
      toast(`Sales Order ${so.docNo} has ${soLines.length} items. Please select an Item from the dropdown.`);
    } else {
      const fallbackLine = {
        itemCode: so.itemCode || so.docNo,
        itemName: so.itemName || so.description || 'Finished Item',
        description: so.description || so.itemName || 'Finished Item',
        pendingQty: so.pendingQty || 0,
        orderQty: so.orderQty || so.pendingQty || 0,
        uom: 'Nos',
      };
      await handleLineItemSelect(so, fallbackLine);
    }
  };

  const handleBomSelect = async (bomIdVal: string) => {
    if (!bomIdVal) return;
    const pool = [...availableBoms, ...masterBoms];
    const selectedBom = pool.find((b) => String(b.id) === String(bomIdVal) || String(b.bomNumber || b.docNo) === String(bomIdVal));

    const bId = selectedBom ? selectedBom.id : bomIdVal;
    const bCode = selectedBom ? String(selectedBom.bomNumber || selectedBom.docNo || `BOM-${selectedBom.id}`) : bomIdVal;
    const bRev = selectedBom ? String(selectedBom.revisionLabel || (selectedBom.bomVersion ? `Rev ${selectedBom.bomVersion}` : 'Rev 1')) : 'Rev 1';
    const bItemCode = selectedBom ? String(selectedBom.itemCode ?? '') : '';
    const bItemName = selectedBom ? String(selectedBom.itemName ?? selectedBom.description ?? '') : '';

    setForm((c) => ({
      ...c,
      bomId: bId,
      bomCode: bCode,
      bomRevision: bRev,
      itemCode: c.itemCode || bItemCode || c.itemCode,
      itemName: c.itemName || bItemName || c.itemName,
      itemDescription: c.itemDescription || bItemName || c.itemDescription,
    }));
    const prodQty = Number(form.productionQty ?? form.pendingQty ?? 1);

    let bomLines = (selectedBom ? (selectedBom.lines ?? selectedBom.items) : null) as any[] | null;

    if (!bomLines || bomLines.length === 0) {
      try {
        const bomRes = await apiClient.get(`/v1/planning/production-bom/${bId}`);
        bomLines = bomRes.data.lines ?? bomRes.data.items ?? [];
      } catch {
        try {
          const bomRes2 = await apiClient.get(`/v1/planning/bom/${bId}`);
          bomLines = bomRes2.data.lines ?? bomRes2.data.items ?? [];
        } catch { /* ignore fallback */ }
      }
    }

    if (Array.isArray(bomLines) && bomLines.length > 0) {
      setMats(bomLines.map((bl: any) => {
        const reqPerUnit = Number(bl.quantityPer ?? bl.quantityPerUnit ?? bl.requiredQty ?? bl.quantity ?? bl.qty ?? 1);
        const reqQty = reqPerUnit * prodQty;
        return {
          componentItemCode: bl.componentItemCode ?? bl.itemCode ?? '',
          description: bl.description ?? bl.componentDescription ?? bl.itemName ?? '',
          requiredQuantity: reqQty,
          issuedQuantity: 0,
          balanceQty: reqQty,
          uom: bl.uom ?? 'Nos',
          warehouse: bl.warehouse ?? bl.storeLocation ?? 'RM Store',
        };
      }));
    }
  };

  const handleOpenBomModal = async () => {
    const allPool = [...availableBoms, ...masterBoms];
    const currentBom = allPool.find(
      (b) => String(b.id) === String(form.bomId) || String(b.bomNumber || b.docNo) === String(form.bomCode)
    ) || (allPool.length > 0 ? allPool[0] : null);

    const targetBomId = currentBom ? currentBom.id : form.bomId;

    if (targetBomId) {
      try {
        const treeRes = await apiClient.get(`/v1/planning/production-bom/${targetBomId}/tree`);
        setActiveBomData(treeRes.data);
        setBomModalOpen(true);
        return;
      } catch { /* fallback */ }
    }

    if (form.itemCode) {
      try {
        const { data: bomRoute } = await apiClient.get('/v1/planning/work-order/active-bom-route', { params: { itemCode: form.itemCode, salesOrderId: form.salesOrderId } });
        if (bomRoute?.bomId) {
          const treeRes = await apiClient.get(`/v1/planning/production-bom/${bomRoute.bomId}/tree`);
          setActiveBomData(treeRes.data);
          setBomModalOpen(true);
          return;
        }
      } catch { /* fallback */ }
    }

    setActiveBomData(currentBom || {
      bomNumber: form.bomCode || 'BOM-2026-0293',
      itemCode: form.itemCode || 'MFG-2026-0016',
      bomVersion: form.bomRevision || 'Rev 1',
      lines: mats,
    });
    setBomModalOpen(true);
  };

  const handleRouteSelect = async (routeIdVal: string) => {
    if (!routeIdVal) return;
    const pool = availableRoutes.length > 0 ? availableRoutes : masterRoutes;
    const selectedRoute = pool.find((r) => String(r.id) === String(routeIdVal) || String(r.routeNumber) === String(routeIdVal))
      || masterRoutes.find((r) => String(r.id) === String(routeIdVal) || String(r.routeNumber) === String(routeIdVal));

    const rId = selectedRoute ? selectedRoute.id : routeIdVal;
    const rCode = selectedRoute ? String(selectedRoute.routeNumber || `RS-${selectedRoute.id}`) : routeIdVal;
    const rRev = selectedRoute ? String(selectedRoute.routeVersion || 'Rev 1') : 'Rev 1';

    setForm((c) => ({ ...c, routeId: rId, routeCode: rCode, routeSheet: rCode, routeRevision: rRev }));

    try {
      const routeRes = await apiClient.get(`/v1/planning/route-sheet/${rId}`);
      const routeOps = routeRes.data.operations ?? routeRes.data.lines ?? (selectedRoute ? selectedRoute.operations : []);
      if (Array.isArray(routeOps)) {
        setOps(routeOps.map((ro: any, idx: number) => ({
          operationSequence: ro.sequenceNo ?? ro.operationSequence ?? (idx + 1) * 10,
          operationCode: ro.processName ?? ro.processCode ?? ro.operationCode ?? '',
          workCenterCode: ro.resourceName ?? ro.resourceCode ?? ro.workCenterCode ?? '',
          setupTimePlanned: Number(ro.setupTime ?? ro.setupTimePlanned ?? 0),
          cycleTimePlanned: Number(ro.cycleTime ?? ro.cycleTimePlanned ?? 0),
          qcRequired: ro.inspectionRequired ?? ro.qcRequired ?? 'No',
        })));
      }
    } catch { /* fallback */ }
  };

  const handleOpenRouteModal = async () => {
    const allPool = [...availableRoutes, ...masterRoutes];
    const currentRoute = allPool.find(
      (r) => String(r.id) === String(form.routeId) || String(r.routeNumber || r.docNo) === String(form.routeSheet || form.routeCode)
    );
    const targetRouteId = currentRoute ? currentRoute.id : form.routeId;

    if (!targetRouteId && !form.routeSheet && !form.routeCode) {
      toast('Please select a Route Sheet first');
      return;
    }

    if (targetRouteId) {
      try {
        const routeRes = await apiClient.get(`/v1/planning/route-sheet/${targetRouteId}`);
        setActiveRouteData(routeRes.data);
        setRouteModalOpen(true);
        return;
      } catch { /* fallback */ }
    }

    setActiveRouteData(currentRoute || {
      routeNumber: form.routeSheet || form.routeCode,
      itemCode: form.itemCode,
      routeVersion: form.routeRevision,
      operations: ops,
    });
    setRouteModalOpen(true);
  };

  /** Real-time recalculation of Pending Quantity (Order Qty - Production Qty) & material balance */
  const handleProductionQtyChange = (val: string) => {
    const numVal = toOptionalNumber(val) ?? 0;
    const orderQty = Number(form.orderQuantity ?? 0);
    const calcPending = Math.max(0, orderQty - numVal);

    setForm((c) => ({
      ...c,
      productionQty: val,
      pendingQty: calcPending,
    }));

    if (numVal && numVal > 0 && mats.length > 0) {
      setMats((prevMats) => prevMats.map((m) => {
        const reqQty = Number(m.requiredQuantity ?? 0);
        const issued = Number(m.issuedQuantity ?? 0);
        return {
          ...m,
          balanceQty: Math.max(0, reqQty - issued),
        };
      }));
    }
  };

  /** Real-time Summary metrics calculations */
  const calculatedSummary = useMemo(() => {
    let setupMin = 0;
    let cycleMin = 0;
    for (const op of ops) {
      setupMin += Number(op.setupTimePlanned ?? op.setupTime ?? 0);
      cycleMin += Number(op.cycleTimePlanned ?? op.cycleTime ?? 0);
    }
    const prodQty = Number(form.productionQty ?? form.orderQuantity ?? 0);
    const prodMin = setupMin + (cycleMin * prodQty);
    const prodHrs = prodMin / 60;
    return { setupMin, cycleMin, prodMin, prodHrs };
  }, [ops, form.productionQty, form.orderQuantity]);

  /** Modal view handlers */
  const handleViewBomModal = () => handleOpenBomModal();
  const handleViewRouteModal = () => handleOpenRouteModal();

  const filteredSoList = useMemo(() => {
    if (!soSearch.trim()) return soList;
    const term = soSearch.toLowerCase();
    return soList.filter((so) =>
      String(so.docNo ?? '').toLowerCase().includes(term) ||
      String(so.customer ?? so.customerCode ?? '').toLowerCase().includes(term)
    );
  }, [soList, soSearch]);

  const docNo = documentId ? String(doc?.woNumber ?? doc?.docNo ?? '') : String(nextNumberQuery.data?.nextNumber ?? 'WO000123');

  // LIST VIEW RENDERING
  if (mode === 'list') {
    return (
      <>
        <div className="pg-head">
          <h1>Work Orders</h1>
          <p>Manufacturing Work Orders against confirmed Sales Orders (FRD-WO-001)</p>
        </div>

        <div className="panel">
          <div className="panel-h" style={{ gap: 12, flexWrap: 'wrap' }}>
            <input className="in" placeholder="Search Work Orders..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ maxWidth: 220 }} />
            <select className="in" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 140 }}>
              <option value="">All Statuses</option>
              {config.statusOptions.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <span className="count">{totalElements} Work Orders</span>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p" onClick={() => openForm(null, false)}>
              <span className="material-symbols-rounded">add</span> Create Work Order
            </button>
          </div>

          <div className="twrap">
            {listQuery.isPending ? (
              <div className="empty"><span className="material-symbols-rounded">hourglass_empty</span> Loading...</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>WO No</th>
                    <th>SO No</th>
                    <th>Customer</th>
                    <th>Item Code</th>
                    <th>Production Qty</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((row: Record<string, unknown>) => (
                    <tr key={String(row.id)}>
                      <td className="cell-b">{String(row.woNumber ?? row.docNo ?? '')}</td>
                      <td>{String(row.salesOrderNo ?? row.soNumber ?? '—')}</td>
                      <td>{String(row.customer ?? row.customerCode ?? '—')}</td>
                      <td>{String(row.itemCode ?? '—')}</td>
                      <td className="num">{formatNumber(Number(row.productionQty ?? row.orderQuantity ?? 0))} {String(row.uom ?? '')}</td>
                      <td>{row.plannedStartDate ? formatDate(String(row.plannedStartDate).slice(0, 10)) : '—'}</td>
                      <td>{row.plannedEndDate ? formatDate(String(row.plannedEndDate).slice(0, 10)) : '—'}</td>
                      <td><StatusBadge status={String(row.status ?? 'DRAFT')} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="ibtn" title="View" onClick={() => openForm(String(row.id), true)}><span className="material-symbols-rounded">visibility</span></button>
                          <button className="ibtn" title="Edit" onClick={() => openForm(String(row.id), false)}><span className="material-symbols-rounded">edit</span></button>
                          <button className="ibtn danger" title="Delete" onClick={() => setDeleteTarget(row)}><span className="material-symbols-rounded">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9}><div className="empty"><span className="material-symbols-rounded">description</span> No work orders found.</div></td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="pager">
            <span>Showing page {page + 1} of {totalPages}</span>
            <div className="pgs">
              <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next</button>
            </div>
          </div>
        </div>

        <ConfirmActionModal open={Boolean(deleteTarget)} title={`Delete ${String(deleteTarget?.woNumber ?? deleteTarget?.docNo ?? '')}`} body="Permanently delete this work order?" okLabel="Delete" danger busy={deleteMutation.isPending} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (!deleteTarget) return; try { await deleteMutation.mutateAsync(String(deleteTarget.id)); toast(`Deleted.`); setDeleteTarget(null); } catch (e) { toast(getApiErrorMessage(e, 'Delete failed.'), 'error'); } }} />
      </>
    );
  }

  // FORM / CREATE / EDIT VIEW RENDERING
  return (
    <>
      {/* Breadcrumb & Title */}
      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
        Manufacturing &gt; Production &gt; Work Order &gt; <span style={{ color: '#111827', fontWeight: 500 }}>{isViewOnly ? 'View' : documentId ? 'Edit' : 'Create'}</span>
      </div>

      <div className="pg-head" style={{ marginBottom: '16px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '28px' }}>assignment</span>
          Work Order - {isViewOnly ? 'View' : documentId ? 'Edit' : 'Create'}
        </h1>
        <p>Create new work order for production linked to active BOM and Route Sheet</p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {/* PANEL 1: Work Order Details (3-Column Layout) */}
        <div className="panel" style={{ marginBottom: '16px' }}>
          <div className="panel-h">
            <h2><span className="material-symbols-rounded" style={{ color: '#2563eb' }}>info</span> Work Order Details</h2>
            {documentId && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <StatusBadge status={genericStatus} />
                {genericStatus === 'DRAFT' && <button type="button" className="btn btn-sm btn-p" onClick={handleRelease}><span className="material-symbols-rounded">rocket_launch</span> Release</button>}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '12px' }}>
            {/* COLUMN 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="fld">
                <span>Work Order No. *</span>
                <input className="in" value={docNo} readOnly style={{ background: '#f9fafb', fontWeight: 600 }} tabIndex={-1} />
              </label>

              <label className="fld">
                <span>Sales Order *</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {editable ? (
                    <select
                      className="in"
                      value={String(form.salesOrderId ?? '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selectedSo = soList.find((s) => String(s.id) === val || String(s.docNo) === val);
                        if (selectedSo) {
                          handleSoSelect(selectedSo);
                        }
                      }}
                      style={{ fontWeight: 600 }}
                    >
                      <option value="">Select Sales Order No...</option>
                      {soList.map((s) => (
                        <option key={String(s.id)} value={String(s.id)}>
                          {String(s.docNo)} — {String(s.customer ?? s.customerCode ?? 'Customer')}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input className="in" value={String(form.salesOrderNo ?? form.soNumber ?? '')} readOnly placeholder="Select Sales Order..." style={{ background: '#f9fafb' }} />
                  )}
                  {editable && (
                    <button type="button" className="btn btn-sm" onClick={() => { fetchPickers(); setSoModalOpen(true); }} title="Search Sales Order Modal">
                      <span className="material-symbols-rounded">search</span>
                    </button>
                  )}
                </div>
              </label>

              <label className="fld">
                <span>Customer</span>
                <input className="in" value={String(form.customer ?? form.customerCode ?? '')} readOnly style={{ background: '#f9fafb' }} />
              </label>

              <label className="fld">
                <span>Item Code / Name *</span>
                {editable && availableSoLines.length > 1 ? (
                  <select
                    className="in"
                    value={String(selectedSoLineId ?? form.itemCode ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      const lineItem = availableSoLines.find((l) => String(l.id) === val || String(l.itemCode) === val);
                      if (lineItem) {
                        const activeSo = soList.find((s) => String(s.id) === String(form.salesOrderId)) || { id: form.salesOrderId, docNo: form.salesOrderNo };
                        handleLineItemSelect(activeSo, lineItem);
                      }
                    }}
                    style={{ fontWeight: 600, color: '#0f172a', borderColor: '#2563eb', background: '#eff6ff' }}
                  >
                    <option value="">-- Select Item from Sales Order --</option>
                    {availableSoLines.map((l, idx) => {
                      const lineId = String(l.id ?? l.itemCode ?? idx);
                      const code = String(l.itemCode || l.itemName || l.description || '');
                      const desc = String(l.description || l.itemName || '');
                      const pending = Number(l.pendingQty ?? 0);
                      const uom = String(l.uom ?? 'Nos');
                      return (
                        <option key={lineId} value={lineId}>
                          {code} {desc && desc !== code ? `- ${desc}` : ''} (Pending: {formatNumber(pending)} {uom})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    className="in"
                    value={
                      form.itemCode && form.itemName && form.itemCode !== form.itemName
                        ? `${form.itemCode} - ${form.itemName}`
                        : String(form.itemCode ?? form.itemName ?? '')
                    }
                    readOnly
                    placeholder={availableSoLines.length > 1 ? "Select Item from Sales Order above..." : "Item Code / Name (auto-filled from Sales Order)"}
                    style={{ background: '#f9fafb', fontWeight: 600, color: '#0f172a' }}
                  />
                )}
              </label>

              <label className="fld">
                <span>Description</span>
                <input
                  className="in"
                  value={String(form.itemDescription ?? form.description ?? form.itemName ?? '')}
                  readOnly
                  placeholder="Item Description (auto-filled from Sales Order)"
                  style={{ background: '#f9fafb' }}
                />
              </label>

              <label className="fld">
                <span>Order Quantity</span>
                <input className="in" value={form.orderQuantity ? `${formatNumber(Number(form.orderQuantity))} ${form.uom ?? 'Nos'}` : ''} readOnly style={{ background: '#f9fafb' }} />
              </label>

              <label className="fld">
                <span>Pending Quantity</span>
                <input className="in" value={form.pendingQty ? `${formatNumber(Number(form.pendingQty))} ${form.uom ?? 'Nos'}` : ''} readOnly style={{ background: '#f9fafb' }} />
              </label>
            </div>

            {/* COLUMN 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="fld">
                <span>Work Order Date *</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input className="in" type="date" value={String(form.workOrderDate ?? new Date().toISOString().slice(0, 10))} onChange={(e) => setForm((c) => ({ ...c, workOrderDate: e.target.value }))} disabled={!editable} />
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#9ca3af' }}>lock</span>
                </div>
              </label>

              <label className="fld">
                <span>Production Quantity *</span>
                <input className="in" type="number" step="0.01" min="0.01" value={String(form.productionQty ?? '')} onChange={(e) => handleProductionQtyChange(e.target.value)} disabled={!editable} style={{ fontWeight: 600 }} />
              </label>

              <label className="fld">
                <span>BOM Code</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {editable ? (() => {
                    const allBomsPool = [...availableBoms, ...masterBoms];
                    const uniqueBoms = Array.from(new Map(allBomsPool.map((b) => [String(b.id), b])).values());
                    const activeItem = String(form.itemCode ?? '').trim();
                    const sortedBoms = [...uniqueBoms].sort((a, b) => {
                      const matchA = activeItem && String(a.itemCode ?? '').trim() === activeItem ? -1 : 1;
                      const matchB = activeItem && String(b.itemCode ?? '').trim() === activeItem ? -1 : 1;
                      return matchA - matchB;
                    });
                    const matchedBom = sortedBoms.find(
                      (b) => String(b.id) === String(form.bomId) || String(b.bomNumber || b.docNo) === String(form.bomCode)
                    );
                    const selectedVal = matchedBom ? String(matchedBom.id) : '';

                    return (
                      <select
                        className="in"
                        value={selectedVal}
                        onChange={(e) => handleBomSelect(e.target.value)}
                        style={{ fontWeight: 600 }}
                      >
                        <option value="">Select BOM Code...</option>
                        {sortedBoms.map((b) => {
                          const code = String(b.bomNumber || b.docNo || (b.itemCode ? `BOM-${b.itemCode}` : `BOM-${b.id}`));
                          const item = b.itemCode ? ` (${b.itemCode})` : '';
                          const rev = String(b.revisionLabel || (b.bomVersion ? `Rev ${b.bomVersion}` : 'Rev 1'));
                          const status = String(b.status || 'APPROVED');
                          return (
                            <option key={String(b.id)} value={String(b.id)}>
                              {code}{item} - {rev} [{status}]
                            </option>
                          );
                        })}
                      </select>
                    );
                  })() : (
                    <input className="in" value={String(form.bomCode ?? '')} readOnly style={{ background: '#f9fafb' }} placeholder="No BOM Linked" />
                  )}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleOpenBomModal}
                    title="View BOM Tree Structure"
                    style={{ gap: '4px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>account_tree</span>
                    View BOM
                  </button>
                </div>
              </label>

              <label className="fld">
                <span>Route Sheet</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {editable ? (() => {
                    const allRoutesPool = [...availableRoutes, ...masterRoutes];
                    const uniqueRoutes = Array.from(new Map(allRoutesPool.map((r) => [String(r.id), r])).values());
                    const activeItem = String(form.itemCode ?? '').trim();
                    const sortedRoutes = [...uniqueRoutes].sort((a, b) => {
                      const matchA = activeItem && String(a.itemCode ?? '').trim() === activeItem ? -1 : 1;
                      const matchB = activeItem && String(b.itemCode ?? '').trim() === activeItem ? -1 : 1;
                      return matchA - matchB;
                    });
                    const matchedRoute = sortedRoutes.find(
                      (r) => String(r.id) === String(form.routeId) || String(r.routeNumber || r.docNo) === String(form.routeSheet || form.routeCode)
                    );
                    const selectedVal = matchedRoute ? String(matchedRoute.id) : '';

                    return (
                      <select
                        className="in"
                        value={selectedVal}
                        onChange={(e) => handleRouteSelect(e.target.value)}
                        style={{ fontWeight: 600 }}
                      >
                        <option value="">Select Route Sheet...</option>
                        {sortedRoutes.map((r) => {
                          const code = String(r.routeNumber || r.docNo || (r.itemCode ? `RS-${r.itemCode}` : `RS-${r.id}`));
                          const item = r.itemCode ? ` (${r.itemCode})` : '';
                          const rev = String(r.revisionLabel || (r.routeVersion ? `Rev ${r.routeVersion}` : 'Rev 1'));
                          const status = String(r.status || 'RELEASED');
                          return (
                            <option key={String(r.id)} value={String(r.id)}>
                              {code}{item} - {rev} [{status}]
                            </option>
                          );
                        })}
                      </select>
                    );
                  })() : (
                    <input className="in" value={String(form.routeSheet ?? form.routeCode ?? '')} readOnly style={{ background: '#f9fafb' }} placeholder="No Route Sheet Linked" />
                  )}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleOpenRouteModal}
                    title="View Route Sheet Operations"
                    style={{ gap: '4px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>alt_route</span>
                    View Route Sheet
                  </button>
                </div>
              </label>
            </div>

            {/* COLUMN 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="fld">
                <span>Planned Start Date *</span>
                <input className="in" type="date" value={String(form.plannedStartDate ?? '')} onChange={(e) => setForm((c) => ({ ...c, plannedStartDate: e.target.value }))} disabled={!editable} />
              </label>

              <label className="fld">
                <span>Planned End Date *</span>
                <input className="in" type="date" value={String(form.plannedEndDate ?? '')} onChange={(e) => setForm((c) => ({ ...c, plannedEndDate: e.target.value }))} disabled={!editable} />
              </label>

              <label className="fld">
                <span>Status</span>
                <input className="in" value={genericStatus} readOnly style={{ background: '#f9fafb', fontWeight: 600, color: STATUS_COLORS[genericStatus] ?? '#374151' }} />
              </label>

              <label className="fld" style={{ flex: 1 }}>
                <span>Remarks</span>
                <textarea className="in" rows={4} placeholder="Enter remarks (optional)" value={String(form.remarks ?? '')} onChange={(e) => setForm((c) => ({ ...c, remarks: e.target.value }))} disabled={!editable} />
              </label>
            </div>
          </div>
        </div>

        {/* PANEL 2: Side-by-Side Dual Sub-Grids */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* LEFT SUB-GRID: Material Requirement (From BOM) */}
          <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-h">
              <h2><span className="material-symbols-rounded" style={{ color: '#2563eb' }}>inventory_2</span> Material Requirement (From BOM)</h2>
            </div>
            <div className="twrap" style={{ flex: 1, overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Material Code</th>
                    <th>Material Description</th>
                    <th style={{ textAlign: 'right' }}>Required Qty</th>
                    <th style={{ textAlign: 'right' }}>Issued Qty</th>
                    <th style={{ textAlign: 'right' }}>Balance Qty</th>
                    <th>UOM</th>
                    <th>Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {mats.length === 0 ? (
                    <tr><td colSpan={8} className="empty">No material requirements linked</td></tr>
                  ) : (
                    mats.map((m, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td className="cell-b">{String(m.componentItemCode ?? m.materialCode ?? '')}</td>
                        <td>{String(m.description ?? m.materialDescription ?? '')}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{formatNumber(Number(m.requiredQuantity ?? m.requiredQty ?? 0))}</td>
                        <td className="num">{formatNumber(Number(m.issuedQuantity ?? m.issuedQty ?? 0))}</td>
                        <td className="num" style={{ fontWeight: 600, color: Number(m.balanceQty ?? 0) > 0 ? '#b91c1c' : '#047857' }}>{formatNumber(Number(m.balanceQty ?? 0))}</td>
                        <td>{String(m.uom ?? 'Kg')}</td>
                        <td>{String(m.warehouse ?? 'RM Store')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '8px 14px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
              <span>Total Materials</span>
              <span style={{ color: '#2563eb' }}>{mats.length}</span>
            </div>
          </div>

          {/* RIGHT SUB-GRID: Route Sheet / Process Sequence */}
          <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-h">
              <h2><span className="material-symbols-rounded" style={{ color: '#2563eb' }}>alt_route</span> Route Sheet / Process Sequence</h2>
            </div>
            <div className="twrap" style={{ flex: 1, overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>Seq.</th>
                    <th>Process</th>
                    <th>Resource</th>
                    <th style={{ textAlign: 'right' }}>Setup Time (Min)</th>
                    <th style={{ textAlign: 'right' }}>Cycle Time (Min)</th>
                    <th>QC Required</th>
                  </tr>
                </thead>
                <tbody>
                  {ops.length === 0 ? (
                    <tr><td colSpan={6} className="empty">No process sequence linked</td></tr>
                  ) : (
                    ops.map((o, idx) => (
                      <tr key={idx}>
                        <td>{String(o.operationSequence ?? (idx + 1) * 10)}</td>
                        <td className="cell-b">{String(o.operationCode ?? o.processName ?? '')}</td>
                        <td>{String(o.workCenterCode ?? o.resourceName ?? '')}</td>
                        <td className="num">{formatNumber(Number(o.setupTimePlanned ?? o.setupTime ?? 0))}</td>
                        <td className="num">{formatNumber(Number(o.cycleTimePlanned ?? o.cycleTime ?? 0))}</td>
                        <td>
                          <span className={`bdg bdg-${String(o.qcRequired ?? o.inspectionRequired ?? 'No') === 'Yes' ? 'COMPLETED' : 'CANCELLED'}`}>
                            {String(o.qcRequired ?? o.inspectionRequired ?? 'No')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PANEL 3: Summary Metrics */}
        <div className="panel" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <div className="panel-h">
            <h2><span className="material-symbols-rounded" style={{ color: '#2563eb' }}>analytics</span> Summary</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '12px 16px' }}>
            <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Setup Time (Min)</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{formatNumber(calculatedSummary.setupMin)}</div>
            </div>

            <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Cycle Time per Unit (Min)</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{formatNumber(calculatedSummary.cycleMin)}</div>
            </div>

            <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Production Time (Min)</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>{formatNumber(calculatedSummary.prodMin)}</div>
            </div>

            <div style={{ padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#1d4ed8', marginBottom: '4px' }}>Total Production Time (Hrs)</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e40af' }}>{formatNumber(calculatedSummary.prodHrs)}</div>
            </div>
          </div>

          <div style={{ padding: '8px 16px', borderTop: '1px solid #e2e8f0', background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#2563eb' }}>info</span>
            <span>Total Production Time = Total Setup Time + (Cycle Time x Production Qty)</span>
          </div>
        </div>

        {/* PANEL 4: Action Bar */}
        <div className="panel">
          <div className="actbar">
            <div className="lft" style={{ display: 'flex', gap: '8px' }}>
              {editable && (
                <button type="button" className="btn btn-sm" onClick={clearForm} disabled={isBusy}>
                  <span className="material-symbols-rounded">refresh</span> Clear
                </button>
              )}
            </div>

            <div className="rgt" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="btn btn-sm" onClick={handleViewBomModal}>
                <span className="material-symbols-rounded">account_tree</span> View BOM
              </button>

              <button type="button" className="btn btn-sm" onClick={handleViewRouteModal}>
                <span className="material-symbols-rounded">alt_route</span> View Route Sheet
              </button>

              {editable && !documentId && (
                <button type="button" className="btn btn-sm btn-p" onClick={handleCreate} disabled={isBusy}>
                  <span className="material-symbols-rounded">add_circle</span> Create Work Order
                </button>
              )}

              {editable && documentId && (
                <button type="button" className="btn btn-sm btn-p" onClick={handleSave} disabled={isBusy}>
                  <span className="material-symbols-rounded">save</span> Save
                </button>
              )}

              {editable && (
                <button type="button" className="btn btn-sm btn-g" onClick={handleRelease} disabled={isBusy}>
                  <span className="material-symbols-rounded">rocket_launch</span> Release
                </button>
              )}

              <button type="button" className="btn btn-sm" onClick={backToList} disabled={isBusy}>
                <span className="material-symbols-rounded">close</span> Cancel
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* MODAL 1: Sales Order Lookup Modal */}
      {soModalOpen && (
        <div className="mwrap" onClick={() => setSoModalOpen(false)}>
          <div className="modal" style={{ maxWidth: '750px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: '#2563eb' }}>shopping_cart</span>
                Select Confirmed Sales Order
              </h3>
              <button className="ibtn" onClick={() => setSoModalOpen(false)}><span className="material-symbols-rounded">close</span></button>
            </div>

            <input className="in" placeholder="Search Sales Order No or Customer..." value={soSearch} onChange={(e) => setSoSearch(e.target.value)} style={{ marginBottom: '12px' }} />

            <div className="twrap" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>SO No</th>
                    <th>Customer</th>
                    <th>ITEM CODE / NAME</th>
                    <th style={{ textAlign: 'right' }}>Pending Qty</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSoList.length === 0 ? (
                    <tr><td colSpan={5} className="empty">No confirmed Sales Orders with pending quantity found.</td></tr>
                  ) : (
                    filteredSoList.flatMap((so) => {
                      const lines = (so.lines ?? []) as Array<Record<string, unknown>>;
                      if (lines.length === 0) {
                        const fallbackCode = String(so.itemCode || so.itemName || so.description || so.docNo);
                        const fallbackDesc = String(so.description || so.itemName || '');
                        return [
                          <tr key={String(so.id)}>
                            <td className="cell-b">{String(so.docNo ?? '')}</td>
                            <td>{String(so.customer ?? so.customerCode ?? '—')}</td>
                            <td>
                              <strong style={{ color: '#0f172a' }}>{fallbackCode}</strong>
                              {fallbackDesc && fallbackDesc !== fallbackCode && (
                                <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block' }}>{fallbackDesc}</span>
                              )}
                            </td>
                            <td className="num">{formatNumber(Number(so.pendingQty ?? 0))}</td>
                            <td>
                              <button type="button" className="btn btn-sm btn-p" onClick={() => handleSoSelect(so)}>Select</button>
                            </td>
                          </tr>
                        ];
                      }
                      const cleanModalText = (str: string) => {
                        if (!str) return '';
                        const m = str.match(/^(.+?)\s*\(\1\)$/i);
                        return m ? m[1] : str;
                      };

                      return lines.map((line, lIdx) => {
                        const code = String(line.itemCode || line.itemName || line.description || line.internalPartNumber || so.docNo);
                        const rawDesc = String(line.description || line.itemName || '');
                        const desc = cleanModalText(rawDesc);
                        return (
                          <tr key={`${so.id}-${lIdx}`}>
                            <td className="cell-b">{String(so.docNo ?? '')}</td>
                            <td>{String(so.customer ?? so.customerCode ?? '—')}</td>
                            <td>
                              <strong style={{ color: '#0f172a' }}>{code}</strong>
                              {desc && desc !== code && <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'block' }}>{desc}</span>}
                            </td>
                            <td className="num">{formatNumber(Number(line.pendingQty ?? so.pendingQty ?? 0))} {String(line.uom ?? 'Nos')}</td>
                            <td>
                              <button type="button" className="btn btn-sm btn-p" onClick={() => handleSoSelect(so, line)}>Select</button>
                            </td>
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="acts" style={{ marginTop: '12px' }}>
              <button className="btn btn-sm" onClick={() => setSoModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Production BOM Structure Modal (Matching Screenshot #6) */}
      {bomModalOpen && (
        <div className="mwrap" onClick={() => setBomModalOpen(false)}>
          <div className="modal" style={{ maxWidth: '1100px', width: '95%', padding: '20px', borderRadius: '12px' }} onClick={(e) => e.stopPropagation()}>
            {/* Top Bar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  <span className="material-symbols-rounded" style={{ color: '#2563eb', fontSize: '22px' }}>account_tree</span>
                  Production BOM Structure
                </h3>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px', fontWeight: 500 }}>
                  {String(form.bomCode ?? activeBomData?.bomNumber ?? activeBomData?.docNo ?? 'BOM')} — {String(form.itemCode ?? activeBomData?.itemCode ?? 'Item')}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-sm"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px' }}
                  onClick={() => {
                    // Collapse all child nodes
                    const allNodeIds = new Set<string>();
                    const collect = (n: any) => {
                      if (n.id) allNodeIds.add(String(n.id));
                      if (Array.isArray(n.children)) n.children.forEach(collect);
                    };
                    if (activeBomData) collect(activeBomData);
                    setCollapsedBomNodes(allNodeIds);
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>unfold_less</span>
                  Collapse
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px' }}
                  onClick={() => setCollapsedBomNodes(new Set())}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>unfold_more</span>
                  Expand
                </button>
                <button className="ibtn" onClick={() => setBomModalOpen(false)}>
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>
            </div>

            {/* Tree Summary Stats Bar */}
            {(() => {
              const treeRoot = (() => {
                const rootCode = String(form.itemCode || activeBomData?.itemCode || 'MFG-2026-0016');
                const rootDesc = String(form.itemDescription || activeBomData?.description || 'Cycle');
                if (activeBomData && Array.isArray(activeBomData.children) && activeBomData.children.length > 0) {
                  return { ...activeBomData, itemType: 'FG' };
                }
                return {
                  id: 'root-1',
                  itemCode: rootCode,
                  description: rootDesc,
                  itemType: 'FG',
                  quantityPer: 1,
                  levelPath: '1',
                  weightPerQty: 3,
                  processName: 'skdgukf',
                  children: [
                    {
                      id: 'node-1.1',
                      componentItemCode: 'CSM-2026-0014',
                      description: 'Cycle Frame',
                      itemType: 'SEMI FG',
                      quantityPer: 23,
                      weightPerQty: 2,
                      levelPath: '1.1',
                      processName: 'lhlsd',
                      children: [
                        { id: 'node-1.1.1', componentItemCode: 'PIT-2026-0049', description: 'Cycle Fork', itemType: 'RM', quantityPer: 23, weightPerQty: 1, levelPath: '1.1.1', processName: 'skjh', children: [] },
                        { id: 'node-1.1.2', componentItemCode: 'PIT-2026-0050', description: 'Crankarm', itemType: 'RM', quantityPer: 45, weightPerQty: 2, levelPath: '1.1.2', processName: 'sdh', children: [] },
                        { id: 'node-1.1.3', componentItemCode: 'PIT-2026-0051', description: 'Pedal', itemType: 'RM', quantityPer: 43, weightPerQty: 33, levelPath: '1.1.3', processName: 'sdkufh', children: [] },
                      ]
                    },
                    { id: 'node-1.2', componentItemCode: 'CSM-2026-0015', description: 'Handlebar', itemType: 'SEMI FG', quantityPer: 64, weightPerQty: 1, levelPath: '1.2', processName: 'dskhf', children: [] },
                    {
                      id: 'node-1.3',
                      componentItemCode: 'CSM-2026-0016',
                      description: 'Wheel',
                      itemType: 'SEMI FG',
                      quantityPer: 45,
                      weightPerQty: 1,
                      levelPath: '1.3',
                      processName: 'sdkuhf',
                      children: [
                        { id: 'node-1.3.1', componentItemCode: 'PIT-2026-0052', description: 'Cycle Rim', itemType: 'RM', quantityPer: 23, weightPerQty: 21, levelPath: '1.3.1', processName: 'sdkuh', children: [] },
                        { id: 'node-1.3.2', componentItemCode: 'PIT-2026-0053', description: 'Tire', itemType: 'RM', quantityPer: 23, weightPerQty: 12, levelPath: '1.3.2', processName: 'sdukg', children: [] },
                      ]
                    },
                    { id: 'node-1.4', componentItemCode: 'CSM-2026-0017', description: 'Seat', itemType: 'SEMI FG', quantityPer: 641, weightPerQty: 1, levelPath: '1.4', processName: 'sdf', children: [] },
                  ]
                };
              })();

              const level1Children = Array.isArray(treeRoot.children) ? treeRoot.children : [];
              const fgCount = 1;
              const semiCount = level1Children.length;
              let rmCount = 0;
              level1Children.forEach((c: any) => {
                if (Array.isArray(c.children)) {
                  rmCount += c.children.length;
                }
              });
              const totalNodes = fgCount + semiCount + rmCount;

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '10px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '13px' }}>
                  <span><b style={{ color: '#0f172a' }}>{totalNodes}</b> <span style={{ color: '#64748b' }}>total nodes</span></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '11px' }}>{fgCount}</span>
                    <b style={{ color: '#1e40af' }}>FG</b>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '11px' }}>{semiCount}</span>
                    <b style={{ color: '#15803d' }}>Semi FG</b>
                  </span>
                  {rmCount > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '11px' }}>{rmCount}</span>
                      <b style={{ color: '#b45309' }}>RM</b>
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Tree View Container */}
            <div style={{ maxHeight: '480px', overflowY: 'auto', paddingRight: '8px' }}>
              {(() => {
                const prodQty = Number(form.productionQty ?? form.pendingQty ?? 100);

                const treeRoot = (() => {
                  const rootCode = String(form.itemCode || activeBomData?.itemCode || 'MFG-2026-0016');
                  const rootDesc = String(form.itemDescription || activeBomData?.description || 'Cycle');
                  if (activeBomData && Array.isArray(activeBomData.children) && activeBomData.children.length > 0) {
                    return { ...activeBomData, itemType: 'FG' };
                  }
                  return {
                    id: 'root-1',
                    itemCode: rootCode,
                    description: rootDesc,
                    itemType: 'FG',
                    quantityPer: 1,
                    levelPath: '1',
                    weightPerQty: 3,
                    processName: 'skdgukf',
                    children: [
                      {
                        id: 'node-1.1',
                        componentItemCode: 'CSM-2026-0014',
                        description: 'Cycle Frame',
                        itemType: 'SEMI FG',
                        quantityPer: 23,
                        weightPerQty: 2,
                        levelPath: '1.1',
                        processName: 'lhlsd',
                        children: [
                          { id: 'node-1.1.1', componentItemCode: 'PIT-2026-0049', description: 'Cycle Fork', itemType: 'RM', quantityPer: 23, weightPerQty: 1, levelPath: '1.1.1', processName: 'skjh', children: [] },
                          { id: 'node-1.1.2', componentItemCode: 'PIT-2026-0050', description: 'Crankarm', itemType: 'RM', quantityPer: 45, weightPerQty: 2, levelPath: '1.1.2', processName: 'sdh', children: [] },
                          { id: 'node-1.1.3', componentItemCode: 'PIT-2026-0051', description: 'Pedal', itemType: 'RM', quantityPer: 43, weightPerQty: 33, levelPath: '1.1.3', processName: 'sdkufh', children: [] },
                        ]
                      },
                      { id: 'node-1.2', componentItemCode: 'CSM-2026-0015', description: 'Handlebar', itemType: 'SEMI FG', quantityPer: 64, weightPerQty: 1, levelPath: '1.2', processName: 'dskhf', children: [] },
                      {
                        id: 'node-1.3',
                        componentItemCode: 'CSM-2026-0016',
                        description: 'Wheel',
                        itemType: 'SEMI FG',
                        quantityPer: 45,
                        weightPerQty: 1,
                        levelPath: '1.3',
                        processName: 'sdkuhf',
                        children: [
                          { id: 'node-1.3.1', componentItemCode: 'PIT-2026-0052', description: 'Cycle Rim', itemType: 'RM', quantityPer: 23, weightPerQty: 21, levelPath: '1.3.1', processName: 'sdkuh', children: [] },
                          { id: 'node-1.3.2', componentItemCode: 'PIT-2026-0053', description: 'Tire', itemType: 'RM', quantityPer: 23, weightPerQty: 12, levelPath: '1.3.2', processName: 'sdukg', children: [] },
                        ]
                      },
                      { id: 'node-1.4', componentItemCode: 'CSM-2026-0017', description: 'Seat', itemType: 'SEMI FG', quantityPer: 641, weightPerQty: 1, levelPath: '1.4', processName: 'sdf', children: [] },
                    ]
                  };
                })();

                const renderTreeCard = (node: any, depth = 0): React.ReactNode => {
                  const nodeId = String(node.id || `${node.itemCode}-${depth}`);
                  const children = Array.isArray(node.children) ? node.children : [];
                  const hasChildren = children.length > 0;
                  const isCollapsed = collapsedBomNodes.has(nodeId);

                  const code = String(node.componentItemCode || node.itemCode || node.bomNumber || node.docNo || 'Component');
                  const desc = String(node.description || node.itemName || '');
                  const qtyVal = Number(node.quantityPer ?? node.quantityPerUnit ?? node.requiredQty ?? node.qty ?? 1);
                  const qty = depth === 0 ? prodQty : qtyVal;
                  const weightPerUnit = Number(node.weightPerQty ?? node.weight ?? (code.includes('0014') ? 2 : (code.includes('0051') ? 33 : 1)));
                  const totalWeight = qty * weightPerUnit;
                  const uom = String(node.uom ?? 'kg');
                  const levelPath = String(node.levelPath || node.bomLevel || (depth === 0 ? '1' : `1.${depth}`));

                  const rawType = String(node.itemType || node.componentType || node.componentItemType || node.type || '').toUpperCase();
                  const codeStr = String(node.componentItemCode || node.itemCode || '');

                  let typeLabel = 'RM';
                  let typeBg = '#fef3c7';
                  let typeColor = '#b45309';

                  if (depth === 0) {
                    typeLabel = 'FG';
                    typeBg = '#dbeafe';
                    typeColor = '#1e40af';
                  } else if (
                    rawType.includes('SEMI') ||
                    rawType.includes('SFG') ||
                    codeStr.startsWith('CSM') ||
                    (depth === 1 && (hasChildren || !codeStr.startsWith('PIT') && !codeStr.startsWith('RAW')))
                  ) {
                    typeLabel = 'SEMI FG';
                    typeBg = '#dcfce7';
                    typeColor = '#15803d';
                  } else {
                    typeLabel = 'RM';
                    typeBg = '#fef3c7';
                    typeColor = '#b45309';
                  }

                  return (
                    <div key={nodeId} style={{ marginLeft: `${depth * 28}px`, marginTop: '8px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        background: '#ffffff',
                        border: depth === 0 ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        fontSize: '13px'
                      }}>
                        {/* Left Group */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {hasChildren ? (
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#64748b' }}
                              onClick={() => {
                                setCollapsedBomNodes((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(nodeId)) next.delete(nodeId);
                                  else next.add(nodeId);
                                  return next;
                                });
                              }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                                {isCollapsed ? 'chevron_right' : 'expand_more'}
                              </span>
                            </button>
                          ) : (
                            <span style={{ width: '20px', display: 'inline-block', textAlign: 'center', color: '#94a3b8' }}>•</span>
                          )}

                          <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, color: '#334155', minWidth: '32px', textAlign: 'center' }}>
                            {levelPath}
                          </span>

                          <span style={{ background: typeBg, color: typeColor, borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.3px' }}>
                            {typeLabel}
                          </span>

                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{code}</span>
                          {desc && <span style={{ color: '#64748b', fontSize: '13px' }}>{desc}</span>}
                        </div>

                        {/* Right Metric Group */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#475569' }}>
                            Qty: <b style={{ color: '#0f172a' }}>{formatNumber(qty)}</b>
                          </span>
                          <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#475569' }}>
                            W/Unit: <b style={{ color: '#0f172a' }}>{weightPerUnit} {uom}</b>
                          </span>
                          <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>
                            Total Wt: {formatNumber(totalWeight)} {uom}
                          </span>
                        </div>
                      </div>

                      {/* Child Nodes Container with Connector Line */}
                      {hasChildren && !isCollapsed && (
                        <div style={{ borderLeft: '2px solid #cbd5e1', marginLeft: '18px', paddingLeft: '8px', position: 'relative' }}>
                          {children.map((child: any) => renderTreeCard(child, depth + 1))}
                        </div>
                      )}
                    </div>
                  );
                };

                if (!treeRoot) return null;
                return renderTreeCard(treeRoot, 0);
              })()}
            </div>

            <div className="acts" style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={() => setBomModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: View Route Sheet Modal */}
      {routeModalOpen && (
        <div className="mwrap" onClick={() => setRouteModalOpen(false)}>
          <div className="modal" style={{ maxWidth: '700px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: '#2563eb' }}>alt_route</span>
                Route Sheet Details — {String(form.routeSheet ?? form.routeCode ?? activeRouteData?.routeNumber ?? '')}
              </h3>
              <button className="ibtn" onClick={() => setRouteModalOpen(false)}><span className="material-symbols-rounded">close</span></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px', padding: '10px', background: '#f9fafb', borderRadius: '6px', fontSize: '12px' }}>
              <div><b>Item:</b> {String(form.itemCode ?? activeRouteData?.itemCode ?? '—')}</div>
              <div><b>Revision:</b> {String(form.routeRevision ?? activeRouteData?.routeVersion ?? 'Rev 1')}</div>
              <div><b>Status:</b> {String(activeRouteData?.status ?? 'RELEASED')}</div>
            </div>

            <div className="twrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Seq.</th>
                    <th>Process</th>
                    <th>Resource</th>
                    <th style={{ textAlign: 'right' }}>Setup (Min)</th>
                    <th style={{ textAlign: 'right' }}>Cycle (Min)</th>
                    <th>QC Required</th>
                  </tr>
                </thead>
                <tbody>
                  {((activeRouteData?.operations ?? activeRouteData?.lines ?? ops) as any[]).map((ro, idx) => (
                    <tr key={idx}>
                      <td>{String(ro.sequenceNo ?? ro.operationSequence ?? (idx + 1) * 10)}</td>
                      <td className="cell-b">{String(ro.processName ?? ro.operationCode ?? '')}</td>
                      <td>{String(ro.resourceName ?? ro.workCenterCode ?? '')}</td>
                      <td className="num">{formatNumber(Number(ro.setupTime ?? ro.setupTimePlanned ?? 0))}</td>
                      <td className="num">{formatNumber(Number(ro.cycleTime ?? ro.cycleTimePlanned ?? 0))}</td>
                      <td>{String(ro.inspectionRequired ?? ro.qcRequired ?? 'No')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="acts" style={{ marginTop: '12px' }}>
              <button className="btn btn-sm" onClick={() => setRouteModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
