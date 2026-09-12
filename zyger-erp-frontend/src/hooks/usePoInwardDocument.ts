import { useQuery } from '@tanstack/react-query';
import { poInwardService } from '../services/poInwardService';

export function usePoInwardDocument(id?: string | null) {
  return useQuery({
    queryKey: ['po-inward', 'document', id],
    queryFn: ({ signal }) => poInwardService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}