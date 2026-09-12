import apiClient from '../api/axiosClient';
import { printDocument as printDoc } from '../utils/printDocument';
import type { PageDto } from '../types/api.types';
import type {
  DocumentAction,
  PoInwardDto,
  PoInwardListParams,
  PoInwardListRowDto,
  PoInwardPayload,
} from '../types/inventory/poInward.types';

const BASE = '/inventory/documents/po-inward';

export type ExportFormat = 'xlsx' | 'pdf';

export const poInwardService = {
  async getList(
    params: PoInwardListParams,
    signal?: AbortSignal
  ): Promise<PageDto<PoInwardListRowDto>> {
    const response = await apiClient.get<PageDto<PoInwardListRowDto>>(BASE, {
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

  async getById(id: string, signal?: AbortSignal): Promise<PoInwardDto> {
    const response = await apiClient.get<PoInwardDto>(`${BASE}/${id}`, {
      signal,
    });

    return response.data;
  },

  async create(payload: PoInwardPayload): Promise<PoInwardDto> {
    const response = await apiClient.post<PoInwardDto>(BASE, payload);
    return response.data;
  },

  async update(id: string, payload: PoInwardPayload): Promise<PoInwardDto> {
    const response = await apiClient.put<PoInwardDto>(`${BASE}/${id}`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },

  async action(
    id: string,
    action: DocumentAction,
    note?: string
  ): Promise<PoInwardDto> {
    const response = await apiClient.post<PoInwardDto>(
      `${BASE}/${id}/actions/${action}`,
      {
        note: note ?? '',
      }
    );

    return response.data;
  },

  async exportFile(
    params: Omit<PoInwardListParams, 'page' | 'size'>,
    format: ExportFormat
  ): Promise<void> {
    const response = await apiClient.get(`${BASE}/export`, {
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
    anchor.download = `PO_Inward.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
    anchor.click();

      URL.revokeObjectURL(url);
    },

    printDocument(apiPath: string, id: number | string, mode: 'print' | 'download' = 'print') {
      const base = import.meta.env.VITE_API_BASE_URL || '/api';
      printDoc(`${base}${apiPath}/${id}/print?download=${mode === 'download'}`, mode);
    },
};