import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qualityApi } from '../services/quality-api';
import type { NcrCreatePayload } from '../types/quality/quality.types';

export function useQualityNcrList(params: { page: number; size: number; sort?: string; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['quality', 'ncrs', params],
    queryFn: () => qualityApi.getNcrs(params),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useQualityNcr(id?: number | string | null) {
  return useQuery({
    queryKey: ['quality', 'ncr', id],
    queryFn: () => qualityApi.getNcr(id as number | string),
    enabled: Boolean(id),
    staleTime: 0,
    retry: 1,
  });
}

export function useQualityNcrCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NcrCreatePayload) => qualityApi.createNcr(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality', 'ncrs'] });
    },
  });
}

export function useQualityNcrUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: NcrCreatePayload }) =>
      qualityApi.updateNcr(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality', 'ncrs'] });
    },
  });
}

export function useQualityNcrDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => qualityApi.deleteNcr(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality', 'ncrs'] });
    },
  });
}

export function useQualityNextNcrNumber() {
  return useQuery({
    queryKey: ['quality', 'ncr', 'next-number'],
    queryFn: () => qualityApi.getNextNcrNumber(),
    staleTime: 0,
    retry: 1,
  });
}
