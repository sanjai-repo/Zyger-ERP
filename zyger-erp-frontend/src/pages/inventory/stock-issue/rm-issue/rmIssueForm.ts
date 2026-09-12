import type { ItemMasterDto } from '../../../../types/master.types';
import type {
  RmiDto,
  RmiLineDto,
  RmiPayload,
} from '../../../../types/inventory/rmIssue.types';
import { toNumber, todayISO } from '../../../../utils/format';

export interface RmIssueLineFormState {
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

export interface RmIssueFormState {
  date: string;
  jobOrderNo: string;
  issueRequestNo: string;
  sourceLocation: string;
  remarks: string;
  lines: RmIssueLineFormState[];
}

const DIRTY_LINE_KEYS: Array<keyof RmIssueLineFormState> = [
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
): RmIssueLineFormState {
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

export function createEmptyForm(): RmIssueFormState {
  return {
    date: todayISO(),
    jobOrderNo: '',
    issueRequestNo: '',
    sourceLocation: '',
    remarks: '',
    lines: [createEmptyLine()],
  };
}

export function isLineDirty(line: RmIssueLineFormState): boolean {
  return DIRTY_LINE_KEYS.some(
    (key) => String(line[key] ?? '').trim() !== ''
  );
}

function lineFromDto(
  line: RmiLineDto,
  itemsMap: Map<string, ItemMasterDto>,
  fallbackLocation: string
): RmIssueLineFormState {
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
  dto: RmiDto,
  items: ItemMasterDto[]
): RmIssueFormState {
  const itemsMap = new Map(items.map((item) => [item.code, item]));

  return {
    date: dto.date ?? '',
    jobOrderNo: dto.jobOrderNo ?? '',
    issueRequestNo: dto.issueRequestNo ?? '',
    sourceLocation: dto.sourceLocation ?? '',
    remarks: dto.remarks ?? '',
    lines:
      dto.lines && dto.lines.length > 0
        ? dto.lines.map((line) =>
            lineFromDto(line, itemsMap, dto.sourceLocation ?? '')
          )
        : [createEmptyLine(dto.sourceLocation ?? '')],
  };
}

export function buildPayload(form: RmIssueFormState): RmiPayload {
  const activeLines = form.lines.filter(isLineDirty);

  return {
    date: form.date,
    jobOrderNo: form.jobOrderNo.trim(),
    issueRequestNo: form.issueRequestNo.trim() || undefined,
    sourceLocation: form.sourceLocation.trim(),
    remarks: form.remarks.trim() || undefined,
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

export function validateRmIssueForm(
  form: RmIssueFormState,
  itemsMap: Map<string, ItemMasterDto>,
  strict: boolean,
  availabilityMap: Record<string, string>
): string[] {
  const errors: string[] = [];

  if (!form.date) {
    errors.push('Date is required.');
  }

  if (!form.jobOrderNo.trim()) {
    errors.push('Job Order is required.');
  }

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