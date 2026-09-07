import type { ItemMasterDto } from '../../../../types/master.types';
import type {
  PoInwardDto,
  PoInwardLineDto,
  PoInwardPayload,
} from '../../../../types/inventory/poInward.types';
import { toNumber, toOptionalNumber, todayISO } from '../../../../utils/format';

export interface PoInwardLineFormState {
  itemCode: string;
  itemDesc: string;
  description: string;
  uom: string;
  receivedQty: string;
  rate: string;
  amount: string;
  discount: string;
  tax: string;
  taxAmount: string;
  netAmount: string;
  acceptedQty: string;
  rejectedQty: string;
  rejectedReason: string;
  batchNo: string;
  heatNo: string;
  location: string;
  remarks: string;
}

export interface PoInwardFormState {
  date: string;
  supplier: string;
  purchaseOrderNo: string;
  supplierChallanNo: string;
  supplierInvoiceNo: string;
  dcNumber: string;
  qcRequired: string;
  vehicleNo: string;
  receivedBy: string;
  remarks: string;
  lines: PoInwardLineFormState[];
}

const DIRTY_LINE_KEYS: Array<keyof PoInwardLineFormState> = [
  'itemCode',
  'description',
  'receivedQty',
  'rate',
  'discount',
  'tax',
  'acceptedQty',
  'rejectedQty',
  'batchNo',
  'heatNo',
  'location',
  'remarks',
];

export function createEmptyLine(defaultLoc = ''): PoInwardLineFormState {
  return {
    itemCode: '',
    itemDesc: '',
    description: '',
    uom: '',
    receivedQty: '',
    rate: '',
    amount: '',
    discount: '',
    tax: '',
    taxAmount: '',
    netAmount: '',
    acceptedQty: '',
    rejectedQty: '',
    rejectedReason: '',
    batchNo: '',
    heatNo: '',
    location: defaultLoc,
    remarks: '',
  };
}

export function createEmptyForm(): PoInwardFormState {
  return {
    date: todayISO(),
    supplier: '',
    purchaseOrderNo: '',
    supplierChallanNo: '',
    supplierInvoiceNo: '',
    dcNumber: '',
    qcRequired: 'Yes',
    vehicleNo: '',
    receivedBy: '',
    remarks: '',
    lines: [createEmptyLine()],
  };
}

export function isLineDirty(line: PoInwardLineFormState): boolean {
  return DIRTY_LINE_KEYS.some(
    (key) => String(line[key] ?? '').trim() !== ''
  );
}

function lineFromDto(
  line: PoInwardLineDto,
  itemsMap: Map<string, ItemMasterDto>
): PoInwardLineFormState {
  const item = itemsMap.get(line.itemCode);

  return {
    itemCode: line.itemCode ?? '',
    itemDesc: line.itemDesc ?? item?.description ?? '',
    description: line.description ?? line.itemDesc ?? item?.description ?? '',
    uom: line.uom ?? item?.uom ?? '',
    receivedQty: line.receivedQty?.toString() ?? (line as any).qty?.toString() ?? '',
    rate: line.rate?.toString() ?? '',
    amount: line.amount?.toString() ?? '',
    discount: line.discount?.toString() ?? '',
    tax: line.tax?.toString() ?? '',
    taxAmount: line.taxAmount?.toString() ?? '',
    netAmount: line.netAmount?.toString() ?? '',
    acceptedQty: line.acceptedQty?.toString() ?? '',
    rejectedQty: line.rejectedQty?.toString() ?? '',
    rejectedReason: line.rejectedReason ?? '',
    batchNo: line.batchNo ?? '',
    heatNo: line.heatNo ?? '',
    location: line.location ?? '',
    remarks: line.remarks ?? '',
  };
}

export function formFromDto(
  dto: PoInwardDto,
  items: ItemMasterDto[]
): PoInwardFormState {
  const itemsMap = new Map(items.map((item) => [item.code, item]));

  return {
    date: dto.date ?? '',
    supplier: dto.supplier ?? '',
    purchaseOrderNo: dto.purchaseOrderNo ?? '',
    supplierChallanNo: dto.supplierChallanNo ?? '',
    supplierInvoiceNo: (dto as any).supplierInvoiceNo ?? '',
    dcNumber: (dto as any).dcNumber ?? '',
    qcRequired: (dto as any).qcRequired ?? 'Yes',
    vehicleNo: dto.vehicleNo ?? '',
    receivedBy: dto.receivedBy ?? '',
    remarks: dto.remarks ?? '',
    lines:
      dto.lines && dto.lines.length > 0
        ? dto.lines.map((line) => lineFromDto(line, itemsMap))
        : [createEmptyLine()],
  };
}

export function buildPayload(form: PoInwardFormState): PoInwardPayload {
  const activeLines = form.lines.filter(isLineDirty);

  return {
    date: form.date,
    supplier: form.supplier.trim(),
    purchaseOrderNo: form.purchaseOrderNo.trim() || undefined,
    supplierChallanNo: form.supplierChallanNo.trim() || undefined,
    supplierInvoiceNo: form.supplierInvoiceNo.trim() || undefined,
    dcNumber: form.dcNumber.trim() || undefined,
    qcRequired: form.qcRequired.trim() || 'Yes',
    vehicleNo: form.vehicleNo.trim() || undefined,
    receivedBy: form.receivedBy.trim(),
    remarks: form.remarks.trim() || undefined,
    lines: activeLines.map((line) => ({
      itemCode: line.itemCode.trim(),
      itemDesc: line.itemDesc.trim() || undefined,
      description: line.description.trim() || undefined,
      uom: line.uom.trim() || undefined,
      receivedQty: toNumber(line.receivedQty),
      rate: toOptionalNumber(line.rate),
      amount: toOptionalNumber(line.amount),
      discount: toOptionalNumber(line.discount),
      tax: toOptionalNumber(line.tax),
      taxAmount: toOptionalNumber(line.taxAmount),
      netAmount: toOptionalNumber(line.netAmount),
      acceptedQty: toOptionalNumber(line.acceptedQty),
      rejectedQty: toOptionalNumber(line.rejectedQty),
      rejectedReason: line.rejectedReason?.trim() || undefined,
      batchNo: line.batchNo.trim() || undefined,
      heatNo: line.heatNo.trim() || undefined,
      location: line.location.trim(),
      remarks: line.remarks.trim() || undefined,
    })),
  };
}

export function validatePoInwardForm(
  form: PoInwardFormState,
  itemsMap: Map<string, ItemMasterDto>,
  strict: boolean
): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  if (!form.supplier.trim()) {
    errors.push('Supplier is required.');
  }

  if (!form.purchaseOrderNo.trim()) {
    errors.push('Purchase Order is required.');
  }

  if (!form.receivedBy.trim()) {
    errors.push('Received By is required.');
  }

  const activeLines = form.lines.filter(isLineDirty);

  if (activeLines.length === 0) {
    errors.push('At least one line item is required.');
  }

  activeLines.forEach((line, index) => {
    const lineNo = index + 1;

    if (!line.itemCode.trim()) {
      errors.push(`Line ${lineNo}: Item Code is required.`);
    }

    const qty = toNumber(line.receivedQty);

    if (!qty || qty <= 0) {
      errors.push(`Line ${lineNo}: Qty is required.`);
    }

    if (!line.location.trim()) {
      errors.push(`Line ${lineNo}: Location is required.`);
    }

    if (strict && line.itemCode) {
      const item = itemsMap.get(line.itemCode);

      if (item?.requiresBatch && !line.batchNo.trim()) {
        errors.push(
          `Line ${lineNo}: Batch No mandatory for ${line.itemCode}.`
        );
      }

      if (item?.requiresHeat && !line.heatNo.trim()) {
        errors.push(
          `Line ${lineNo}: Heat No mandatory for ${line.itemCode}.`
        );
      }
    }
  });

  return [...new Set(errors)];
}