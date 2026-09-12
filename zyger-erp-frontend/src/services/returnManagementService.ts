import apiClient from '../api/axiosClient';
import { printDocument as printDoc } from '../utils/printDocument';
import type { PageDto } from '../types/api.types';
import type {
  ReturnManagementDocumentAction,
  ReturnManagementDto,
  ReturnManagementListParams,
  ReturnManagementListRowDto,
  ReturnManagementPayload,
} from '../types/inventory/returnManagement.types';

export type ReturnManagementExportFormat = 'xlsx' | 'pdf';

export function createReturnManagementService(apiPath: string) {
  return {
    async getList(
      params: ReturnManagementListParams,
      signal?: AbortSignal
    ): Promise<PageDto<ReturnManagementListRowDto>> {
      const response = await apiClient.get<
        PageDto<ReturnManagementListRowDto>
      >(apiPath, {
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
    ): Promise<ReturnManagementDto> {
      const response = await apiClient.get<ReturnManagementDto>(
        `${apiPath}/${id}`,
        { signal }
      );

      return response.data;
    },

    async create(
      payload: ReturnManagementPayload
    ): Promise<ReturnManagementDto> {
      const response = await apiClient.post<ReturnManagementDto>(
        apiPath,
        payload
      );

      return response.data;
    },

    async update(
      id: string,
      payload: ReturnManagementPayload
    ): Promise<ReturnManagementDto> {
      const response = await apiClient.put<ReturnManagementDto>(
        `${apiPath}/${id}`,
        payload
      );

      return response.data;
    },

    async remove(id: string): Promise<void> {
      await apiClient.delete(`${apiPath}/${id}`);
    },

    async action(
      id: string,
      action: ReturnManagementDocumentAction,
      note?: string
    ): Promise<ReturnManagementDto> {
      const response = await apiClient.post<ReturnManagementDto>(
        `${apiPath}/${id}/actions/${action}`,
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
      }>(`${apiPath}/next-number`, { signal });

      return response.data;
    },

    async exportFile(
      fileTitle: string,
      params: Omit<ReturnManagementListParams, 'page' | 'size'>,
      format: ReturnManagementExportFormat
    ): Promise<void> {
      const response = await apiClient.get(`${apiPath}/export`, {
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

    printDocument(id: number | string, mode: 'print' | 'download' = 'print') {
      const base = import.meta.env.VITE_API_BASE_URL || '/api';
      printDoc(`${base}${apiPath}/${id}/print?download=${mode === 'download'}`, mode);
    },
  };
}