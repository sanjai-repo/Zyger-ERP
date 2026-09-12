import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qualityApi } from '../services/quality-api';
import type { QualityDocAction } from '../types/quality/quality.types';

export interface DocListParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  status?: string;
  type?: string;
}

export function useQualityDocList(docType: string, params: DocListParams) {
  return useQuery({
    queryKey: ['quality-doc', docType, 'list', params],
    queryFn: () => qualityApi.listDocs(docType, params),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useQualityDoc(docType: string, id?: number | string | null) {
  return useQuery({
    queryKey: ['quality-doc', docType, 'doc', id],
    queryFn: () => qualityApi.getDoc(docType, id as number | string),
    enabled: Boolean(id),
    staleTime: 0,
    retry: 1,
  });
}

export function useQualityDocNextNumber(docType: string) {
  return useQuery({
    queryKey: ['quality-doc', docType, 'next-number'],
    queryFn: () => qualityApi.nextDocNumber(docType),
    staleTime: 0,
    retry: 1,
  });
}

export function useQualityDocCreate(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => qualityApi.createDoc(docType, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality-doc', docType] }),
  });
}

export function useQualityDocUpdate(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Record<string, unknown> }) =>
      qualityApi.updateDoc(docType, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality-doc', docType] }),
  });
}

export function useQualityDocDelete(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => qualityApi.deleteDoc(docType, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quality-doc', docType] }),
  });
}

export function useQualityDocAction(docType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number | string; action: QualityDocAction; note?: string }) =>
      qualityApi.docAction(docType, id, action, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quality-doc', docType] });
      queryClient.invalidateQueries({ queryKey: ['quality-doc', docType, 'doc', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['quality-dashboard'] });
    },
  });
}

export function useQualityDashboard() {
  return useQuery({
    queryKey: ['quality-dashboard'],
    queryFn: () => qualityApi.dashboard(),
    staleTime: 30000,
    retry: 1,
  });
}

export function useCalibrationStats() {
  return useQuery({
    queryKey: ['quality', 'calibration', 'stats'],
    queryFn: () => qualityApi.calibrationStats(),
    staleTime: 30000,
    retry: 1,
  });
}

export function useCalibrationInstruments(status?: string) {
  return useQuery({
    queryKey: ['quality', 'calibration', 'instruments', status ?? ''],
    queryFn: () => qualityApi.getInstruments(status),
    staleTime: 0,
    retry: 1,
  });
}

export function useCalibrationInstrumentSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => qualityApi.saveInstrument(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality', 'calibration'] });
      queryClient.invalidateQueries({ queryKey: ['quality-dashboard'] });
    },
  });
}

export function useCalibrationInstrumentRetire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason?: string }) =>
      qualityApi.retireInstrument(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality', 'calibration'] });
      queryClient.invalidateQueries({ queryKey: ['quality-dashboard'] });
    },
  });
}
