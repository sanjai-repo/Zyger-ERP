import apiClient from '../api/axiosClient';
import type { PageDto } from '../types/api.types';

export const planningApi = {
  async listDocs(docType: string, params: { page?: number; size?: number; sort?: string; search?: string; status?: string; type?: string }): Promise<PageDto<Record<string, unknown>>> {
    const response = await apiClient.get<PageDto<Record<string, unknown>>>(`/v1/planning/${docType}`, { params });
    return response.data;
  },

  async getDoc(docType: string, id: number | string): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(`/v1/planning/${docType}/${id}`);
    return response.data;
  },

  async createDoc(docType: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`/v1/planning/${docType}`, payload);
    return response.data;
  },

  async updateDoc(docType: string, id: number | string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await apiClient.put<Record<string, unknown>>(`/v1/planning/${docType}/${id}`, payload);
    return response.data;
  },

  async deleteDoc(docType: string, id: number | string): Promise<void> {
    await apiClient.delete(`/v1/planning/${docType}/${id}`);
  },

  async nextDocNumber(docType: string): Promise<{ nextNumber: string }> {
    const response = await apiClient.get<{ nextNumber: string }>(`/v1/planning/${docType}/next-number`);
    return response.data;
  },

  async docAction(docType: string, id: number | string, action: string, note?: string): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`/v1/planning/${docType}/${id}/actions/${action}`, { note: note ?? '' });
    return response.data;
  },

  async dashboard(): Promise<Record<string, number>> {
    const response = await apiClient.get<Record<string, number>>('/v1/planning/dashboard');
    return response.data;
  },

  getWorkCenters: () => apiClient.get('/master/work-centers').then(r => r.data),
  getMachines: () => apiClient.get('/master/machines').then(r => r.data),
  getOperations: () => apiClient.get('/master/operations').then(r => r.data),
  getShifts: () => apiClient.get('/master/shifts').then(r => r.data),
  getItems: (params?: Record<string, string>) => apiClient.get('/master/items', { params }).then(r => r.data),

  // Master Module
  getUoms: () => apiClient.get('/master/uoms').then(r => r.data),
  getItemGroups: () => apiClient.get('/master/item-groups').then(r => r.data),
  getStores: () => apiClient.get('/master/stores').then(r => r.data),
  getProcessGroups: () => apiClient.get('/master/process-groups').then(r => r.data),
  getProcesses: () => apiClient.get('/master/processes').then(r => r.data),
  getInstruments: () => apiClient.get('/master/instruments').then(r => r.data),
  getTools: () => apiClient.get('/master/tools').then(r => r.data),
  getCompanyInfo: () => apiClient.get('/master/company-info').then(r => r.data),
  updateCompanyInfo: (data: Record<string, unknown>) => apiClient.put('/master/company-info', data).then(r => r.data),
  getMasterDashboard: () => apiClient.get('/master/dashboard').then(r => r.data),

  // Route Sheet Reports (FRD §7)
  getResourceUtilizationReport: (params?: Record<string, string>) => apiClient.get('/v1/planning/route-sheet/reports/resource-utilization', { params }).then(r => r.data),
  getOutsourceProcessReport: (params?: Record<string, string>) => apiClient.get('/v1/planning/route-sheet/reports/outsource-processes', { params }).then(r => r.data),
};
