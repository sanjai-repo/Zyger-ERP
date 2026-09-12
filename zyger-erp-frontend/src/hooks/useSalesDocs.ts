import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../services/sales-api';
import type { QualityDocAction } from '../types/quality/quality.types';

export interface SalesDocListParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  status?: string;
  type?: string;
}

export function useSalesDocList(docType: string, params: SalesDocListParams) {
  return useQuery({
    queryKey: ['sales-doc', docType, 'list', params],
    queryFn: () => salesApi.listDocs(docType, params),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useSalesDoc(docType: string, id?: number | string | null) {
  return useQuery({
    queryKey: ['sales-doc', docType, 'doc', id],
    queryFn: () => salesApi.getDoc(docType, id as number | string),
    enabled: Boolean(id),
    staleTime: 0,
    retry: 1,
  });
}

export function useSalesDocNextNumber(docType: string) {
  return useQuery({
    queryKey: ['sales-doc', docType, 'next-number'],
    queryFn: () => salesApi.nextDocNumber(docType),
    staleTime: 0,
    retry: 1,
  });
}

export function useSalesDocCreate(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => salesApi.createDoc(docType, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-doc', docType] }),
  });
}

export function useSalesDocUpdate(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Record<string, unknown> }) =>
      salesApi.updateDoc(docType, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-doc', docType] }),
  });
}

export function useSalesDocDelete(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => salesApi.deleteDoc(docType, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-doc', docType] }),
  });
}

export function useSalesDocAction(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number | string; action: QualityDocAction; note?: string }) =>
      salesApi.docAction(docType, id, action, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-doc', docType] });
      queryClient.invalidateQueries({ queryKey: ['sales-doc', docType, 'doc', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
    },
  });
}

export function useSalesDashboard() {
  return useQuery({
    queryKey: ['sales-dashboard'],
    queryFn: () => salesApi.dashboard(),
    staleTime: 30000,
    retry: 1,
  });
}
