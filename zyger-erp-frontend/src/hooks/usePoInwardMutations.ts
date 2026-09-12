import { useMutation, useQueryClient } from '@tanstack/react-query';
import { poInwardService } from '../services/poInwardService';
import type {
  DocumentAction,
  PoInwardPayload,
} from '../types/inventory/poInward.types';

interface UpdateVariables {
  id: string;
  payload: PoInwardPayload;
}

interface ActionVariables {
  id: string;
  action: DocumentAction;
  note?: string;
}

export function usePoInwardMutations() {
  const queryClient = useQueryClient();

  const invalidatePoInward = () => {
    return queryClient.invalidateQueries({
      queryKey: ['po-inward'],
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: PoInwardPayload) => poInwardService.create(payload),
    onSuccess: invalidatePoInward,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: UpdateVariables) =>
      poInwardService.update(id, payload),
    onSuccess: invalidatePoInward,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => poInwardService.remove(id),
    onSuccess: invalidatePoInward,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: ActionVariables) =>
      poInwardService.action(id, action, note),
    onSuccess: invalidatePoInward,
  });

  return {
    createMutation,
    updateMutation,
    removeMutation,
    actionMutation,
  };
}