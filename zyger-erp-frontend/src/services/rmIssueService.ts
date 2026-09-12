import apiClient from '../api/axiosClient';
import type { PageDto } from '../types/api.types';
import type {
  RmiDocumentAction,
  RmiDto,
  RmiListParams,
  RmiListRowDto,
  RmiNextNumber,
  RmiPayload,
  StockAvailabilityPair,
  StockAvailabilityResult,
} from '../types/inventory/rmIssue.types';

const BASE = '/inventory/stock-issue/rm-issue';
const STOCK_AVAILABILITY_CHECK = '/inventory/stock/availability/check';

export type RmiExportFormat = 'xlsx' | 'pdf';

export const rmIssueService = {
  async getList(
    params: RmiListParams,
    signal?: AbortSignal
  ): Promise<PageDto<RmiListRowDto>> {
    const response = await apiClient.get<PageDto<RmiListRowDto>>(BASE, {
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

  async getById(id: string, signal?: AbortSignal): Promise<RmiDto> {
    const response = await apiClient.get<RmiDto>(`${BASE}/${id}`, {
      signal,
    });

    return response.data;
  },

  async create(payload: RmiPayload): Promise<RmiDto> {
    const response = await apiClient.post<RmiDto>(BASE, payload);
    return response.data;
  },

  async update(id: string, payload: RmiPayload): Promise<RmiDto> {
    const response = await apiClient.put<RmiDto>(`${BASE}/${id}`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },

  async action(
    id: string,
    action: RmiDocumentAction,
    note?: string
  ): Promise<RmiDto> {
    const response = await apiClient.post<RmiDto>(
      `${BASE}/${id}/actions/${action}`,
      {
        note: note ?? '',
      }
    );

    return response.data;
  },

  async getNextNumber(signal?: AbortSignal): Promise<RmiNextNumber> {
    const response = await apiClient.get<RmiNextNumber>(
      `${BASE}/next-number`,
      {
        signal,
      }
    );

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
    params: Omit<RmiListParams, 'page' | 'size'>,
    format: RmiExportFormat
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
    anchor.download = `RM_Issue.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
    anchor.click();

    URL.revokeObjectURL(url);
  },
};