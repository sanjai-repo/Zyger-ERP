import type { ItemMasterDto } from '../../../../types/master.types';
import type {
  StockIssueDto,
  StockIssueLineDto,
  StockIssuePayload,
  StockIssueTypeConfig,
} from '../../../../types/inventory/stockIssue.types';
import { toNumber, todayISO } from '../../../../utils/format';

export interface StockIssueLineFormState {
  itemCode: string;
  itemDesc: string;
  availableQty: string;
  issueQty: string;
  batchNo: string;
  heatNo: string;
  returnable: string;
  location: string;
  remarks: string;
}

export interface StockIssueFormState {
  date: string;
  issueRequestNo: string;
  sourceLocation: string;
  remarks: string;
  fields: Record<string, string>;
  lines: StockIssueLineFormState[];
}

const DIRTY_LINE_KEYS: Array<keyof StockIssueLineFormState> = [
  'itemCode',
  'issueQty',
  'batchNo',
  'heatNo',
  'returnable',
  'remarks',
];

export function availabilityKey(itemCode: string, location: string): string {
  return `${itemCode}|${location}`;
}

export function createEmptyLine(
  defaultLocation = ''
): StockIssueLineFormState {
  return {
    itemCode: '',
    itemDesc: '',
    availableQty: '',
    issueQty: '',
    batchNo: '',
    heatNo: '',
    returnable: '',
    location: defaultLocation,
    remarks: '',
  };
}

export function createEmptyForm(
  config: StockIssueTypeConfig
): StockIssueFormState {
  const fields: Record<string, string> = {};

  config.headerFields.forEach((field) => {
    fields[field.key] = field.fixed ?? '';
  });

  return {
    date: todayISO(),
    issueRequestNo: '',
    sourceLocation: '',
    remarks: '',
    fields,
    lines: [createEmptyLine()],
  };
}

export function isLineDirty(line: StockIssueLineFormState): boolean {
  return DIRTY_LINE_KEYS.some(
    (key) => String(line[key] ?? '').trim() !== ''
  );
}

function lineFromDto(
  line: StockIssueLineDto,
  itemsMap: Map<string, ItemMasterDto>,
  fallbackLocation: string
): StockIssueLineFormState {
  const item = itemsMap.get(line.itemCode);

  return {
    itemCode: line.itemCode ?? '',
    itemDesc: line.itemDesc ?? item?.description ?? '',
    availableQty: '',
    issueQty: line.issueQty?.toString() ?? '',
    batchNo: line.batchNo ?? '',
    heatNo: line.heatNo ?? '',
    returnable: line.returnable ?? '',
    location: line.location ?? fallbackLocation,
    remarks: line.remarks ?? '',
  };
}

export function formFromDto(
  config: StockIssueTypeConfig,
  dto: StockIssueDto,
  items: ItemMasterDto[]
): StockIssueFormState {
  const itemsMap = new Map(items.map((item) => [item.code, item]));

  const fields: Record<string, string> = {};

  const record = dto as Record<string, unknown>;

  config.headerFields.forEach((field) => {
    const value = record[field.key];

    fields[field.key] =
      value === null || value === undefined
        ? field.fixed ?? ''
        : String(value);
  });

  return {
    date: dto.date ?? '',
    issueRequestNo: record['issueRequestNo'] as string ?? '',
    sourceLocation: dto.sourceLocation ?? '',
    remarks: dto.remarks ?? '',
    fields,
    lines:
      dto.lines && dto.lines.length > 0
        ? dto.lines.map((line) =>
            lineFromDto(line, itemsMap, dto.sourceLocation ?? '')
          )
        : [createEmptyLine(dto.sourceLocation ?? '')],
  };
}

export function buildPayload(
  form: StockIssueFormState
): StockIssuePayload {
  const activeLines = form.lines.filter(isLineDirty);

  return {
    date: form.date,
    issueRequestNo: form.issueRequestNo.trim() || undefined,
    sourceLocation: form.sourceLocation.trim(),
    remarks: form.remarks.trim() || undefined,
    ...form.fields,
    lines: activeLines.map((line) => ({
      itemCode: line.itemCode.trim(),
      issueQty: toNumber(line.issueQty),
      batchNo: line.batchNo.trim() || undefined,
      heatNo: line.heatNo.trim() || undefined,
      returnable: line.returnable.trim() || undefined,
      location: line.location.trim(),
      remarks: line.remarks.trim() || undefined,
    })),
  };
}

export function validateStockIssueForm(
  config: StockIssueTypeConfig,
  form: StockIssueFormState,
  itemsMap: Map<string, ItemMasterDto>,
  strict: boolean,
  availabilityMap: Record<string, string>
): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  config.headerFields.forEach((field) => {
    if (field.required && !field.fixed) {
      if (!String(form.fields[field.key] ?? '').trim()) {
        errors.push(`${field.label} is required.`);
      }
    }
  });

  if (!form.sourceLocation.trim()) {
    errors.push('Source Location is required.');
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

    const qty = toNumber(line.issueQty);

    if (!qty || qty <= 0) {
      errors.push(`Line ${lineNo}: Issue Qty is required.`);
    }

    if (!line.location.trim()) {
      errors.push(`Line ${lineNo}: Location is required.`);
    }

    if (strict && line.itemCode) {
      const effectiveLocation = line.location || form.sourceLocation;

      if (effectiveLocation) {
        const availableValue =
          availabilityMap[availabilityKey(line.itemCode, effectiveLocation)];

        if (availableValue !== undefined) {
          const availableQty = toNumber(availableValue);

          if (qty > availableQty + 0.001) {
            errors.push(
              `Line ${lineNo}: insufficient stock for ${line.itemCode} (available ${availableQty}).`
            );
          }
        }
      }
    }
  });

  return [...new Set(errors)];
}