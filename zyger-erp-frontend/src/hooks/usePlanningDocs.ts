import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { planningApi } from '../services/planning-api';

export interface PlanningDocListParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  status?: string;
  type?: string;
}

export function usePlanningDocList(docType: string, params: PlanningDocListParams) {
  return useQuery({
    queryKey: ['planning-doc', docType, 'list', params],
    queryFn: () => planningApi.listDocs(docType, params),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function usePlanningDoc(docType: string, id?: number | string | null) {
  return useQuery({
    queryKey: ['planning-doc', docType, 'doc', id],
    queryFn: () => planningApi.getDoc(docType, id as number | string),
    enabled: Boolean(id),
    staleTime: 0,
    retry: 1,
  });
}

export function usePlanningDocNextNumber(docType: string) {
  return useQuery({
    queryKey: ['planning-doc', docType, 'next-number'],
    queryFn: () => planningApi.nextDocNumber(docType),
    staleTime: 0,
    retry: 1,
  });
}

export function usePlanningDocCreate(docType: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => planningApi.createDoc(docType, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planning-doc', docType] }),
  });
}

export function usePlanningDocUpdate(docType: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Record<string, unknown> }) =>
      planningApi.updateDoc(docType, id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planning-doc', docType] }),
  });
}

export function usePlanningDocDelete(docType: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => planningApi.deleteDoc(docType, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planning-doc', docType] }),
  });
}

export function usePlanningDocAction(docType: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number | string; action: string; note?: string }) =>
      planningApi.docAction(docType, id, action, note),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['planning-doc', docType] });
      qc.invalidateQueries({ queryKey: ['planning-doc', docType, 'doc', variables.id] });
      qc.invalidateQueries({ queryKey: ['planning-dashboard'] });
    },
  });
}

export function usePlanningDashboard() {
  return useQuery({
    queryKey: ['planning-dashboard'],
    queryFn: () => planningApi.dashboard(),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useWorkCenters() {
  return useQuery({ queryKey: ['master', 'work-centers'], queryFn: () => planningApi.getWorkCenters() });
}
export function useMachines() {
  return useQuery({ queryKey: ['master', 'machines'], queryFn: () => planningApi.getMachines() });
}
export function useOperations() {
  return useQuery({ queryKey: ['master', 'operations'], queryFn: () => planningApi.getOperations() });
}
export function useShifts() {
  return useQuery({ queryKey: ['master', 'shifts'], queryFn: () => planningApi.getShifts() });
}
export function useItems() {
  return useQuery({ queryKey: ['master', 'items'], queryFn: () => planningApi.getItems() });
}
