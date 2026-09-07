import apiClient from '../api/axiosClient';
import type { PageDto } from '../types/api.types';
import type {
  ItemMasterDto,
  LocationDto,
  PurchaseOrderDto,
  SupplierDto,
} from '../types/master.types';

type ApiList<T> = T[] | PageDto<T>;

function unwrap<T>(data: ApiList<T>): T[] {
  return Array.isArray(data) ? data : data.content ?? [];
}

/**
 * These endpoint paths are intentionally centralized.
 * If Spring Boot uses different master endpoints, update only this file.
 */
const MASTER_ENDPOINTS = {
  items: '/master/items',
  suppliers: '/master/suppliers',
  purchaseOrders: '/v1/purchase/purchase-order',
  locations: '/inventory/locations',
} as const;


export const masterService = {
  async getItems(signal?: AbortSignal): Promise<ItemMasterDto[]> {
    const response = await apiClient.get<ApiList<ItemMasterDto>>(
      MASTER_ENDPOINTS.items,
      {
        params: {
          active: true,
          page: 0,
          size: 500,
          sort: 'code,asc',
        },
        signal,
      }
    );

    return unwrap(response.data);
  },

  async getUoms(signal?: AbortSignal): Promise<Array<{ id?: number; code: string; name?: string }>> {
    try {
      const response = await apiClient.get('/master/uoms', { signal });
      return unwrap(response.data);
    } catch {
      return [];
    }
  },

  async getSuppliers(signal?: AbortSignal): Promise<SupplierDto[]> {
    const response = await apiClient.get<ApiList<SupplierDto>>(
      MASTER_ENDPOINTS.suppliers,
      {
        params: {
          active: true,
          page: 0,
          size: 200,
          sort: 'name,asc',
        },
        signal,
      }
    );

    return unwrap(response.data);
  },

  async getApprovedPurchaseOrders(
    signal?: AbortSignal
  ): Promise<PurchaseOrderDto[]> {
    const response = await apiClient.get<ApiList<PurchaseOrderDto>>(
      MASTER_ENDPOINTS.purchaseOrders,
      {
        params: {
          page: 0,
          size: 200,
        },
        signal,
      }
    );

    const list = unwrap(response.data);
    return list.map((po: any) => ({
      ...po,
      number: po.docNo || po.number || '',
    }));
  },

  async getLocations(signal?: AbortSignal): Promise<LocationDto[]> {
    const response = await apiClient.get<ApiList<LocationDto>>(
      MASTER_ENDPOINTS.locations,
      {
        params: {
          active: true,
          page: 0,
          size: 200,
          sort: 'code,asc',
        },
        signal,
      }
    );

    return unwrap(response.data);
  },

  async getJobOrders(signal?: AbortSignal): Promise<{ number: string }[]> {
    const response = await apiClient.get('/job-orders', {
      params: { page: 0, size: 200, sort: 'number,asc' },
      signal,
    });
    return unwrap(response.data);
  },

  async getLabourOrders(signal?: AbortSignal): Promise<{ number: string }[]> {
    const response = await apiClient.get('/labour-orders', {
      params: { page: 0, size: 200, sort: 'number,asc' },
      signal,
    });
    return unwrap(response.data);
  },

    async getDepartments(signal?: AbortSignal): Promise<string[]> {
    const response = await apiClient.get<ApiList<unknown>>(
      '/master/departments',
      {
        params: { active: true, page: 0, size: 200 },
        signal,
      }
    );

    const rows = unwrap(response.data) as Array<
      string | { code?: string; name?: string }
    >;

    return rows
      .map((d) => (typeof d === 'string' ? d : d.code ?? d.name ?? ''))
      .filter((d): d is string => Boolean(d));
  },

    async getCustomers(
    signal?: AbortSignal
  ): Promise<Array<{ code: string; name: string }>> {
    const response = await apiClient.get('/master/customers', {
      params: {
        active: true,
        page: 0,
        size: 200,
        sort: 'name,asc',
      },
      signal,
    });

    return unwrap(response.data);
  },

    async getPostedGrns(
    signal?: AbortSignal
  ): Promise<Array<{ docNo: string; date?: string; party?: string }>> {
    const response = await apiClient.get<any>('/inventory/store-receipt/grn', {
      params: {
        status: 'POSTED',
        page: 0,
        size: 200,
        sort: 'date,desc',
      },
      signal,
    });

    return (response.data.content ?? []).map((row: any) => ({
      docNo: row.docNo,
      date: row.date,
      party: row.party,
    }));
  },

  async getStores(signal?: AbortSignal): Promise<Array<{ id?: number; code: string; name: string }>> {
    try {
      const response = await apiClient.get('/master/stores', { signal });
      return unwrap(response.data);
    } catch {
      return [];
    }
  },
};


