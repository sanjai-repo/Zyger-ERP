import type { ItemMasterDto } from '../../../../types/master.types';
import type {
  SubcontractInvoiceDto,
  SubcontractInvoiceLineDto,
  SubcontractInvoicePayload,
  SupplierInvoiceAttachment,
} from '../../../../types/inventory/supplierInvoice.types';
import { toNumber, todayISO } from '../../../../utils/format';

export interface SubcontractInvoiceLineFormState {
  itemCode: string;
  itemDesc: string;
  processedQty: string;
  rate: string;
  amount: string;
}

export interface SubcontractInvoiceFormState {
  date: string;
  vendor: string;
  labourOrderNo: string;
  process: string;
  totalAmount: string;
  attachments: SupplierInvoiceAttachment[];
  lines: SubcontractInvoiceLineFormState[];
}

const DIRTY_LINE_KEYS: Array<keyof SubcontractInvoiceLineFormState> = [
  'itemCode',
  'processedQty',
  'rate',
];

export function createEmptyLine(): SubcontractInvoiceLineFormState {
  return {
    itemCode: '',
    itemDesc: '',
    processedQty: '',
    rate: '',
    amount: '',
  };
}

export function createEmptyForm(): SubcontractInvoiceFormState {
  return {
    date: todayISO(),
    vendor: '',
    labourOrderNo: '',
    process: '',
    totalAmount: '',
    attachments: [],
    lines: [createEmptyLine()],
  };
}

export function isLineDirty(
  line: SubcontractInvoiceLineFormState
): boolean {
  return DIRTY_LINE_KEYS.some(
    (key) => String(line[key] ?? '').trim() !== ''
  );
}

function lineFromDto(
  line: SubcontractInvoiceLineDto,
  itemsMap: Map<string, ItemMasterDto>
): SubcontractInvoiceLineFormState {
  const item = itemsMap.get(line.itemCode);

  return {
    itemCode: line.itemCode ?? '',
    itemDesc: line.itemDesc ?? item?.description ?? '',
    processedQty: line.processedQty?.toString() ?? '',
    rate: line.rate?.toString() ?? '',
    amount: line.amount?.toString() ?? '',
  };
}

export function formFromDto(
  dto: SubcontractInvoiceDto,
  items: ItemMasterDto[]
): SubcontractInvoiceFormState {
  const itemsMap = new Map(items.map((item) => [item.code, item]));

  return {
    date: dto.date ?? '',
    vendor: dto.vendor ?? '',
    labourOrderNo: dto.labourOrderNo ?? '',
    process: dto.process ?? '',
    totalAmount: dto.totalAmount?.toString() ?? '',
    attachments: dto.attachments ?? [],
    lines:
      dto.lines && dto.lines.length > 0
        ? dto.lines.map((line) => lineFromDto(line, itemsMap))
        : [createEmptyLine()],
  };
}

export function buildPayload(
  form: SubcontractInvoiceFormState
): SubcontractInvoicePayload {
  const activeLines = form.lines.filter(isLineDirty);

  return {
    date: form.date,
    vendor: form.vendor.trim(),
    labourOrderNo: form.labourOrderNo.trim(),
    process: form.process.trim(),
    totalAmount: toNumber(form.totalAmount),
    lines: activeLines.map((line) => ({
      itemCode: line.itemCode.trim(),
      processedQty: toNumber(line.processedQty),
      rate: toNumber(line.rate),
    })),
  };
}

export function validateSubcontractInvoiceForm(
  form: SubcontractInvoiceFormState,
  itemsMap: Map<string, ItemMasterDto>
): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  if (!form.vendor.trim()) {
    errors.push('Vendor is required.');
  }

  if (!form.labourOrderNo.trim()) {
    errors.push('Labour Order is required.');
  }

  if (!form.process.trim()) {
    errors.push('Process is required.');
  }

  const totalAmount = toNumber(form.totalAmount);

  if (!totalAmount || totalAmount <= 0) {
    errors.push('Total Amount is required and must be greater than zero.');
  }

  const activeLines = form.lines.filter(isLineDirty);

  if (activeLines.length === 0) {
    errors.push('At least one line item is required.');
  }

  activeLines.forEach((line, index) => {
    const lineNo = index + 1;

    if (!line.itemCode.trim()) {
      errors.push(`Line ${lineNo}: Item Code is required.`);
    } else if (!itemsMap.has(line.itemCode.trim())) {
      errors.push(
        `Line ${lineNo}: Item code "${line.itemCode.trim()}" is not valid.`
      );
    }

    const processedQty = toNumber(line.processedQty);

    if (!processedQty || processedQty <= 0) {
      errors.push(`Line ${lineNo}: Processed Qty is required.`);
    }

    const rate = toNumber(line.rate);

    if (!rate || rate <= 0) {
      errors.push(`Line ${lineNo}: Rate is required.`);
    }
  });

  return [...new Set(errors)];
}