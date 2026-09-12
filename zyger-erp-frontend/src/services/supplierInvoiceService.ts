import apiClient from '../api/axiosClient';
import { printDocument as printDoc } from '../utils/printDocument';
import type { PageDto } from '../types/api.types';
import type {
  PurchaseInvoiceDto,
  PurchaseInvoiceListRowDto,
  PurchaseInvoicePayload,
  SubcontractInvoiceDto,
  SubcontractInvoiceListRowDto,
  SubcontractInvoicePayload,
  SupplierInvoiceDocumentAction,
  SupplierInvoiceListParams,
} from '../types/inventory/supplierInvoice.types';

export type SupplierInvoiceExportFormat = 'xlsx' | 'pdf';

function buildService<TDto, TListRow, TPayload>(apiPath: string) {
  return {
    async getList(
      params: SupplierInvoiceListParams,
      signal?: AbortSignal
    ): Promise<PageDto<TListRow>> {
      const response = await apiClient.get<PageDto<TListRow>>(apiPath, {
        params: {
          page: params.page,
          size: params.size,
          sort: params.sort || 'date,desc',
          search: params.search || undefined,
          status: params.status || undefined,
        },
        signal,
      });

      return response.data;
    },

    async getById(id: string, signal?: AbortSignal): Promise<TDto> {
      const response = await apiClient.get<TDto>(`${apiPath}/${id}`, {
        signal,
      });

      return response.data;
    },

    async create(payload: TPayload): Promise<TDto> {
      const response = await apiClient.post<TDto>(apiPath, payload);
      return response.data;
    },

    async update(id: string, payload: TPayload): Promise<TDto> {
      const response = await apiClient.put<TDto>(`${apiPath}/${id}`, payload);
      return response.data;
    },

    async remove(id: string): Promise<void> {
      await apiClient.delete(`${apiPath}/${id}`);
    },

    async action(
      id: string,
      action: SupplierInvoiceDocumentAction,
      note?: string
    ): Promise<TDto> {
      const response = await apiClient.post<TDto>(
        `${apiPath}/${id}/actions/${action}`,
        {
          note: note ?? '',
        }
      );

      return response.data;
    },

    async getNextNumber(
      signal?: AbortSignal
    ): Promise<{ prefix?: string; nextNumber: string }> {
      const response = await apiClient.get<{
        prefix?: string;
        nextNumber: string;
      }>(`${apiPath}/next-number`, {
        signal,
      });

      return response.data;
    },

    async exportFile(
      fileTitle: string,
      params: Omit<SupplierInvoiceListParams, 'page' | 'size'>,
      format: SupplierInvoiceExportFormat
    ): Promise<void> {
      const response = await apiClient.get(`${apiPath}/export`, {
        params: {
          format,
          search: params.search || undefined,
          status: params.status || undefined,
          sort: params.sort || 'date,desc',
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${fileTitle.replace(/\s+/g, '_')}.${
        format === 'xlsx' ? 'xlsx' : 'pdf'
      }`;
      anchor.click();

      URL.revokeObjectURL(url);
    },

    async uploadAttachments(id: string, files: File[]): Promise<TDto> {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await apiClient.post<TDto>(
        `${apiPath}/${id}/attachments`,
        formData
      );

      return response.data;
    },

    async downloadAttachment(
      id: string,
      attachmentId: string,
      fileName: string
    ): Promise<void> {
      const response = await apiClient.get(
        `${apiPath}/${id}/attachments/${attachmentId}`,
        {
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || 'attachment';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    },

    async removeAttachment(id: string, attachmentId: string): Promise<TDto> {
      const response = await apiClient.delete<TDto>(
        `${apiPath}/${id}/attachments/${attachmentId}`
      );

      return response.data;
    },

    printDocument(apiPathStr: string, id: number | string, mode: 'print' | 'download' = 'print') {
      const base = import.meta.env.VITE_API_BASE_URL || '/api';
      printDoc(`${base}${apiPathStr}/${id}/print?download=${mode === 'download'}`, mode);
    },
  };
}

export const purchaseInvoiceService = buildService<
  PurchaseInvoiceDto,
  PurchaseInvoiceListRowDto,
  PurchaseInvoicePayload
>('/inventory/supplier-invoice/purchase-invoice');

export const subcontractInvoiceService = buildService<
  SubcontractInvoiceDto,
  SubcontractInvoiceListRowDto,
  SubcontractInvoicePayload
>('/inventory/supplier-invoice/subcontract-invoice');