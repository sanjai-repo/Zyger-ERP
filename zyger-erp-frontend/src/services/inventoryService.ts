import apiClient from '../api/axiosClient';
import type { PageDto } from '../types/api.types';
import type {
  InventoryDashboardSummary,
  LedgerEntryDto,
  LowStockItemDto,
} from '../types/inventory.types';

/**
 * These endpoint paths are intentionally centralized.
 * If Spring Boot exposes different routes, update only this file.
 */
const INVENTORY_ENDPOINTS = {
  dashboardSummary: '/inventory/dashboard/summary',
  inventoryTransactions: '/inventory-transactions',
  lowStock: '/inventory/low-stock',
} as const;

export const inventoryService = {
  async getDashboardSummary(signal?: AbortSignal): Promise<InventoryDashboardSummary> {
    const response = await apiClient.get<InventoryDashboardSummary>(
      INVENTORY_ENDPOINTS.dashboardSummary,
      { signal }
    );

    return response.data;
  },

  async getRecentLedger(signal?: AbortSignal): Promise<LedgerEntryDto[]> {
    const response = await apiClient.get<PageDto<LedgerEntryDto>>(
      INVENTORY_ENDPOINTS.inventoryTransactions,
      {
        params: {
          page: 0,
          size: 8,
          sort: 'date,desc',
        },
        signal,
      }
    );

    return response.data.content;
  },

  async getLowStock(signal?: AbortSignal): Promise<LowStockItemDto[]> {
    const response = await apiClient.get<PageDto<LowStockItemDto>>(
      INVENTORY_ENDPOINTS.lowStock,
      {
        params: {
          page: 0,
          size: 20,
        },
        signal,
      }
    );

    return response.data.content;
  },
};