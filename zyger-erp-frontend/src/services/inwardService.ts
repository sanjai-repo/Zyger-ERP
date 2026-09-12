import apiClient from '../api/axiosClient';
import { printDocument as printDoc } from '../utils/printDocument';
import type { PageDto } from '../types/api.types';
import { INWARD_TYPES, type InwardType } from '../config/inwardConfig';
import type {
  InwardChartMetric,
  InwardChartPoint,
  InwardDashboardSummary,
  InwardListParams,
  InwardListRow,
  InwardNextNumber,
  InwardPayload,
  InwardPendingRow,
} from '../types/inward.types';

const DASHBOARD_BASE = '/inventory/inward';

export const inwardService = {
  async getDashboard(
    fromDate: string,
    toDate: string,
    signal?: AbortSignal
  ): Promise<InwardDashboardSummary> {
    const response = await apiClient.get<InwardDashboardSummary>(
      `${DASHBOARD_BASE}/dashboard`,
      { params: { fromDate, toDate }, signal }
    );
    return response.data;
  },

  async getChart(
    fromDate: string,
    toDate: string,
    metric: InwardChartMetric,
    signal?: AbortSignal
  ): Promise<InwardChartPoint[]> {
    const response = await apiClient.get<InwardChartPoint[]>(
      `${DASHBOARD_BASE}/chart`,
      { params: { fromDate, toDate, metric }, signal }
    );
    return response.data;
  },

  async getPending(signal?: AbortSignal): Promise<InwardPendingRow[]> {
    const response = await apiClient.get<InwardPendingRow[]>(
      `${DASHBOARD_BASE}/pending`,
      { signal }
    );
    return response.data;
  },

  async getLog(signal?: AbortSignal): Promise<InwardPendingRow[]> {
    const response = await apiClient.get<InwardPendingRow[]>(
      `${DASHBOARD_BASE}/log`,
      { signal }
    );
    return response.data;
  },

  async getNextNumber(
    inwardType: InwardType,
    signal?: AbortSignal
  ): Promise<InwardNextNumber> {
    const { apiPath } = INWARD_TYPES[inwardType];
    const response = await apiClient.get<InwardNextNumber>(
      `${apiPath}/next-number`,
      { signal }
    );
    return response.data;
  },

  async getList(
    inwardType: InwardType,
    params: InwardListParams,
    signal?: AbortSignal
  ): Promise<PageDto<InwardListRow>> {
    const { apiPath } = INWARD_TYPES[inwardType];
    const response = await apiClient.get<PageDto<InwardListRow>>(apiPath, {
      params: {
        page: params.page,
        size: params.size,
        sort: params.sort || 'date,desc',
        search: params.search || undefined,
        status: params.status || undefined,
        fromDate: params.fromDate || undefined,
        toDate: params.toDate || undefined,
      },
      signal,
    });
    return response.data;
  },

  async create(
    inwardType: InwardType,
    payload: InwardPayload
  ): Promise<any> {
    const { apiPath } = INWARD_TYPES[inwardType];
    const response = await apiClient.post(apiPath, payload);
    return response.data;
  },

  async getById(
    inwardType: InwardType,
    id: string | number,
    signal?: AbortSignal
  ): Promise<any> {
    const { apiPath } = INWARD_TYPES[inwardType];
    const response = await apiClient.get(`${apiPath}/${id}`, { signal });
    return response.data;
  },

  async update(
    inwardType: InwardType,
    id: string | number,
    payload: InwardPayload
  ): Promise<any> {
    const { apiPath } = INWARD_TYPES[inwardType];
    const response = await apiClient.put(`${apiPath}/${id}`, payload);
    return response.data;
  },

  async remove(
    inwardType: InwardType,
    id: string | number
  ): Promise<void> {
    const { apiPath } = INWARD_TYPES[inwardType];
    await apiClient.delete(`${apiPath}/${id}`);
  },

  async action(
    inwardType: InwardType,
    id: string | number,
    action: string,
    note?: string
  ): Promise<any> {
    const { apiPath } = INWARD_TYPES[inwardType];
    const response = await apiClient.post(`${apiPath}/${id}/actions/${action}`, {
      note: note ?? '',
    });
    return response.data;
  },

  printDocument(apiPath: string, id: number | string, mode: 'print' | 'download' = 'print') {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    printDoc(`${base}${apiPath}/${id}/print?download=${mode === 'download'}`, mode);
  },
};