import apiClient from '../api/axiosClient';

export interface LookedUpLine {
  itemCode: string;
  itemDesc?: string;
  qty?: number;
  rate?: number;
  uom?: string;
  batchNo?: string;
  heatNo?: string;
  location?: string;
  returnable?: string;
  remarks?: string;
  [key: string]: any;
}

export interface LookedUpDocument {
  id?: string | number;
  docNo?: string;
  date?: string;
  party?: string;
  supplier?: string;
  customer?: string;
  subcontractor?: string;
  department?: string;
  purpose?: string;
  sourceLocation?: string;
  jobOrderNo?: string;
  workOrderNo?: string;
  salesOrderNo?: string;
  lines: LookedUpLine[];
  raw: Record<string, any>;
}

/**
 * Generic helper to fetch any reference document by number (e.g. PO, JO, SO, GRN, Inward, Issue Request, Allotment)
 * and normalize header details and lines for auto-filling forms.
 */
export async function lookupDocumentByNumber(
  docType: string,
  docNo: string
): Promise<LookedUpDocument | null> {
  if (!docType || !docNo || !docNo.trim()) {
    return null;
  }

  const cleanDocNo = docNo.trim();

  // Standard backend document lookup path
  const endpointsToTry = [
    `/inventory/documents/${docType}/by-number/${encodeURIComponent(cleanDocNo)}`,
    `/inventory/stock-issue/${docType}/by-number/${encodeURIComponent(cleanDocNo)}`,
    `/inventory/delivery-challan/${docType}/by-number/${encodeURIComponent(cleanDocNo)}`,
    `/inventory/return-management/${docType}/by-number/${encodeURIComponent(cleanDocNo)}`,
    `/inventory/allotment/${docType}/by-number/${encodeURIComponent(cleanDocNo)}`,
    `/inventory/store-receipt/${docType}/by-number/${encodeURIComponent(cleanDocNo)}`,
    `/inventory/supplier-invoice/${docType}/by-number/${encodeURIComponent(cleanDocNo)}`,
    `/v1/quality/docs/${docType}/by-number/${encodeURIComponent(cleanDocNo)}`,
    `/v1/quality/inspections/${encodeURIComponent(cleanDocNo)}`,
    `/v1/purchase/purchase-order/by-number/${encodeURIComponent(cleanDocNo)}`,
  ];

  for (const endpoint of endpointsToTry) {
    try {
      const response = await apiClient.get<Record<string, any>>(endpoint);
      const data = response.data;
      if (data && (data.id || data.docNo || data.number)) {
        return normalizeDocument(data);
      }
    } catch {
      // Try next endpoint if not found
    }
  }

  return null;
}

function normalizeDocument(raw: Record<string, any>): LookedUpDocument {
  const party =
    raw.party ||
    raw.supplier ||
    raw.supplierCode ||
    raw.vendor ||
    raw.customer ||
    raw.customerCode ||
    raw.subcontractor ||
    raw.subcontractorCode ||
    '';

  const rawLines = Array.isArray(raw.lines) ? raw.lines : Array.isArray(raw.items) ? raw.items : [];

  const lines: LookedUpLine[] = rawLines.map((l: any) => {
    const qty =
      l.qty ??
      l.issueQty ??
      l.receivedQty ??
      l.producedQty ??
      l.acceptedQty ??
      l.allottedQty ??
      l.requestedQty ??
      l.quantity ??
      0;

    return {
      itemCode: l.itemCode || l.code || '',
      itemDesc: l.itemDesc || l.description || l.itemName || '',
      qty: Number(qty) || 0,
      rate: l.rate ? Number(l.rate) : undefined,
      uom: l.uom || '',
      batchNo: l.batchNo || '',
      heatNo: l.heatNo || '',
      location: l.location || raw.sourceLocation || '',
      returnable: l.returnable || '',
      remarks: l.remarks || '',
      ...l,
    };
  });

  return {
    id: raw.id,
    docNo: raw.docNo || raw.number || '',
    date: raw.date || raw.docDate || '',
    party,
    supplier: raw.supplier || raw.supplierCode || party,
    customer: raw.customer || raw.customerCode || party,
    subcontractor: raw.subcontractor || raw.subcontractorCode || party,
    department: raw.department || '',
    purpose: raw.purpose || '',
    sourceLocation: raw.sourceLocation || '',
    jobOrderNo: raw.jobOrderNo || '',
    workOrderNo: raw.workOrderNo || '',
    salesOrderNo: raw.salesOrderNo || '',
    lines,
    raw,
  };
}
