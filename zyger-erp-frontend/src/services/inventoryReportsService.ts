import apiClient from '../api/axiosClient';
import type { PageDto } from '../types/api.types';
import type {
  DrilldownRow,
  ReportQueryParams,
  ReportsOverviewDto,
  SimpleReportDto,
  StockSummaryDto,
} from '../types/inventory/reports.types';

const BASE = '/inventory/reports';

export type ReportExportFormat = 'xlsx' | 'pdf';

function buildParams(params: ReportQueryParams) {
  return {
    page: params.page,
    size: params.size,
    sort: params.sort || undefined,
    search: params.search || undefined,
    fromDate: params.fromDate || undefined,
    toDate: params.toDate || undefined,
    itemCode: params.itemCode || undefined,
    location: params.location || undefined,
    category: params.category || undefined,
    status: params.status || undefined,
    txType: params.txType || undefined,
    lowStockOnly: params.lowStockOnly || undefined,
    includeZero: params.includeZero || undefined,
  };
}

export const inventoryReportsService = {
  async getOverview(
    params: { fromDate?: string; toDate?: string },
    signal?: AbortSignal
  ): Promise<ReportsOverviewDto> {
    const response = await apiClient.get<ReportsOverviewDto>(
      `${BASE}/overview`,
      {
        params,
        signal,
      }
    );

    return response.data;
  },

  async getStockLedger(
    params: ReportQueryParams,
    signal?: AbortSignal
  ): Promise<PageDto<DrilldownRow>> {
    const response = await apiClient.get<PageDto<DrilldownRow>>(
      `${BASE}/stock-ledger`,
      {
        params: buildParams(params),
        signal,
      }
    );

    return response.data;
  },

  async getCurrentStock(
    params: ReportQueryParams,
    signal?: AbortSignal
  ): Promise<PageDto<DrilldownRow>> {
    const response = await apiClient.get<PageDto<DrilldownRow>>(
      `${BASE}/current-stock`,
      {
        params: buildParams(params),
        signal,
      }
    );

    return response.data;
  },

  async getDrilldown(
    type: string,
    params: ReportQueryParams,
    signal?: AbortSignal
  ): Promise<PageDto<DrilldownRow>> {
    const response = await apiClient.get<PageDto<DrilldownRow>>(
      `${BASE}/drilldown/${type}`,
      {
        params: buildParams(params),
        signal,
      }
    );

    return response.data;
  },

  async getStockSummary(signal?: AbortSignal): Promise<StockSummaryDto> {
    const response = await apiClient.get<StockSummaryDto>(
      `${BASE}/stock-summary`,
      { signal }
    );
    return response.data;
  },

  async getSimple(signal?: AbortSignal): Promise<SimpleReportDto> {
    const response = await apiClient.get<SimpleReportDto>(`${BASE}/simple`, {
      signal,
    });
    return response.data;
  },

  async deleteDocument(
    docKey: string,
    id: string | number
  ): Promise<void> {
    await apiClient.delete(`/inventory/documents/${docKey}/${id}`);
  },

  async exportFile(
    path: string,
    fileTitle: string,
    params: ReportQueryParams,
    format: ReportExportFormat
  ): Promise<void> {
    const response = await apiClient.get(`${BASE}/${path}/export`, {
      params: buildParams(params),
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