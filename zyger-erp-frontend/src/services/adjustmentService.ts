import apiClient from '../api/axiosClient';
import { printDocument as printDoc } from '../utils/printDocument';
import type { PageDto } from '../types/api.types';
import type {
  AdjustmentDocumentAction,
  AdjustmentListParams,
  PhysicalStockAmendmentDto,
  PhysicalStockAmendmentListRowDto,
  PhysicalStockAmendmentPayload,
  StockAmendmentDto,
  StockAmendmentListRowDto,
  StockAmendmentPayload,
  StockBalanceResponse,
} from '../types/inventory/adjustment.types';

export type AdjustmentExportFormat = 'xlsx' | 'pdf';

const AMENDMENT_BASE = '/inventory/adjustment/stock-amendment';
const PHYSICAL_BASE = '/inventory/adjustment/physical-stock-amendment';
const STOCK_BALANCE = '/inventory/stock/balance';

/* ==================== STOCK BALANCE ==================== */

export async function getStockBalance(
  itemCode: string,
  location: string,
  batchNo?: string,
  signal?: AbortSignal
): Promise<StockBalanceResponse> {
  const response = await apiClient.get<StockBalanceResponse>(STOCK_BALANCE, {
    params: {
      itemCode,
      location,
      batchNo: batchNo || undefined,
    },
    signal,
  });

  return response.data;
}

/* ==================== STOCK AMENDMENT ==================== */

export const stockAmendmentService = {
  async getList(
    params: AdjustmentListParams,
    signal?: AbortSignal
  ): Promise<PageDto<StockAmendmentListRowDto>> {
    const response = await apiClient.get<
      PageDto<StockAmendmentListRowDto>
    >(AMENDMENT_BASE, {
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
  ): Promise<StockAmendmentDto> {
    const response = await apiClient.get<StockAmendmentDto>(
      `${AMENDMENT_BASE}/${id}`,
      { signal }
    );

    return response.data;
  },

  async create(
    payload: StockAmendmentPayload
  ): Promise<StockAmendmentDto> {
    const response = await apiClient.post<StockAmendmentDto>(
      AMENDMENT_BASE,
      payload
    );

    return response.data;
  },

  async update(
    id: string,
    payload: StockAmendmentPayload
  ): Promise<StockAmendmentDto> {
    const response = await apiClient.put<StockAmendmentDto>(
      `${AMENDMENT_BASE}/${id}`,
      payload
    );

    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${AMENDMENT_BASE}/${id}`);
  },

  async action(
    id: string,
    action: AdjustmentDocumentAction,
    note?: string
  ): Promise<StockAmendmentDto> {
    const response = await apiClient.post<StockAmendmentDto>(
      `${AMENDMENT_BASE}/${id}/actions/${action}`,
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
    }>(`${AMENDMENT_BASE}/next-number`, { signal });

    return response.data;
  },

  async exportFile(
    fileTitle: string,
    params: Omit<AdjustmentListParams, 'page' | 'size'>,
    format: AdjustmentExportFormat
  ): Promise<void> {
    const response = await apiClient.get(`${AMENDMENT_BASE}/export`, {
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

/* ==================== PHYSICAL STOCK AMENDMENT ==================== */

export const physicalStockAmendmentService = {
  async getList(
    params: AdjustmentListParams,
    signal?: AbortSignal
  ): Promise<PageDto<PhysicalStockAmendmentListRowDto>> {
    const response = await apiClient.get<
      PageDto<PhysicalStockAmendmentListRowDto>
    >(PHYSICAL_BASE, {
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
  ): Promise<PhysicalStockAmendmentDto> {
    const response = await apiClient.get<PhysicalStockAmendmentDto>(
      `${PHYSICAL_BASE}/${id}`,
      { signal }
    );

    return response.data;
  },

  async create(
    payload: PhysicalStockAmendmentPayload
  ): Promise<PhysicalStockAmendmentDto> {
    const response = await apiClient.post<PhysicalStockAmendmentDto>(
      PHYSICAL_BASE,
      payload
    );

    return response.data;
  },

  async update(
    id: string,
    payload: PhysicalStockAmendmentPayload
  ): Promise<PhysicalStockAmendmentDto> {
    const response = await apiClient.put<PhysicalStockAmendmentDto>(
      `${PHYSICAL_BASE}/${id}`,
      payload
    );

    return response.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${PHYSICAL_BASE}/${id}`);
  },

  async action(
    id: string,
    action: AdjustmentDocumentAction,
    note?: string
  ): Promise<PhysicalStockAmendmentDto> {
    const response = await apiClient.post<PhysicalStockAmendmentDto>(
      `${PHYSICAL_BASE}/${id}/actions/${action}`,
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
    }>(`${PHYSICAL_BASE}/next-number`, { signal });

    return response.data;
  },

  async exportFile(
    fileTitle: string,
    params: Omit<AdjustmentListParams, 'page' | 'size'>,
    format: AdjustmentExportFormat
  ): Promise<void> {
    const response = await apiClient.get(`${PHYSICAL_BASE}/export`, {
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