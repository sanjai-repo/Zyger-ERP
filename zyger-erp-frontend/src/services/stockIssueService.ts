import apiClient from '../api/axiosClient';
import { printDocument as printDoc } from '../utils/printDocument';
import type { PageDto } from '../types/api.types';
import type {
  StockAvailabilityPair,
  StockAvailabilityResult,
  StockIssueDocumentAction,
  StockIssueDto,
  StockIssueListParams,
  StockIssueListRowDto,
  StockIssuePayload,
} from '../types/inventory/stockIssue.types';

const STOCK_AVAILABILITY_CHECK = '/inventory/stock/availability/check';

export type StockIssueExportFormat = 'xlsx' | 'pdf';

export const stockIssueService = {
  async getList(
    apiPath: string,
    params: StockIssueListParams,
    signal?: AbortSignal
  ): Promise<PageDto<StockIssueListRowDto>> {
    const response = await apiClient.get<PageDto<StockIssueListRowDto>>(
      apiPath,
      {
        params: {
          page: params.page,
          size: params.size,
          sort: params.sort || 'date,desc',
          search: params.search || undefined,
          status: params.status || undefined,
        },
        signal,
      }
    );

    return response.data;
  },

  async getById(
    apiPath: string,
    id: string,
    signal?: AbortSignal
  ): Promise<StockIssueDto> {
    const response = await apiClient.get<StockIssueDto>(`${apiPath}/${id}`, {
      signal,
    });

    return response.data;
  },

  async create(
    apiPath: string,
    payload: StockIssuePayload
  ): Promise<StockIssueDto> {
    const response = await apiClient.post<StockIssueDto>(apiPath, payload);
    return response.data;
  },

  async update(
    apiPath: string,
    id: string,
    payload: StockIssuePayload
  ): Promise<StockIssueDto> {
    const response = await apiClient.put<StockIssueDto>(
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
    action: StockIssueDocumentAction,
    note?: string
  ): Promise<StockIssueDto> {
    const response = await apiClient.post<StockIssueDto>(
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

  async checkAvailability(
    pairs: StockAvailabilityPair[],
    signal?: AbortSignal
  ): Promise<StockAvailabilityResult[]> {
    const response = await apiClient.post<
      StockAvailabilityResult[] | { results: StockAvailabilityResult[] }
    >(
      STOCK_AVAILABILITY_CHECK,
      {
        lines: pairs,
      },
      {
        signal,
      }
    );

    const data = response.data;

    return Array.isArray(data) ? data : data.results ?? [];
  },

  async exportFile(
    apiPath: string,
    fileTitle: string,
    params: Omit<StockIssueListParams, 'page' | 'size'>,
    format: StockIssueExportFormat
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

  printDocument(apiPath: string, id: number | string, mode: 'print' | 'download' = 'print') {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    printDoc(`${base}${apiPath}/${id}/print?download=${mode === 'download'}`, mode);
  },
};