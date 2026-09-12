import type {
  PurchaseInvoiceDto,
  PurchaseInvoicePayload,
  SupplierInvoiceAttachment,
} from '../../../../types/inventory/supplierInvoice.types';
import { toNumber, todayISO } from '../../../../utils/format';

export interface PurchaseInvoiceFormState {
  date: string;
  supplier: string;
  purchaseOrderNo: string;
  supplierInvoiceNo: string;
  taxAmount: string;
  totalAmount: string;
  dueDate: string;
  attachments: SupplierInvoiceAttachment[];
}

export function createEmptyForm(): PurchaseInvoiceFormState {
  return {
    date: todayISO(),
    supplier: '',
    purchaseOrderNo: '',
    supplierInvoiceNo: '',
    taxAmount: '',
    totalAmount: '',
    dueDate: '',
    attachments: [],
  };
}

export function formFromDto(
  dto: PurchaseInvoiceDto
): PurchaseInvoiceFormState {
  return {
    date: dto.date ?? '',
    supplier: dto.supplier ?? '',
    purchaseOrderNo: dto.purchaseOrderNo ?? '',
    supplierInvoiceNo: dto.supplierInvoiceNo ?? '',
    taxAmount: dto.taxAmount?.toString() ?? '',
    totalAmount: dto.totalAmount?.toString() ?? '',
    dueDate: dto.dueDate ?? '',
    attachments: dto.attachments ?? [],
  };
}

export function buildPayload(
  form: PurchaseInvoiceFormState
): PurchaseInvoicePayload {
  return {
    date: form.date,
    supplier: form.supplier.trim(),
    purchaseOrderNo: form.purchaseOrderNo.trim(),
    supplierInvoiceNo: form.supplierInvoiceNo.trim(),
    taxAmount: toNumber(form.taxAmount) || undefined,
    totalAmount: toNumber(form.totalAmount),
    dueDate: form.dueDate.trim() || undefined,
  };
}

export function validatePurchaseInvoiceForm(
  form: PurchaseInvoiceFormState
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

  if (!form.supplierInvoiceNo.trim()) {
    errors.push('Supplier Invoice No is required.');
  }

  const totalAmount = toNumber(form.totalAmount);

  if (!totalAmount || totalAmount <= 0) {
    errors.push('Total Amount is required and must be greater than zero.');
  }

  return [...new Set(errors)];
}