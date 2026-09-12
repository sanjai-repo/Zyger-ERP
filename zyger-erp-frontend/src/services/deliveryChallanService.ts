import apiClient from '../api/axiosClient';
import { printDocument as printDoc } from '../utils/printDocument';
import type { PageDto } from '../types/api.types';
import type {
  DeliveryChallanDocumentAction,
  DeliveryChallanDto,
  DeliveryChallanListParams,
  DeliveryChallanListRowDto,
  DeliveryChallanPayload,
} from '../types/inventory/deliveryChallan.types';

export type DeliveryChallanExportFormat = 'xlsx' | 'pdf';

export const deliveryChallanService = {
  async getList(
    apiPath: string,
    params: DeliveryChallanListParams,
    signal?: AbortSignal
  ): Promise<PageDto<DeliveryChallanListRowDto>> {
    const response = await apiClient.get<
      PageDto<DeliveryChallanListRowDto>
    >(apiPath, {
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

  async getById(
    apiPath: string,
    id: string,
    signal?: AbortSignal
  ): Promise<DeliveryChallanDto> {
    const response = await apiClient.get<DeliveryChallanDto>(
      `${apiPath}/${id}`,
      {
        signal,
      }
    );

    return response.data;
  },

  async create(
    apiPath: string,
    payload: DeliveryChallanPayload
  ): Promise<DeliveryChallanDto> {
    const response = await apiClient.post<DeliveryChallanDto>(
      apiPath,
      payload
    );

    return response.data;
  },

  async update(
    apiPath: string,
    id: string,
    payload: DeliveryChallanPayload
  ): Promise<DeliveryChallanDto> {
    const response = await apiClient.put<DeliveryChallanDto>(
      `${apiPath}/${id}`,
      payload
    );

    return response.data;
  },

  async remove(apiPath: string, id: string): Promise<void> {
    await apiClient.delete(`${apiPath}/${id}`);
  },

  async action(
    apiPath: string,
    id: string,
    action: DeliveryChallanDocumentAction,
    note?: string
  ): Promise<DeliveryChallanDto> {
    const response = await apiClient.post<DeliveryChallanDto>(
      `${apiPath}/${id}/actions/${action}`,
      {
        note: note ?? '',
      }
    );

    return response.data;
  },

  async getNextNumber(
    apiPath: string,
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
    apiPath: string,
    fileTitle: string,
    params: Omit<DeliveryChallanListParams, 'page' | 'size'>,
    format: DeliveryChallanExportFormat
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

  /** Prints the Challan as HTML (browser print dialog) or downloads the PDF. */
  printDocument(
    apiPath: string,
    id: string,
    _docNo: string,
    mode: 'download' | 'print'
  ): void {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    const path = mode === 'print'
      ? `${base}${apiPath}/${id}/print/html`
      : `${base}${apiPath}/${id}/print?download=true`;
    printDoc(path, mode);
  },
};