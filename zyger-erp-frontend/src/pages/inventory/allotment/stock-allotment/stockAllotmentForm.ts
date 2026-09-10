import type { ItemMasterDto } from '../../../../types/master.types';
import type {
  StockAllotmentDto,
  StockAllotmentLineDto,
  StockAllotmentPayload,
} from '../../../../types/inventory/allotment.types';
import { toNumber, todayISO } from '../../../../utils/format';

export interface StockAllotmentLineFormState {
  itemCode: string;
  itemDesc: string;
  availableQty: string;
  allottedQty: string;
  batchNo: string;
  heatNo: string;
  location: string;
}

export interface StockAllotmentFormState {
  date: string;
  allotmentType: string;
  referenceNo: string;
  customer: string;
  remarks: string;
  lines: StockAllotmentLineFormState[];
}

const DIRTY_LINE_KEYS: Array<keyof StockAllotmentLineFormState> = [
  'itemCode',
  'allottedQty',
  'batchNo',
  'heatNo',
];

export function createEmptyLine(
  defaultLocation = ''
): StockAllotmentLineFormState {
  return {
    itemCode: '',
    itemDesc: '',
    availableQty: '',
    allottedQty: '',
    batchNo: '',
    heatNo: '',
    location: defaultLocation,
  };
}

export function createEmptyForm(): StockAllotmentFormState {
  return {
    date: todayISO(),
    allotmentType: '',
    referenceNo: '',
    customer: '',
    remarks: '',
    lines: [createEmptyLine()],
  };
}

export function isLineDirty(
  line: StockAllotmentLineFormState
): boolean {
  return DIRTY_LINE_KEYS.some(
    (key) => String(line[key] ?? '').trim() !== ''
  );
}

function lineFromDto(
  line: StockAllotmentLineDto,
  itemsMap: Map<string, ItemMasterDto>
): StockAllotmentLineFormState {
  const item = itemsMap.get(line.itemCode);

  return {
    itemCode: line.itemCode ?? '',
    itemDesc: line.itemDesc ?? item?.description ?? '',
    availableQty: '',
    allottedQty: line.allottedQty?.toString() ?? '',
    batchNo: line.batchNo ?? '',
    heatNo: line.heatNo ?? '',
    location: line.location ?? '',
  };
}

export function formFromDto(
  dto: StockAllotmentDto,
  items: ItemMasterDto[]
): StockAllotmentFormState {
  const itemsMap = new Map(items.map((item) => [item.code, item]));

  return {
    date: dto.date ?? '',
    allotmentType: dto.allotmentType ?? '',
    referenceNo: dto.referenceNo ?? '',
    customer: dto.customer ?? '',
    remarks: dto.remarks ?? '',
    lines:
      dto.lines && dto.lines.length > 0
        ? dto.lines.map((line) => lineFromDto(line, itemsMap))
        : [createEmptyLine()],
  };
}

export function buildPayload(
  form: StockAllotmentFormState
): StockAllotmentPayload {
  const activeLines = form.lines.filter(isLineDirty);

  return {
    date: form.date,
    allotmentType: form.allotmentType.trim(),
    referenceNo: form.referenceNo.trim(),
    customer: form.customer.trim() || undefined,
    remarks: form.remarks.trim() || undefined,
    lines: activeLines.map((line) => ({
      itemCode: line.itemCode.trim(),
      allottedQty: toNumber(line.allottedQty),
      batchNo: line.batchNo.trim() || undefined,
      heatNo: line.heatNo.trim() || undefined,
      location: line.location.trim(),
    })),
  };
}

export function validateStockAllotmentForm(
  form: StockAllotmentFormState,
  itemsMap: Map<string, ItemMasterDto>,
  strict: boolean
): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  if (!form.allotmentType.trim()) {
    errors.push('Allotment Type is required.');
  }

  if (!form.referenceNo.trim()) {
    errors.push('Reference No is required.');
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

    const allottedQty = toNumber(line.allottedQty);

    if (!allottedQty || allottedQty <= 0) {
      errors.push(`Line ${lineNo}: Allotted Qty is required.`);
    }

    if (!line.location.trim()) {
      errors.push(`Line ${lineNo}: Location is required.`);
    }

  });

  return [...new Set(errors)];
}