import apiClient from '../api/axiosClient';
import type { PageDto } from '../types/api.types';
import type {
  SirApprovedRequest,
  SirDocumentAction,
  SirDto,
  SirListParams,
  SirListRowDto,
  SirNextNumber,
  SirPayload,
} from '../types/inventory/stockIssueRequest.types';

type ApiList<T> = T[] | PageDto<T>;

function unwrap<T>(data: ApiList<T>): T[] {
  return Array.isArray(data) ? data : data.content ?? [];
}

const BASE = '/inventory/stock-issue-request';

export type SirExportFormat = 'xlsx' | 'pdf';

export interface SirApprovedLine {
  itemCode: string;
  approvedQty?: number;
}

export const stockIssueRequestService = {
  async getList(
    params: SirListParams,
    signal?: AbortSignal
  ): Promise<PageDto<SirListRowDto>> {
    const response = await apiClient.get<PageDto<SirListRowDto>>(BASE, {
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

  async getById(id: string, signal?: AbortSignal): Promise<SirDto> {
    const response = await apiClient.get<SirDto>(`${BASE}/${id}`, { signal });
    return response.data;
  },

  async create(payload: SirPayload): Promise<SirDto> {
    const response = await apiClient.post<SirDto>(BASE, payload);
    return response.data;
  },

  async update(id: string, payload: SirPayload): Promise<SirDto> {
    const response = await apiClient.put<SirDto>(`${BASE}/${id}`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },

  async action(
    id: string,
    action: SirDocumentAction,
    note?: string
  ): Promise<SirDto> {
    const response = await apiClient.post<SirDto>(
      `${BASE}/${id}/actions/${action}`,
      { note: note ?? '' }
    );
    return response.data;
  },

  /**
   * Approval carries the approver-edited approved quantities.
   * Backend should apply these quantities while approving.
   */
  async approve(
    id: string,
    note: string,
    lines: SirApprovedLine[]
  ): Promise<SirDto> {
    const response = await apiClient.post<SirDto>(
      `${BASE}/${id}/actions/approve`,
      {
        note: note ?? '',
        lines: lines ?? [],
      }
    );
    return response.data;
  },

  async getNextNumber(signal?: AbortSignal): Promise<SirNextNumber> {
    const response = await apiClient.get<SirNextNumber>(
      `${BASE}/next-number`,
      { signal }
    );
    return response.data;
  },

  /**
   * Approved Stock Issue Requests.
   * Consumed by Stock Issue (RM Issue) as the "Issue Request" source reference.
   */
  async getApprovedRequests(
    signal?: AbortSignal
  ): Promise<SirApprovedRequest[]> {
    const response = await apiClient.get<ApiList<SirListRowDto>>(BASE, {
      params: {
        status: 'APPROVED',
        page: 0,
        size: 200,
        sort: 'date,desc',
      },
      signal,
    });

    return unwrap(response.data).map((row) => ({
      id: row.id,
      docNo: row.docNo,
      date: row.date,
      department: row.department,
    }));
  },

  async exportFile(
    params: Omit<SirListParams, 'page' | 'size'>,
    format: SirExportFormat
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
    anchor.download = `Stock_Issue_Request.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
    anchor.click();

    URL.revokeObjectURL(url);
  },
};