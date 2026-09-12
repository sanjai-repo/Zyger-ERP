import apiClient from '../api/axiosClient';
import type { PageDto } from '../types/api.types';
import type {
  IssueInternalExternalDocumentAction,
  IssueInternalExternalDto,
  IssueInternalExternalListParams,
  IssueInternalExternalListRowDto,
  IssueInternalExternalNextNumber,
  IssueInternalExternalPayload,
  IssueInternalExternalType,
  StockAvailabilityPair,
  StockAvailabilityResult,
} from '../types/inventory/issueInternalExternal.types';

const BASE = '/inventory/stock-issue/issue-internal-external';
const STOCK_AVAILABILITY_CHECK = '/inventory/stock/availability/check';

export type IssueInternalExternalExportFormat = 'xlsx' | 'pdf';

export const issueInternalExternalService = {
  async getList(
    params: IssueInternalExternalListParams,
    signal?: AbortSignal
  ): Promise<PageDto<IssueInternalExternalListRowDto>> {
    const response = await apiClient.get<
      PageDto<IssueInternalExternalListRowDto>
    >(BASE, {
      params: {
        page: params.page,
        size: params.size,
        sort: params.sort || 'date,desc',
        search: params.search || undefined,
        status: params.status || undefined,
        issueType: params.issueType || undefined,
        returnable: params.returnable || undefined,
      },
      signal,
    });

    return response.data;
  },

  async getById(
    id: string,
    signal?: AbortSignal
  ): Promise<IssueInternalExternalDto> {
    const response = await apiClient.get<IssueInternalExternalDto>(
      `${BASE}/${id}`,
      { signal }
    );

    return response.data;
  },

  async create(
    payload: IssueInternalExternalPayload
  ): Promise<IssueInternalExternalDto> {
    const response = await apiClient.post<IssueInternalExternalDto>(
      BASE,
      payload
    );

    return response.data;
  },

  async update(
    id: string,
    payload: IssueInternalExternalPayload
  ): Promise<IssueInternalExternalDto> {
    const response = await apiClient.put<IssueInternalExternalDto>(
      `${BASE}/${id}`,
      payload
    );

    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },

  async action(
    id: string,
    action: IssueInternalExternalDocumentAction,
    note?: string
  ): Promise<IssueInternalExternalDto> {
    const response = await apiClient.post<IssueInternalExternalDto>(
      `${BASE}/${id}/actions/${action}`,
      { note: note ?? '' }
    );

    return response.data;
  },

  async getNextNumber(
    issueType: IssueInternalExternalType,
    signal?: AbortSignal
  ): Promise<IssueInternalExternalNextNumber> {
    const response = await apiClient.get<IssueInternalExternalNextNumber>(
      `${BASE}/next-number`,
      {
        params: { issueType },
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
      { lines: pairs },
      { signal }
    );

    const data = response.data;

    return Array.isArray(data) ? data : data.results ?? [];
  },

  async exportFile(
    fileTitle: string,
    params: Omit<IssueInternalExternalListParams, 'page' | 'size'>,
    format: IssueInternalExternalExportFormat
  ): Promise<void> {
    const response = await apiClient.get(`${BASE}/export`, {
      params: {
        format,
        search: params.search || undefined,
        status: params.status || undefined,
        issueType: params.issueType || undefined,
        returnable: params.returnable || undefined,
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
};