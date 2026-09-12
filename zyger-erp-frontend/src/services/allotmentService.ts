import apiClient from '../api/axiosClient';
import { printDocument as printDoc } from '../utils/printDocument';
import type { PageDto } from '../types/api.types';
import type {
  AllotmentDocumentAction,
  AllotmentListParams,
  ReleaseDocumentAction,
  StockAllotmentDto,
  StockAllotmentListRowDto,
  StockAllotmentPayload,
  StockReleaseDto,
  StockReleaseListRowDto,
  StockReleasePayload,
} from '../types/inventory/allotment.types';

export type AllotmentExportFormat = 'xlsx' | 'pdf';

const ALLOTMENT_BASE = '/inventory/allotment/stock-allotment';
const RELEASE_BASE = '/inventory/allotment/stock-release';

/* ==================== STOCK ALLOTMENT ==================== */

export const stockAllotmentService = {
  async getList(
    params: AllotmentListParams,
    signal?: AbortSignal
  ): Promise<PageDto<StockAllotmentListRowDto>> {
    const response = await apiClient.get<
      PageDto<StockAllotmentListRowDto>
    >(ALLOTMENT_BASE, {
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
    id: string,
    signal?: AbortSignal
  ): Promise<StockAllotmentDto> {
    const response = await apiClient.get<StockAllotmentDto>(
      `${ALLOTMENT_BASE}/${id}`,
      { signal }
    );

    return response.data;
  },

  async create(
    payload: StockAllotmentPayload
  ): Promise<StockAllotmentDto> {
    const response = await apiClient.post<StockAllotmentDto>(
      ALLOTMENT_BASE,
      payload
    );

    return response.data;
  },

  async update(
    id: string,
    payload: StockAllotmentPayload
  ): Promise<StockAllotmentDto> {
    const response = await apiClient.put<StockAllotmentDto>(
      `${ALLOTMENT_BASE}/${id}`,
      payload
    );

    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${ALLOTMENT_BASE}/${id}`);
  },

  async action(
    id: string,
    action: AllotmentDocumentAction,
    note?: string
  ): Promise<StockAllotmentDto> {
    const response = await apiClient.post<StockAllotmentDto>(
      `${ALLOTMENT_BASE}/${id}/actions/${action}`,
      { note: note ?? '' }
    );

    return response.data;
  },

  async getNextNumber(
    signal?: AbortSignal
  ): Promise<{ prefix?: string; nextNumber: string }> {
    const response = await apiClient.get<{
      prefix?: string;
      nextNumber: string;
    }>(`${ALLOTMENT_BASE}/next-number`, { signal });

    return response.data;
  },

  async getApprovedAllotments(
    signal?: AbortSignal
  ): Promise<Array<{ docNo: string; id: string }>> {
    const response = await apiClient.get<
      PageDto<StockAllotmentListRowDto>
    >(ALLOTMENT_BASE, {
      params: {
        status: 'APPROVED',
        page: 0,
        size: 200,
        sort: 'date,desc',
      },
      signal,
    });

    return (response.data.content ?? []).map((row) => ({
      docNo: row.docNo,
      id: row.id,
    }));
  },

  async getByNumber(
    allotmentNo: string,
    signal?: AbortSignal
  ): Promise<StockAllotmentDto> {
    const response = await apiClient.get<StockAllotmentDto>(
      `${ALLOTMENT_BASE}/by-number/${allotmentNo}`,
      { signal }
    );

    return response.data;
  },

  async exportFile(
    fileTitle: string,
    params: Omit<AllotmentListParams, 'page' | 'size'>,
    format: AllotmentExportFormat
  ): Promise<void> {
    const response = await apiClient.get(`${ALLOTMENT_BASE}/export`, {
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

/* ==================== STOCK RELEASE ==================== */

export const stockReleaseService = {
  async getList(
    params: AllotmentListParams,
    signal?: AbortSignal
  ): Promise<PageDto<StockReleaseListRowDto>> {
    const response = await apiClient.get<
      PageDto<StockReleaseListRowDto>
    >(RELEASE_BASE, {
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
    id: string,
    signal?: AbortSignal
  ): Promise<StockReleaseDto> {
    const response = await apiClient.get<StockReleaseDto>(
      `${RELEASE_BASE}/${id}`,
      { signal }
    );

    return response.data;
  },

  async create(
    payload: StockReleasePayload
  ): Promise<StockReleaseDto> {
    const response = await apiClient.post<StockReleaseDto>(
      RELEASE_BASE,
      payload
    );

    return response.data;
  },

  async update(
    id: string,
    payload: StockReleasePayload
  ): Promise<StockReleaseDto> {
    const response = await apiClient.put<StockReleaseDto>(
      `${RELEASE_BASE}/${id}`,
      payload
    );

    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${RELEASE_BASE}/${id}`);
  },

  async action(
    id: string,
    action: ReleaseDocumentAction,
    note?: string
  ): Promise<StockReleaseDto> {
    const response = await apiClient.post<StockReleaseDto>(
      `${RELEASE_BASE}/${id}/actions/${action}`,
      { note: note ?? '' }
    );

    return response.data;
  },

  async getNextNumber(
    signal?: AbortSignal
  ): Promise<{ prefix?: string; nextNumber: string }> {
    const response = await apiClient.get<{
      prefix?: string;
      nextNumber: string;
    }>(`${RELEASE_BASE}/next-number`, { signal });

    return response.data;
  },

  async exportFile(
    fileTitle: string,
    params: Omit<AllotmentListParams, 'page' | 'size'>,
    format: AllotmentExportFormat
  ): Promise<void> {
    const response = await apiClient.get(`${RELEASE_BASE}/export`, {
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