import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { poInwardService } from '../services/poInwardService';
import type { PoInwardListParams } from '../types/inventory/poInward.types';

export function usePoInwardList(params: PoInwardListParams) {
  return useQuery({
    queryKey: ['po-inward', 'list', params],
    queryFn: ({ signal }) => poInwardService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}