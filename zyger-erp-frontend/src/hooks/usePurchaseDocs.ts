import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseApi } from '../services/purchase-api';
import type { QualityDocAction } from '../types/quality/quality.types';

export interface PurchaseDocListParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  status?: string;
  type?: string;
}

export function usePurchaseDocList(docType: string, params: PurchaseDocListParams) {
  return useQuery({
    queryKey: ['purchase-doc', docType, 'list', params],
    queryFn: () => purchaseApi.listDocs(docType, params),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function usePurchaseDoc(docType: string, id?: number | string | null) {
  return useQuery({
    queryKey: ['purchase-doc', docType, 'doc', id],
    queryFn: () => purchaseApi.getDoc(docType, id as number | string),
    enabled: Boolean(id),
    staleTime: 0,
    retry: 1,
  });
}

export function usePurchaseDocNextNumber(docType: string) {
  return useQuery({
    queryKey: ['purchase-doc', docType, 'next-number'],
    queryFn: () => purchaseApi.nextDocNumber(docType),
    staleTime: 0,
    retry: 1,
  });
}

export function usePurchaseDocCreate(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => purchaseApi.createDoc(docType, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-doc', docType] }),
  });
}

export function usePurchaseDocUpdate(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Record<string, unknown> }) =>
      purchaseApi.updateDoc(docType, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-doc', docType] }),
  });
}

export function usePurchaseDocDelete(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => purchaseApi.deleteDoc(docType, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-doc', docType] }),
  });
}

export function usePurchaseDocAction(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number | string; action: QualityDocAction; note?: string }) =>
      purchaseApi.docAction(docType, id, action, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-doc', docType] });
      queryClient.invalidateQueries({ queryKey: ['purchase-doc', docType, 'doc', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-dashboard'] });
    },
  });
}

export function usePurchaseDashboard() {
  return useQuery({
    queryKey: ['purchase-dashboard'],
    queryFn: () => purchaseApi.dashboard(),
    staleTime: 30000,
    retry: 1,
  });
}

function useSendMutation(docType: string, sender: (id: number | string) => Promise<Record<string, unknown>>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => sender(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-doc', docType] });
      queryClient.invalidateQueries({ queryKey: ['purchase-doc', docType, 'doc', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-dashboard'] });
    },
  });
}

export function useSendEnquiryEmail() {
  return useSendMutation('supplier-enquiry', purchaseApi.sendEnquiryEmail);
}

export function useSendPoEmail() {
  return useSendMutation('purchase-order', purchaseApi.sendPoEmail);
}

export function useSendJoEmail() {
  return useSendMutation('job-order', purchaseApi.sendJoEmail);
}
