import type { ItemMasterDto } from '../../../../types/master.types';
import type {
  StockReleaseDto,
  StockReleaseLineDto,
  StockReleasePayload,
} from '../../../../types/inventory/allotment.types';
import { toNumber, todayISO } from '../../../../utils/format';

export interface StockReleaseLineFormState {
  itemCode: string;
  itemDesc: string;
  reservedQty: string;
  releasedQty: string;
  batchNo: string;
  location?: string;
}

export interface StockReleaseFormState {
  date: string;
  allotmentNo: string;
  reason: string;
  remarks: string;
  lines: StockReleaseLineFormState[];
}

const DIRTY_LINE_KEYS: Array<keyof StockReleaseLineFormState> = [
  'itemCode',
  'releasedQty',
  'batchNo',
];

export function createEmptyLine(): StockReleaseLineFormState {
  return {
    itemCode: '',
    itemDesc: '',
    reservedQty: '',
    releasedQty: '',
    batchNo: '',
    location: '',
  };
}

export function createEmptyForm(): StockReleaseFormState {
  return {
    date: todayISO(),
    allotmentNo: '',
    reason: '',
    remarks: '',
    lines: [createEmptyLine()],
  };
}

export function isLineDirty(
  line: StockReleaseLineFormState
): boolean {
  return DIRTY_LINE_KEYS.some(
    (key) => String(line[key] ?? '').trim() !== ''
  );
}

function lineFromDto(
  line: StockReleaseLineDto,
  itemsMap: Map<string, ItemMasterDto>
): StockReleaseLineFormState {
  const item = itemsMap.get(line.itemCode);

  return {
    itemCode: line.itemCode ?? '',
    itemDesc: line.itemDesc ?? item?.description ?? '',
    reservedQty: '',
    releasedQty: line.releasedQty?.toString() ?? '',
    batchNo: line.batchNo ?? '',
    location: line.location ?? '',
  };
}

export function formFromDto(
  dto: StockReleaseDto,
  items: ItemMasterDto[]
): StockReleaseFormState {
  const itemsMap = new Map(items.map((item) => [item.code, item]));

  return {
    date: dto.date ?? '',
    allotmentNo: dto.allotmentNo ?? '',
    reason: dto.reason ?? '',
    remarks: dto.remarks ?? '',
    lines:
      dto.lines && dto.lines.length > 0
        ? dto.lines.map((line) => lineFromDto(line, itemsMap))
        : [createEmptyLine()],
  };
}

export function buildPayload(
  form: StockReleaseFormState
): StockReleasePayload {
  const activeLines = form.lines.filter(isLineDirty);

  return {
    date: form.date,
    allotmentNo: form.allotmentNo.trim(),
    reason: form.reason.trim(),
    remarks: form.remarks.trim() || undefined,
    lines: activeLines.map((line) => ({
      itemCode: line.itemCode.trim(),
      releasedQty: toNumber(line.releasedQty),
      batchNo: line.batchNo.trim() || undefined,
      location: line.location?.trim() || undefined,
    })),
  };
}

export function validateStockReleaseForm(
  form: StockReleaseFormState,
  _itemsMap: Map<string, ItemMasterDto>,
  _strict: boolean
): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  if (!form.allotmentNo.trim()) {
    errors.push('Allotment No is required.');
  }

  if (!form.reason.trim()) {
    errors.push('Reason is required.');
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

    const releasedQty = toNumber(line.releasedQty);

    if (!releasedQty || releasedQty <= 0) {
      errors.push(`Line ${lineNo}: Released Qty is required.`);
    }
  });

  return [...new Set(errors)];
}