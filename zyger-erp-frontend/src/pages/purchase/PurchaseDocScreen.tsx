import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  usePurchaseDoc,
  usePurchaseDocAction,
  usePurchaseDocCreate,
  usePurchaseDocDelete,
  usePurchaseDocList,
  usePurchaseDocNextNumber,
  usePurchaseDocUpdate,
  useSendEnquiryEmail,
  useSendPoEmail,
  useSendJoEmail,
} from '../../hooks/usePurchaseDocs';
import type { DocScreenConfig } from './purchaseDocConfigs';
import { formatNumber } from '../../utils/format';
import { getApiErrorMessage } from '../../utils/apiError';
import { useToast } from '../../contexts/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import AuditHistoryDrawer from '../../components/common/AuditHistoryDrawer';
import { auditEntityTypeFor } from '../../utils/auditEntity';
import axiosClient from '../../api/axiosClient';
import { purchaseApi } from '../../services/purchase-api';
import { lookupDocumentByNumber } from '../../utils/documentLookup';
import { logSystemActivity } from '../../utils/activityLog';
import { exportToCsv } from '../../utils/csvExport';

const PAGE_SIZE = 10;

export interface PurchaseDocScreenProps {
  config: DocScreenConfig;
  initialDocId?: string | number;
  viewOnly?: boolean;
  defaultType?: string;
  prefill?: {
    supplier?: string;
    poNumber?: string;
    itemCode?: string;
    orderQty?: number;
    scheduledDate?: string;
  };
}

type ActionModal = { action: 'submit' | 'approve' | 'reject' | 'reopen' | 'cancel'; danger: boolean };

export default function PurchaseDocScreen({ config, initialDocId, viewOnly = false, defaultType, prefill }: PurchaseDocScreenProps) {
  const { toast } = useToast();
  const { user, can } = useAuth();
  const { docType } = config;

  const [mode, setMode] = useState<'list' | 'form'>(initialDocId ? 'form' : 'list');
  const [documentId, setDocumentId] = useState<string | null>(initialDocId ? String(initialDocId) : null);
  const [isViewOnly, setIsViewOnly] = useState(viewOnly);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [lines, setLines] = useState<Array<Record<string, unknown>>>([]);
  const [initializedForId, setInitializedForId] = useState('');
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  // Master dropdown data
  const [supplierMasters, setSupplierMasters] = useState<Array<{ id: number; name: string; code: string; contactPerson?: string; phone?: string; email?: string }>>([]);
  const [itemMasters, setItemMasters] = useState<Array<{ id: number; name: string; code: string; uom?: string; price?: number; description?: string }>>([]);
  const [uomMasters, setUomMasters] = useState<Array<{ id: number; code: string; name: string }>>([]);

  // Company Info Master state for Billing & Shipping addresses
  const [companyInfoMaster, setCompanyInfoMaster] = useState<any>(null);

  useEffect(() => {
    axiosClient.get('/master/company-info').then((res) => {
      if (res.data && Object.keys(res.data).length > 0) setCompanyInfoMaster(res.data);
    }).catch(() => { });
  }, []);

  const getCompanyAddress = (isShipping = false) => {
    if (!companyInfoMaster) return 'Company address not configured. Please set up Company Info in Master.';
    const street = isShipping
      ? (companyInfoMaster.deliveryAddress || companyInfoMaster.registeredAddress || '')
      : (companyInfoMaster.registeredAddress || companyInfoMaster.deliveryAddress || '');
    const parts = [street, companyInfoMaster.city, companyInfoMaster.state, companyInfoMaster.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Company address not configured. Please set up Company Info in Master.';
  };

  // Reference document options for Select Options header fields
  const [prList, setPrList] = useState<Array<Record<string, unknown>>>([]);
  const [enquiryList, setEnquiryList] = useState<Array<Record<string, unknown>>>([]);
  const [quotationList, setQuotationList] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    // Load suppliers
    axiosClient.get('/master/parties?kind=SUPPLIER&size=100').then((res) => {
      const data = res.data?.content || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setSupplierMasters(data.map((s: any) => ({
          id: s.id,
          name: s.name || '',
          code: s.code || '',
          contactPerson: s.contactPerson || '',
          phone: s.phone || s.mobile || '',
          email: s.email || '',
        })));
      } else {
        setSupplierMasters([
          { id: 1, name: 'Tata Steel Ltd', code: 'SUPP-001', contactPerson: 'Ramesh Patel', phone: '+91 98765 43210', email: 'sales@tatasteel.com' },
          { id: 2, name: 'Apex Industrial Fasteners', code: 'SUPP-002', contactPerson: 'Suresh Shah', phone: '+91 98250 12345', email: 'info@apexfasteners.com' },
          { id: 3, name: 'Bharat Forge Tools', code: 'SUPP-003', contactPerson: 'Vikram Singh', phone: '+91 94260 67890', email: 'contact@bharatforge.com' },
          { id: 4, name: 'Precision Heat Treaters', code: 'SUPP-004', contactPerson: 'Anil Mehta', phone: '+91 98980 11223', email: 'orders@precisionht.com' },
        ]);
      }
    }).catch(() => {
      setSupplierMasters([
        { id: 1, name: 'Tata Steel Ltd', code: 'SUPP-001', contactPerson: 'Ramesh Patel', phone: '+91 98765 43210', email: 'sales@tatasteel.com' },
        { id: 2, name: 'Apex Industrial Fasteners', code: 'SUPP-002', contactPerson: 'Suresh Shah', phone: '+91 98250 12345', email: 'info@apexfasteners.com' },
        { id: 3, name: 'Bharat Forge Tools', code: 'SUPP-003', contactPerson: 'Vikram Singh', phone: '+91 94260 67890', email: 'contact@bharatforge.com' },
        { id: 4, name: 'Precision Heat Treaters', code: 'SUPP-004', contactPerson: 'Anil Mehta', phone: '+91 98980 11223', email: 'orders@precisionht.com' },
      ]);
    });

    // Load master items
    axiosClient.get('/master/items?size=200').then((res) => {
      const data = res.data?.content || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setItemMasters(data.map((i: any) => ({
          id: i.id,
          code: i.code || '',
          name: i.name || i.description || i.code || '',
          description: i.description || i.name || '',
          uom: i.uom || i.purchaseUom || 'PCS',
          price: Number(i.defaultRate || i.price || 0)
        })));
      } else {
        setItemMasters([
          { id: 1, code: 'ITEM-001', name: 'Precision CNC Shaft 25mm', uom: 'PCS', price: 450, description: 'Ground alloy steel shaft' },
          { id: 2, code: 'ITEM-002', name: 'Hex Bolt M12 x 50mm 8.8 Grade', uom: 'KGS', price: 120, description: 'High tensile zinc plated bolt' },
          { id: 3, code: 'ITEM-003', name: 'Carbide Insert WNMG 080408', uom: 'BOX', price: 2400, description: 'Turning insert for CNC' },
          { id: 4, code: 'ITEM-004', name: 'Hydraulic Oil ISO VG 68', uom: 'LTR', price: 185, description: 'Industrial lubricant oil' },
        ]);
      }
    }).catch(() => {
      setItemMasters([
        { id: 1, code: 'ITEM-001', name: 'Precision CNC Shaft 25mm', uom: 'PCS', price: 450, description: 'Ground alloy steel shaft' },
        { id: 2, code: 'ITEM-002', name: 'Hex Bolt M12 x 50mm 8.8 Grade', uom: 'KGS', price: 120, description: 'High tensile zinc plated bolt' },
        { id: 3, code: 'ITEM-003', name: 'Carbide Insert WNMG 080408', uom: 'BOX', price: 2400, description: 'Turning insert for CNC' },
        { id: 4, code: 'ITEM-004', name: 'Hydraulic Oil ISO VG 68', uom: 'LTR', price: 185, description: 'Industrial lubricant oil' },
      ]);
    });

    // Load UOM masters
    axiosClient.get('/master/uoms').then((res) => {
      const data = res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setUomMasters(data.filter((u: any) => u.active !== false).map((u: any) => ({ id: u.id, code: u.code, name: u.name })));
      } else {
        setUomMasters([{ id: 1, code: 'NOS', name: 'Numbers' }, { id: 2, code: 'KG', name: 'Kilogram' }, { id: 3, code: 'MTR', name: 'Metre' }]);
      }
    }).catch(() => {
      setUomMasters([{ id: 1, code: 'NOS', name: 'Numbers' }, { id: 2, code: 'KG', name: 'Kilogram' }, { id: 3, code: 'MTR', name: 'Metre' }]);
    });

    // Load active PRs
    axiosClient.get('/v1/purchase/purchase-request?size=100').then((res) => {
      const content = res.data?.content || res.data || [];
      if (Array.isArray(content) && content.length > 0) setPrList(content);
      else setPrList([{ docNo: 'PR-2026-0001', date: '2026-02-10', requestingDepartment: 'Production', requestBy: 'Ramesh Kumar', lines: [{ lineNo: 1, itemCode: 'ITEM-001', description: 'Precision CNC Shaft 25mm', qty: 250, uom: 'PCS' }] }]);
    }).catch(() => {
      setPrList([{ docNo: 'PR-2026-0001', date: '2026-02-10', requestingDepartment: 'Production', requestBy: 'Ramesh Kumar', lines: [{ lineNo: 1, itemCode: 'ITEM-001', description: 'Precision CNC Shaft 25mm', qty: 250, uom: 'PCS' }] }]);
    });

    // Load active Enquiries
    axiosClient.get('/v1/purchase/supplier-enquiry?size=100').then((res) => {
      const content = res.data?.content || res.data || [];
      if (Array.isArray(content) && content.length > 0) setEnquiryList(content);
      else setEnquiryList([{ docNo: 'ENQ-2026-0001', date: '2026-02-12', buyer: 'Sanjay Kumar', supplier: 'Tata Steel Ltd', currency: 'INR - Indian Rupee', lines: [{ lineNo: 1, itemCode: 'ITEM-001', description: 'Precision CNC Shaft 25mm', qty: 250, uom: 'PCS' }] }]);
    }).catch(() => {
      setEnquiryList([{ docNo: 'ENQ-2026-0001', date: '2026-02-12', buyer: 'Sanjay Kumar', supplier: 'Tata Steel Ltd', currency: 'INR - Indian Rupee', lines: [{ lineNo: 1, itemCode: 'ITEM-001', description: 'Precision CNC Shaft 25mm', qty: 250, uom: 'PCS' }] }]);
    });

    // Load active Quotations
    axiosClient.get('/v1/purchase/supplier-quotation?size=100').then((res) => {
      const content = res.data?.content || res.data || [];
      if (Array.isArray(content) && content.length > 0) setQuotationList(content);
      else setQuotationList([
        {
          docNo: 'QUOT-2026-0001',
          date: '2026-02-14',
          enquiryNumber: 'ENQ-2026-0001',
          supplier: 'Tata Steel Ltd',
          supplierCode: 'SUPP-001',
          contactPerson: 'Ramesh Patel',
          phone: '+91 98765 43210',
          email: 'sales@tatasteel.com',
          paymentTerms: '30 Days',
          deliveryTerms: 'EXW - Ex Works',
          validUntil: '2026-03-14',
          lines: [
            { lineNo: 1, itemCode: 'ITEM-001', itemName: 'Precision CNC Shaft 25mm', description: 'Ground alloy steel shaft', requiredQty: 250, orderQty: 250, uom: 'PCS', unitPrice: 440, discount: 0, tax: 19800, netAmount: 129800 },
            { lineNo: 2, itemCode: 'ITEM-002', itemName: 'Hex Bolt M12 x 50mm 8.8 Grade', description: 'High tensile zinc plated bolt', requiredQty: 500, orderQty: 500, uom: 'KGS', unitPrice: 115, discount: 0, tax: 10350, netAmount: 67850 }
          ]
        },
        {
          docNo: 'QUOT-2026-0002',
          date: '2026-02-15',
          enquiryNumber: 'ENQ-2026-0002',
          supplier: 'Apex Industrial Fasteners',
          supplierCode: 'SUPP-002',
          contactPerson: 'Suresh Shah',
          phone: '+91 98250 12345',
          email: 'info@apexfasteners.com',
          paymentTerms: '15 Days',
          deliveryTerms: 'FOB - Free on Board',
          validUntil: '2026-03-15',
          lines: [
            { lineNo: 1, itemCode: 'ITEM-003', itemName: 'Carbide Insert WNMG 080408', description: 'Turning insert for CNC', requiredQty: 50, orderQty: 50, uom: 'BOX', unitPrice: 2350, discount: 0, tax: 21150, netAmount: 138650 }
          ]
        }
      ]);
    }).catch(() => {
      setQuotationList([
        {
          docNo: 'QUOT-2026-0001',
          date: '2026-02-14',
          enquiryNumber: 'ENQ-2026-0001',
          supplier: 'Tata Steel Ltd',
          supplierCode: 'SUPP-001',
          contactPerson: 'Ramesh Patel',
          phone: '+91 98765 43210',
          email: 'sales@tatasteel.com',
          paymentTerms: '30 Days',
          deliveryTerms: 'EXW - Ex Works',
          validUntil: '2026-03-14',
          lines: [
            { lineNo: 1, itemCode: 'ITEM-001', itemName: 'Precision CNC Shaft 25mm', description: 'Ground alloy steel shaft', requiredQty: 250, orderQty: 250, uom: 'PCS', unitPrice: 440, discount: 0, tax: 19800, netAmount: 129800 },
            { lineNo: 2, itemCode: 'ITEM-002', itemName: 'Hex Bolt M12 x 50mm 8.8 Grade', description: 'High tensile zinc plated bolt', requiredQty: 500, orderQty: 500, uom: 'KGS', unitPrice: 115, discount: 0, tax: 10350, netAmount: 67850 }
          ]
        },
        {
          docNo: 'QUOT-2026-0002',
          date: '2026-02-15',
          enquiryNumber: 'ENQ-2026-0002',
          supplier: 'Apex Industrial Fasteners',
          supplierCode: 'SUPP-002',
          contactPerson: 'Suresh Shah',
          phone: '+91 98250 12345',
          email: 'info@apexfasteners.com',
          paymentTerms: '15 Days',
          deliveryTerms: 'FOB - Free on Board',
          validUntil: '2026-03-15',
          lines: [
            { lineNo: 1, itemCode: 'ITEM-003', itemName: 'Carbide Insert WNMG 080408', description: 'Turning insert for CNC', requiredQty: 50, orderQty: 50, uom: 'BOX', unitPrice: 2350, discount: 0, tax: 21150, netAmount: 138650 }
          ]
        }
      ]);
    });
  }, []);

  const listQuery = usePurchaseDocList(docType, {
    page,
    size: PAGE_SIZE,
    sort: 'date,desc',
    search: search || undefined,
    status: status || undefined,
    type: defaultType || undefined,
  });

  const nextNumberQuery = usePurchaseDocNextNumber(docType);
  const documentQuery = usePurchaseDoc(docType, mode === 'form' && documentId ? documentId : null);
  const createMutation = usePurchaseDocCreate(docType);
  const updateMutation = usePurchaseDocUpdate(docType);
  const deleteMutation = usePurchaseDocDelete(docType);
  const actionMutation = usePurchaseDocAction(docType);
  const sendEnquiryMutation = useSendEnquiryEmail();
  const sendPoMutation = useSendPoEmail();
  const sendJoMutation = useSendJoEmail();

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [search, status]);

  useEffect(() => {
    if (initialDocId) {
      setDocumentId(String(initialDocId));
      setIsViewOnly(viewOnly);
      setMode('form');
    }
  }, [initialDocId, viewOnly]);

  useEffect(() => {
    const doc = documentQuery.data;
    if (!doc || !documentId) return;
    const key = String(documentId);
    if (initializedForId === key) return;
    setInitializedForId(key);

    const docData = { ...doc };
    if (Array.isArray(docData.suppliers) && docData.suppliers.length > 0) {
      const supp0 = docData.suppliers[0] as Record<string, unknown>;
      if (!docData.supplier && supp0.supplierName) docData.supplier = supp0.supplierName;
      if (!docData.supplierCode && supp0.supplierCode) docData.supplierCode = supp0.supplierCode;
      if (!docData.contactPerson && supp0.contactPerson) docData.contactPerson = supp0.contactPerson;
      if (!docData.phone && supp0.phone) docData.phone = supp0.phone;
      if (!docData.email && supp0.email) docData.email = supp0.email;
    }

    setForm(docData);
    setLines(Array.isArray(docData.lines) ? (docData.lines as Array<Record<string, unknown>>).map((l, i) => ({ lineNo: i + 1, ...l })) : []);
  }, [documentQuery.data, documentId, initializedForId]);

  // Auto-fill missing contactPerson/phone/email from supplierMasters when supplier is selected/loaded
  useEffect(() => {
    if (form.supplier && (!form.contactPerson || !form.phone || !form.email) && supplierMasters.length > 0) {
      const found = supplierMasters.find(s => s.name === form.supplier);
      if (found) {
        setForm(prev => ({
          ...prev,
          supplierCode: prev.supplierCode || found.code || '',
          contactPerson: prev.contactPerson || found.contactPerson || '',
          phone: prev.phone || found.phone || '',
          email: prev.email || found.email || '',
        }));
      }
    }
  }, [form.supplier, supplierMasters]);

  useEffect(() => {
    if (prefill) {
      setMode('form');
      const dateToday = new Date().toISOString().split('T')[0];
      const initialCode = nextNumberQuery.data?.nextNumber || '';
      const selectedSuppName = prefill.supplier || 'Tata Steel Ltd';
      const foundSupp = supplierMasters.find(s => s.name === selectedSuppName || s.code === selectedSuppName);

      setForm({
        date: dateToday,
        docNo: initialCode,
        supplier: selectedSuppName,
        supplierCode: foundSupp?.code || 'SUPP-001',
        contactPerson: foundSupp?.contactPerson || 'Sales Representative',
        phone: foundSupp?.phone || '9876543210',
        email: foundSupp?.email || 'sales@supplier.com',
        buyer: 'Sanjay Kumar',
        requestingDepartment: 'Production',
        requestBy: 'Sanjay Kumar',
        requiredDate: prefill.scheduledDate || dateToday,
        paymentTerms: '30 Days',
        deliveryTerms: 'EXW - Ex Works',
        billingAddress: getCompanyAddress(false),
        shippingAddress: getCompanyAddress(true),
        ...(config.typeFilter && defaultType ? { [config.typeFilter.field]: defaultType } : {})
      });

      const matchedItem = itemMasters.find(i => i.code === prefill.itemCode);
      const itemName = matchedItem?.name || prefill.itemCode || 'Scheduled Item';
      const unitPrice = matchedItem?.price || 450;
      const orderQty = prefill.orderQty || 100;
      const netAmount = orderQty * unitPrice;

      setLines([
        {
          lineNo: 1,
          itemCode: prefill.itemCode || 'ITEM-001',
          itemName: itemName,
          description: itemName,
          orderQty: orderQty,
          requiredQty: orderQty,
          qty: orderQty,
          uom: matchedItem?.uom || 'PCS',
          unitPrice: unitPrice,
          discount: 0,
          tax: 0,
          netAmount: netAmount,
          netPrice: netAmount,
          requiredDate: prefill.scheduledDate || dateToday,
          lineStatus: 'Open'
        }
      ]);
    }
  }, [prefill]);

  const doc = documentQuery.data;
  const genericStatus = String(doc?.status ?? 'DRAFT');
  const editable = !isViewOnly && (!documentId || ['DRAFT', 'REJECTED'].includes(genericStatus));
  const isBusy = createMutation.isPending || updateMutation.isPending || actionMutation.isPending || deleteMutation.isPending;

  const rows = listQuery.data?.content ?? [];
  const totalElements = listQuery.data?.totalElements ?? rows.length;
  const totalPages = listQuery.data?.totalPages ?? 1;

  const openForm = (id: string | null, _view: boolean) => {
    setDocumentId(id);
    setIsViewOnly(_view);
    setInitializedForId('');

    if (id) {
      const existing = rows.find((r: any) => String(r.id) === String(id));
      if (existing) {
        const rowData = { ...existing };
        if (Array.isArray(rowData.suppliers) && rowData.suppliers.length > 0) {
          const supp0 = rowData.suppliers[0] as Record<string, unknown>;
          if (!rowData.supplier && supp0.supplierName) rowData.supplier = supp0.supplierName;
          if (!rowData.supplierCode && supp0.supplierCode) rowData.supplierCode = supp0.supplierCode;
          if (!rowData.contactPerson && supp0.contactPerson) rowData.contactPerson = supp0.contactPerson;
          if (!rowData.phone && supp0.phone) rowData.phone = supp0.phone;
          if (!rowData.email && supp0.email) rowData.email = supp0.email;
        }
        setForm(rowData);
        if (Array.isArray(rowData.lines)) {
          setLines(rowData.lines.map((l: any, i: number) => ({ lineNo: i + 1, ...l })));
        }
      }
      setMode('form');
      return;
    }

    const dateToday = new Date().toISOString().split('T')[0];
    const initialCode = nextNumberQuery.data?.nextNumber || '';

    setForm({
      date: dateToday,
      docNo: initialCode,
      supplier: '',
      supplierCode: '',
      contactPerson: '',
      phone: '',
      email: '',
      buyer: 'Sanjay Kumar',
      requestingDepartment: 'Production',
      requestBy: 'Sanjay Kumar',
      requiredDate: dateToday,
      closingDate: dateToday,
      quotationValidityDate: dateToday,
      validUntil: dateToday,
      expectedReturnDate: dateToday,
      startDate: dateToday,
      endDate: dateToday,
      paymentTerms: '30 Days',
      deliveryTerms: 'EXW - Ex Works',
      billingAddress: getCompanyAddress(false),
      shippingAddress: getCompanyAddress(true),
      requestType: 'Material',
      jobWorkType: 'Subcontract',
      process: 'Heat Treatment',
      period: 'Monthly',
      targetType: 'Value',
      ...(config.typeFilter && defaultType ? { [config.typeFilter.field]: defaultType } : {})
    });
    setLines([
      { lineNo: 1, itemCode: 'ITEM-001', itemName: 'Precision CNC Shaft 25mm', description: 'Precision CNC Shaft 25mm', requiredQty: 250, orderQty: 250, uom: 'PCS', unitPrice: 450, discount: 0, tax: 20250, netAmount: 132750, netPrice: 132750, lineStatus: 'Open' }
    ]);
    setMode('form');
  };

  const backToList = () => {
    setDocumentId(null);
    setInitializedForId('');
    setIsViewOnly(false);
    setMode('list');
  };

  // Select Option Reference Handlers
  const handlePRSelect = async (prNo: string) => {
    if (!prNo) return;
    let selected = prList.find(p => p.docNo === prNo);
    if (selected && selected.id && (!selected.lines || (selected.lines as any[]).length === 0)) {
      try {
        const res = await axiosClient.get(`/v1/purchase/purchase-request/${selected.id}`);
        if (res.data) selected = res.data;
      } catch (e) {
        console.error('Failed to fetch full PR details', e);
      }
    }

    if (selected) {
      setForm(prev => ({
        ...prev,
        purchaseRequestNumber: prNo,
        buyer: selected?.requestBy || selected?.buyer || prev.buyer,
        requiredDate: selected?.requiredDate || prev.requiredDate,
        quotationValidityDate: selected?.requiredDate || prev.quotationValidityDate,
        requestingDepartment: selected?.requestingDepartment || prev.requestingDepartment,
        requestBy: selected?.requestBy || prev.requestBy,
        remarks: selected?.remarks ? `Ref PR: ${prNo} — ${selected.remarks}` : prev.remarks,
      }));

      const prLines = selected.lines;
      if (Array.isArray(prLines) && prLines.length > 0) {
        setLines(prLines.map((l: any, i: number) => ({
          lineNo: i + 1,
          itemCode: l.itemCode || 'ITEM-001',
          itemName: l.itemName || l.description || l.itemCode || '',
          specification: l.specification || '',
          drawingNumber: l.drawingNumber || '',
          drawingRevision: l.drawingRevision || '',
          requiredQty: Number(l.requiredQty ?? l.qty ?? 1),
          uom: l.uom || 'PCS',
          requiredDeliveryDate: l.requiredDate || selected?.requiredDate || '',
          remarks: l.remarks || '',
        })));
      }
    }
  };

  const handleEnquirySelect = async (enqNo: string) => {
    if (!enqNo) return;
    let selected = enquiryList.find(e => e.docNo === enqNo);
    if (selected && selected.id && (!selected.lines || (selected.lines as any[]).length === 0)) {
      try {
        const res = await axiosClient.get(`/v1/purchase/supplier-enquiry/${selected.id}`);
        if (res.data) selected = res.data;
      } catch (e) {
        console.error('Failed to fetch full Enquiry details', e);
      }
    }

    if (selected) {
      setForm(prev => ({
        ...prev,
        enquiryNumber: enqNo,
        supplier: selected?.supplier || prev.supplier,
        supplierCode: selected?.supplierCode || prev.supplierCode,
        contactPerson: selected?.contactPerson || prev.contactPerson,
        phone: selected?.phone || prev.phone,
        email: selected?.email || prev.email,
        buyer: selected?.buyer || prev.buyer,
        currency: selected?.currency || prev.currency,
        paymentTerms: selected?.paymentTerms || prev.paymentTerms,
        deliveryTerms: selected?.deliveryTerms || prev.deliveryTerms,
        validUntil: selected?.quotationValidityDate || prev.validUntil,
        remarks: selected?.remarks ? `Ref Enquiry: ${enqNo} — ${selected.remarks}` : prev.remarks,
      }));

      const enqLines = selected.lines;
      if (Array.isArray(enqLines) && enqLines.length > 0) {
        setLines(enqLines.map((l: any, i: number) => ({
          lineNo: i + 1,
          itemCode: l.itemCode || 'ITEM-001',
          itemName: l.itemName || l.description || l.itemCode || '',
          description: l.description || l.itemName || '',
          specification: l.specification || '',
          requiredQty: Number(l.requiredQty ?? l.qty ?? 1),
          orderQty: Number(l.requiredQty ?? l.qty ?? 1),
          qty: Number(l.requiredQty ?? l.qty ?? 1),
          uom: l.uom || 'PCS',
          unitPrice: Number(l.unitPrice ?? 0),
          discount: 0,
          tax: 0,
          netPrice: 0,
          netAmount: 0,
          deliveryLeadTime: 7,
          remarks: l.remarks || '',
        })));
      }
    }
  };

  const handleQuotationSelect = async (quotNo: string) => {
    if (!quotNo) return;
    let selected = quotationList.find(q => q.docNo === quotNo);
    if (!selected) {
      void lookupDocumentByNumber('supplier-quotation', quotNo).then((doc) => {
        if (!doc) return;
        const foundSupp = supplierMasters.find(s => s.name === doc.supplier || s.code === doc.supplier);
        const billAddr = getCompanyAddress(false);
        const shipAddr = getCompanyAddress(true);

        setForm(prev => ({
          ...prev,
          quotationNumber: quotNo,
          supplier: doc.supplier || doc.party || prev.supplier,
          supplierCode: doc.supplier || foundSupp?.code || prev.supplierCode,
          contactPerson: doc.raw?.contactPerson || foundSupp?.contactPerson || prev.contactPerson,
          phone: doc.raw?.phone || foundSupp?.phone || prev.phone,
          email: doc.raw?.email || foundSupp?.email || prev.email,
          paymentTerms: doc.raw?.paymentTerms || prev.paymentTerms,
          deliveryTerms: doc.raw?.deliveryTerms || prev.deliveryTerms,
          billingAddress: billAddr,
          shippingAddress: shipAddr,
        }));

        if (Array.isArray(doc.lines) && doc.lines.length > 0) {
          setLines(doc.lines.map((l: any, i: number) => ({
            lineNo: i + 1,
            itemCode: l.itemCode || 'ITEM-001',
            itemName: l.itemDesc || l.itemName || l.description || l.itemCode || '',
            description: l.description || l.itemDesc || l.itemName || '',
            specification: l.specification || '',
            orderQty: Number(l.qty || l.orderQty || l.requiredQty || 1),
            requiredQty: Number(l.qty || l.requiredQty || l.orderQty || 1),
            qty: Number(l.qty || l.orderQty || 1),
            uom: l.uom || 'PCS',
            unitPrice: Number(l.rate || l.unitPrice || 0),
            discount: Number(l.discount || 0),
            tax: Number(l.tax || 0),
            netAmount: Number(l.netAmount || (Number(l.rate || l.unitPrice || 0) * Number(l.qty || l.orderQty || 1))),
            requiredDate: doc.date || '',
            remarks: l.remarks || '',
          })));
        }
      });
      return;
    }

    if (selected && selected.id && (!selected.lines || (selected.lines as any[]).length === 0)) {
      try {
        const res = await axiosClient.get(`/v1/purchase/supplier-quotation/${selected.id}`);
        if (res.data) selected = res.data;
      } catch (e) {
        console.error('Failed to fetch full Quotation details', e);
      }
    }

    if (selected) {
      const foundSupp = supplierMasters.find(s => s.name === selected.supplier || s.code === selected.supplierCode);
      const billAddr = getCompanyAddress(false);
      const shipAddr = getCompanyAddress(true);

      setForm(prev => ({
        ...prev,
        quotationNumber: quotNo,
        purchaseRequestNumber: selected?.purchaseRequestNumber || selected?.enquiryNumber || prev.purchaseRequestNumber,
        supplier: selected?.supplier || prev.supplier,
        supplierCode: selected?.supplierCode || foundSupp?.code || prev.supplierCode,
        contactPerson: selected?.contactPerson || foundSupp?.contactPerson || prev.contactPerson,
        phone: selected?.phone || foundSupp?.phone || prev.phone,
        email: selected?.email || foundSupp?.email || prev.email,
        buyer: selected?.buyer || prev.buyer,
        department: selected?.department || prev.department,
        paymentTerms: selected?.paymentTerms || prev.paymentTerms,
        deliveryTerms: selected?.deliveryTerms || prev.deliveryTerms,
        currency: selected?.currency || prev.currency,
        expectedDeliveryDate: selected?.validUntil || prev.expectedDeliveryDate,
        billingAddress: billAddr,
        shippingAddress: shipAddr,
        remarks: selected?.remarks ? `Ref Quotation: ${quotNo} — ${selected.remarks}` : prev.remarks,
      }));

      const quotLines = selected.lines;
      if (Array.isArray(quotLines) && quotLines.length > 0) {
        setLines(quotLines.map((l: any, i: number) => ({
          lineNo: i + 1,
          itemCode: l.itemCode || 'ITEM-001',
          itemName: l.itemName || l.description || l.itemCode || '',
          description: l.description || l.itemName || '',
          specification: l.specification || '',
          drawingNumber: l.drawingNumber || '',
          drawingRevision: l.drawingRevision || '',
          orderQty: Number(l.orderQty ?? l.requiredQty ?? l.qty ?? 1),
          requiredQty: Number(l.requiredQty ?? l.orderQty ?? l.qty ?? 1),
          qty: Number(l.orderQty ?? l.requiredQty ?? l.qty ?? 1),
          uom: l.uom || 'PCS',
          unitPrice: Number(l.unitPrice ?? 0),
          discount: Number(l.discount ?? 0),
          tax: Number(l.tax ?? 0),
          netPrice: Number(l.netPrice ?? l.netAmount ?? (Number(l.unitPrice ?? 0) * Number(l.orderQty ?? l.requiredQty ?? 1))),
          netAmount: Number(l.netAmount ?? l.netPrice ?? (Number(l.unitPrice ?? 0) * Number(l.orderQty ?? l.requiredQty ?? 1))),
          requiredDate: selected?.validUntil || '',
          remarks: l.remarks || '',
        })));
      }
    }
  };

  const handleSupplierSelect = (supplierName: string) => {
    if (!supplierName) {
      setForm(prev => ({
        ...prev,
        supplier: '',
        supplierCode: '',
        contactPerson: '',
        phone: '',
        email: '',
      }));
      return;
    }
    const found = supplierMasters.find(s => s.name === supplierName);
    const code = found?.code || 'SUPP-001';
    const cp = (found as any)?.contactPerson || 'Purchase Manager';
    const ph = (found as any)?.phone || '+91 98765 43210';
    const em = (found as any)?.email || `sales@${supplierName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    setForm(prev => ({
      ...prev,
      supplier: supplierName,
      supplierCode: code,
      contactPerson: cp,
      phone: ph,
      email: em,
    }));
  };

  // Line item change & Column Master Item Lookup
  const handleLineItemChange = (index: number, fieldKey: string, value: any) => {
    setLines(prev => {
      const next = [...prev];
      const row = { ...next[index], [fieldKey]: value };

      if (fieldKey === 'itemCode') {
        if (value === 'OTHERS') {
          row.itemName = '';
          row.description = '';
          row.drawingNumber = '';
          row.storeWarehouse = '';
        } else {
          const item = itemMasters.find(i => i.code === value);
          if (item) {
            row.itemName = item.name;
            row.description = item.name + (item.description ? ` (${item.description})` : '');
            row.uom = item.uom || 'PCS';
            if (item.price) row.unitPrice = item.price;
          }
        }
      }

      // Recalculate row amounts
      const qty = Number(row.qty ?? row.requiredQty ?? row.orderQty ?? 1);
      const price = Number(row.unitPrice ?? 0);
      const discPct = Number(row.discount ?? 0);
      const discAmt = (qty * price * discPct) / 100;
      row.discountAmount = discAmt;
      const baseNet = (qty * price) - discAmt;

      let taxPct = 18;
      const tc = String(row.taxCode || 'GST 18%');
      if (tc.includes('28%')) taxPct = 28;
      else if (tc.includes('12%')) taxPct = 12;
      else if (tc.includes('5%')) taxPct = 5;
      else if (tc.includes('Exempt')) taxPct = 0;

      const taxAmt = (baseNet * taxPct) / 100;
      row.taxAmount = taxAmt;
      row.netAmount = baseNet + taxAmt;
      row.netPrice = baseNet + taxAmt;

      next[index] = row;
      return next;
    });
  };

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        lineNo: prev.length + 1,
        itemCode: itemMasters[0]?.code || 'ITEM-001',
        itemName: itemMasters[0]?.name || 'Precision CNC Shaft 25mm',
        description: 'Precision CNC Shaft 25mm',
        requiredQty: 100,
        orderQty: 100,
        qty: 100,
        uom: 'PCS',
        unitPrice: 450,
        discount: 0,
        taxCode: 'GST 18%',
        taxAmount: 8100,
        netAmount: 53100,
        netPrice: 53100,
        lineStatus: 'Open'
      }
    ]);
  };

  const removeLine = (index: number) => {
    setLines(prev => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, lineNo: i + 1 })));
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = { ...form };
    if (config.lines) {
      payload.lines = lines.map(l => ({ ...l }));
      const total = lines.reduce((sum, l) => sum + (Number(l.netAmount ?? l.netPrice ?? l.totalAmount ?? 0)), 0);
      if (total > 0 && !payload.totalAmount) {
        payload.totalAmount = total;
      }
    }
    return payload;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const payload = buildPayload();
      let savedRes: any;
      if (documentId) {
        savedRes = await updateMutation.mutateAsync({ id: documentId, payload });
        toast('Purchase Document updated successfully!', 'success');
      } else {
        savedRes = await createMutation.mutateAsync(payload);
        toast('Purchase Document created successfully!', 'success');
      }

      logSystemActivity({
        module: 'Purchase',
        activity: `${config.title} (${savedRes?.docNo || form.docNo || 'Document'})`,
        refNo: savedRes?.docNo || form.docNo || '',
        party: String(form.supplier || form.party || 'Supplier'),
        user: user?.username || 'Unknown',
        status: savedRes?.status || 'RELEASED',
      });

      backToList();
    } catch (err: any) {
      toast(getApiErrorMessage(err, 'Failed to save purchase document'), 'error');
    }
  };

  const handleAction = async () => {
    if (!actionModal || !documentId) return;
    try {
      await actionMutation.mutateAsync({ id: documentId, action: actionModal.action });
      toast(`Purchase Document ${actionModal.action}d successfully!`, 'success');
      setActionModal(null);
      backToList();
    } catch (err: any) {
      toast(getApiErrorMessage(err, 'Failed to perform action'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.id));
      toast('Purchase Document deleted successfully!', 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      toast(getApiErrorMessage(err, 'Failed to delete purchase document'), 'error');
    }
  };

  const handleSendEmail = async () => {
    if (!documentId) return;
    const mutation = mutationForSend();
    if (!mutation) return;
    try {
      const res = await mutation.mutateAsync(documentId);
      toast((res as any)?.message || 'Email sent!', 'success');
    } catch (err: any) {
      toast(getApiErrorMessage(err, 'Failed to send email'), 'error');
    }
  };

  const mutationForSend = () => {
    if (docType === 'supplier-enquiry') return sendEnquiryMutation;
    if (docType === 'purchase-order') return sendPoMutation;
    if (docType === 'job-order') return sendJoMutation;
    return null;
  };

  const canSendEmail = ['supplier-enquiry', 'purchase-order', 'job-order'].includes(docType);

  // Header Renderers
  if (mode === 'list') {
    return (
      <div className="view-container">
        <div className="pg-head pg-head-flex">
          <div className="pg-head-text">
            <h1>{config.title}</h1>
            <p>{config.subtitle}</p>
          </div>
          <button className="btn btn-p" onClick={() => openForm(null, false)}>
            <span className="material-symbols-rounded">add</span>
            New {config.title}
          </button>
        </div>

        {/* Filter Controls Panel */}
        <div className="panel">
          <div className="toolbar" style={{ gap: '8px', justifyContent: 'flex-start' }}>
            <div className="searchwrap" style={{ flex: '0 0 auto' }}>
              <span className="material-symbols-rounded">search</span>
              <input
                type="text"
                className="in"
                placeholder={`Search ${config.title}...`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ width: '250px' }}
              />
            </div>
            <button
              className="ibtn"
              title="Export CSV"
              onClick={() =>
                exportToCsv(
                  rows as unknown as Record<string, unknown>[],
                  config.columns.map((c) => ({ key: c.field, label: c.label })),
                  config.docType
                )
              }
            >
              <span className="material-symbols-rounded">download</span>
            </button>
            <select
              className="in"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ flex: '0 0 auto', width: '180px' }}
            >
              <option value="">All Statuses</option>
              {config.statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="sp" />
            <span className="count">{totalElements} records</span>
          </div>

          {/* List Table */}
          <div className="twrap">
            <table className="tbl">
              <thead>
                <tr>
                  {config.columns.map((col) => (
                    <th key={col.field} className={col.numeric ? 'num' : ''}>
                      {col.label}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.isLoading ? (
                  <tr>
                    <td colSpan={config.columns.length + 1} className="empty">
                      Loading purchase documents...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length + 1} className="empty">
                      <span className="material-symbols-rounded">inventory_2</span>
                      No purchase documents found. Click <strong>+ New {config.title}</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  rows.map((row: any) => (
                    <tr key={row.id}>
                      {config.columns.map((col) => {
                        const val = row[col.field];
                        if (col.badge) {
                          return (
                            <td key={col.field}>
                              <StatusBadge status={String(val || 'DRAFT')} />
                            </td>
                          );
                        }
                        if (col.numeric) {
                          return (
                            <td key={col.field} className="num cell-b">
                              {typeof val === 'number' ? formatNumber(val) : (val ?? '0')}
                            </td>
                          );
                        }
                        return (
                          <td key={col.field}>
                            {col.field === 'docNo' ? (
                              <a
                                onClick={() => openForm(String(row.id), true)}
                                className="cell-b"
                              >
                                {String(val || row.id)}
                              </a>
                            ) : (
                              String(val ?? '-')
                            )}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => openForm(String(row.id), true)}
                          className="ibtn"
                          title="View"
                        >
                          <span className="material-symbols-rounded">visibility</span>
                        </button>
                        <button
                          onClick={() => openForm(String(row.id), false)}
                          className="ibtn"
                          title="Edit"
                        >
                          <span className="material-symbols-rounded">edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(row)}
                          className="ibtn danger"
                          title="Delete"
                        >
                          <span className="material-symbols-rounded">delete</span>
                        </button>
                        <button
                          onClick={() => purchaseApi.printDocument(docType, row.id, 'download')}
                          className="ibtn"
                          title="Download PDF"
                        >
                          <span className="material-symbols-rounded">download</span>
                        </button>
                        <button
                          onClick={() => purchaseApi.printDocument(docType, row.id, 'print')}
                          className="ibtn"
                          title="Print"
                        >
                          <span className="material-symbols-rounded">print</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pager">
            <span>Showing page {page + 1} of {totalPages} ({totalElements} items)</span>
            <div className="pgs">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ‹
              </button>
              <button className="on">{page + 1}</button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {deleteTarget && (
          <ConfirmActionModal
            open={Boolean(deleteTarget)}
            title={`Delete ${config.title}`}
            body={`Are you sure you want to delete ${String(deleteTarget.docNo || deleteTarget.id)}?`}
            okLabel="Delete"
            danger={true}
            onConfirm={() => handleDelete()}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </div>
    );
  }

  // Form Mode
  return (
    <div className="view-container">
      {/* Form Page Header */}
      <div className="pg-head pg-head-flex">
        <div className="pg-head-text" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={backToList} className="btn btn-sm" title="Back to list">
            <span className="material-symbols-rounded">arrow_back</span>
            Back
          </button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {documentId ? `Edit ${config.title}` : `New ${config.title}`}
              {form.status ? <StatusBadge status={String(form.status)} /> : null}
            </h1>
            <p>{config.subtitle}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {documentId && (
            <button
              onClick={() => setAuditOpen(true)}
              className="btn btn-sm"
              title="Audit History"
            >
              <span className="material-symbols-rounded">history</span>
              Audit
            </button>
          )}
          {editable && (
            <button
              onClick={() => handleSave()}
              disabled={isBusy}
              className="btn btn-p"
            >
              <span className="material-symbols-rounded">save</span>
              {isBusy ? 'Saving...' : 'Save Document'}
            </button>
          )}
          {documentId && (String(form.status) === 'DRAFT' || String(form.status) === 'REJECTED') && (
            <button
              onClick={() => setActionModal({ action: 'submit', danger: false })}
              className="btn btn-g"
            >
              <span className="material-symbols-rounded">send</span>
              Submit
            </button>
          )}
          {documentId && String(form.status) === 'SUBMITTED' && can('purchase', 'Approve') && (
            <>
              <button
                onClick={() => setActionModal({ action: 'approve', danger: false })}
                className="btn btn-p"
              >
                <span className="material-symbols-rounded">check_circle</span>
                Approve
              </button>
              <button
                onClick={() => setActionModal({ action: 'reject', danger: true })}
                className="btn btn-d"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}
              >
                <span className="material-symbols-rounded">cancel</span>
                Reject
              </button>
            </>
          )}
          {documentId && String(form.status) === 'REJECTED' && (
            <button
              onClick={() => setActionModal({ action: 'reopen', danger: false })}
              className="btn btn-g"
            >
              <span className="material-symbols-rounded">restart_alt</span>
              Reopen
            </button>
          )}
          {documentId && ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(String(form.status)) && can('purchase', 'Cancel') && (
            <button
              onClick={() => setActionModal({ action: 'cancel', danger: true })}
              className="btn"
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            >
              <span className="material-symbols-rounded">block</span>
              Cancel
            </button>
          )}
          {documentId && canSendEmail && (
            <button
              onClick={() => handleSendEmail()}
              className="btn btn-p"
              title="Send document via email"
            >
              <span className="material-symbols-rounded">mail</span>
              Send Email
            </button>
          )}
        </div>
      </div>

      {/* Header Fields Section */}
      <div className="sec-head">
        <div className="sec-title">
          <span className="material-symbols-rounded">edit_note</span>
          1. Header Information
        </div>
      </div>
      <div className="sec-body">
        <div className="fgrid">
          {config.fields.map((field) => {
            const val = form[field.key] ?? '';

            // 2nd Header Input Field (Select Option for Document References)
            if (field.key === 'purchaseRequestNumber') {
              return (
                <div key={field.key} className="fld">
                  <span>
                    2. Source PR Reference (Select Option) <em className="req">*</em>
                  </span>
                  <select
                    disabled={!editable}
                    value={String(val)}
                    onChange={(e) => handlePRSelect(e.target.value)}
                    className="in"
                    style={{ fontWeight: 700, color: '#1e3a8a' }}
                  >
                    <option value="">-- Select Purchase Request --</option>
                    {prList.map((pr: any) => (
                      <option key={pr.docNo} value={pr.docNo}>
                        {pr.docNo} ({pr.requestingDepartment || 'Dept'}) - {pr.requestBy}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.key === 'enquiryNumber') {
              return (
                <div key={field.key} className="fld">
                  <span>
                    2. Enquiry Reference (Select Option) <em className="req">*</em>
                  </span>
                  <select
                    disabled={!editable}
                    value={String(val)}
                    onChange={(e) => handleEnquirySelect(e.target.value)}
                    className="in"
                    style={{ fontWeight: 700, color: '#1e3a8a' }}
                  >
                    <option value="">-- Select Supplier Enquiry --</option>
                    {enquiryList.map((enq: any) => (
                      <option key={enq.docNo} value={enq.docNo}>
                        {enq.docNo} - {enq.supplier || 'Supplier'} ({enq.date})
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.key === 'quotationNumber') {
              return (
                <div key={field.key} className="fld">
                  <span>
                    2. Reference Quotation (Select Option) <em className="req">*</em>
                  </span>
                  <select
                    disabled={!editable}
                    value={String(val)}
                    onChange={(e) => handleQuotationSelect(e.target.value)}
                    className="in"
                    style={{ fontWeight: 700, color: '#1e3a8a' }}
                  >
                    <option value="">-- Select Supplier Quotation --</option>
                    {quotationList.map((q: any) => (
                      <option key={q.docNo} value={q.docNo}>
                        {q.docNo} - {q.supplier} ({q.date})
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            // Supplier Master Select
            if (field.key === 'supplier') {
              return (
                <div key={field.key} className="fld">
                  <span>{field.label}</span>
                  <select
                    disabled={!editable}
                    value={String(val || '')}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    className="in"
                  >
                    <option value="">-- Select Supplier --</option>
                    {supplierMasters.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                    {val && !supplierMasters.some(s => s.name === val) && (
                      <option value={String(val)}>{String(val)}</option>
                    )}
                  </select>
                </div>
              );
            }

            return (
              <div key={field.key} className={`fld ${field.span2 ? 'span2' : ''}`}>
                <span>{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea
                    disabled={!editable || field.readOnly}
                    rows={2}
                    value={String(val)}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="in"
                  />
                ) : field.type === 'select' ? (
                  <select
                    disabled={!editable || field.readOnly}
                    value={String(val)}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="in"
                  >
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    disabled={!editable || field.readOnly}
                    value={String(val)}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="in"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Line Items Grid Section */}
      {config.lines && (
        <>
          <div className="sec-head" style={{ marginTop: '24px' }}>
            <div className="sec-title">
              <span className="material-symbols-rounded">list_alt</span>
              2. {config.lines.title}
            </div>
            {editable && (
              <button type="button" onClick={addLine} className="btn btn-sm btn-p">
                <span className="material-symbols-rounded">add</span>
                Add Item
              </button>
            )}
          </div>
          <div className="sec-body" style={{ padding: '0' }}>
            <div className="twrap">
              <table className="tbl lines">
                <thead>
                  <tr>
                    {config.lines.fields.map((f) => (
                      <th key={f.key}>{f.label}</th>
                    ))}
                    {editable && <th style={{ textAlign: 'right' }}>Remove</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      {config.lines!.fields.map((f) => {
                        const cellVal = line[f.key] ?? '';
                        const isOthers = String(line.itemCode).toUpperCase() === 'OTHERS';

                        // If item is OTHERS, remove storeWarehouse and drawingNumber
                        if (isOthers && (f.key === 'storeWarehouse' || f.key === 'drawingNumber')) {
                          return (
                            <td key={f.key} style={{ background: '#f8fafc', color: '#94a3b8', textAlign: 'center', fontSize: '12px' }}>
                              N/A
                            </td>
                          );
                        }

                        // Item Code Lookup Select
                        if (f.type === 'lookup') {
                          return (
                            <td key={f.key} className="w-i">
                              <select
                                disabled={!editable}
                                value={String(cellVal)}
                                onChange={(e) => handleLineItemChange(idx, f.key, e.target.value)}
                                className="in"
                                style={{ fontWeight: 700, color: '#1e3a8a' }}
                              >
                                <option value="">-- Select Item --</option>
                                {itemMasters.map((item) => {
                                  const nameStr = item.name || item.description || item.code;
                                  return (
                                    <option key={item.id} value={item.code}>
                                      {item.code} — {nameStr}
                                    </option>
                                  );
                                })}
                                <option value="OTHERS">OTHERS (Custom Item)</option>
                              </select>
                            </td>
                          );
                        }

                        // UOM Master Lookup Select
                        if (f.key === 'uom') {
                          return (
                            <td key={f.key}>
                              <select
                                disabled={!editable}
                                value={String(cellVal)}
                                onChange={(e) => handleLineItemChange(idx, f.key, e.target.value)}
                                className="in"
                              >
                                <option value="">-- UOM --</option>
                                {uomMasters.map((u) => (
                                  <option key={u.id} value={u.code}>
                                    {u.code} - {u.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (f.type === 'select') {
                          return (
                            <td key={f.key}>
                              <select
                                disabled={!editable || f.readOnly}
                                value={String(cellVal)}
                                onChange={(e) => handleLineItemChange(idx, f.key, e.target.value)}
                                className="in"
                              >
                                {(f.options || []).map((o) => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        return (
                          <td key={f.key}>
                            <input
                              type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                              disabled={!editable || f.readOnly}
                              value={String(cellVal)}
                              onChange={(e) => handleLineItemChange(idx, f.key, e.target.value)}
                              className="in"
                            />
                          </td>
                        );
                      })}
                      {editable && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="ibtn danger"
                            title="Remove row"
                          >
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Action Footer Bar */}
      <div className="actbar" style={{ marginTop: '24px' }}>
        <div className="lft">
          <span className="material-symbols-rounded">info</span>
          Fill all mandatory header and item details before submitting.
        </div>
        <button type="button" onClick={backToList} className="btn">
          Cancel
        </button>
        {editable && (
          <button type="button" onClick={() => handleSave()} disabled={isBusy} className="btn btn-p">
            <span className="material-symbols-rounded">save</span>
            {isBusy ? 'Saving...' : 'Save Document'}
          </button>
        )}
      </div>

      {actionModal && (
        <ConfirmActionModal
          open={Boolean(actionModal)}
          title={`Confirm ${actionModal.action.toUpperCase()}`}
          body={`Are you sure you want to ${actionModal.action} this purchase document?`}
          okLabel={actionModal.action.toUpperCase()}
          danger={actionModal.danger}
          onConfirm={() => handleAction()}
          onClose={() => setActionModal(null)}
        />
      )}

      <AuditHistoryDrawer open={auditOpen} entityType={auditEntityTypeFor(docType)} entityId={documentId ?? undefined} onClose={() => setAuditOpen(false)} />
    </div>
  );
}
