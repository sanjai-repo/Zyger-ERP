import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  stockIssueRequestService,
  type SirApprovedLine,
} from '../services/stockIssueRequestService';
import { masterService } from '../services/masterService';
import type {
  SirDocumentAction,
  SirListParams,
  SirPayload,
} from '../types/inventory/stockIssueRequest.types';

export function useSirList(params: SirListParams) {
  return useQuery({
    queryKey: ['stock-issue-request', 'list', params],
    queryFn: ({ signal }) => stockIssueRequestService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useSirDocument(id?: string | null) {
  return useQuery({
    queryKey: ['stock-issue-request', 'document', id],
    queryFn: ({ signal }) => stockIssueRequestService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useSirNextNumber() {
  return useQuery({
    queryKey: ['stock-issue-request', 'next-number'],
    queryFn: ({ signal }) => stockIssueRequestService.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function useSirLookups() {
  const itemsQuery = useQuery({
    queryKey: ['master', 'items'],
    queryFn: ({ signal }) => masterService.getItems(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const departmentsQuery = useQuery({
    queryKey: ['master', 'departments'],
    queryFn: ({ signal }) => masterService.getDepartments(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const jobOrdersQuery = useQuery({
    queryKey: ['job-orders'],
    queryFn: ({ signal }) => masterService.getJobOrders(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isLoading =
    itemsQuery.isPending ||
    departmentsQuery.isPending ||
    jobOrdersQuery.isPending;

  const isError =
    itemsQuery.isError ||
    departmentsQuery.isError ||
    jobOrdersQuery.isError;

  const firstError =
    itemsQuery.error || departmentsQuery.error || jobOrdersQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load Stock Issue Request master data.';

  const refetch = () =>
    Promise.all([
      itemsQuery.refetch(),
      departmentsQuery.refetch(),
      jobOrdersQuery.refetch(),
    ]);

  return {
    items: itemsQuery.data ?? [],
    departments: departmentsQuery.data ?? [],
    jobOrders: jobOrdersQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface UpdateVariables {
  id: string;
  payload: SirPayload;
}

interface ActionVariables {
  id: string;
  action: SirDocumentAction;
  note?: string;
}

interface ApproveVariables {
  id: string;
  note: string;
  lines: SirApprovedLine[];
}

export function useSirMutations() {
  const queryClient = useQueryClient();

  const invalidateSir = () =>
    queryClient.invalidateQueries({
      queryKey: ['stock-issue-request'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: SirPayload) =>
      stockIssueRequestService.create(payload),
    onSuccess: invalidateSir,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: UpdateVariables) =>
      stockIssueRequestService.update(id, payload),
    onSuccess: invalidateSir,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => stockIssueRequestService.remove(id),
    onSuccess: invalidateSir,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: ActionVariables) =>
      stockIssueRequestService.action(id, action, note),
    onSuccess: invalidateSir,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note, lines }: ApproveVariables) =>
      stockIssueRequestService.approve(id, note, lines),
    onSuccess: invalidateSir,
  });

  return {
    createMutation,
    updateMutation,
    removeMutation,
    actionMutation,
    approveMutation,
  };
}