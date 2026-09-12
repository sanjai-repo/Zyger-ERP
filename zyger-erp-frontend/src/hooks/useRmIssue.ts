import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { rmIssueService } from '../services/rmIssueService';
import { masterService } from '../services/masterService';
import { stockIssueRequestService } from '../services/stockIssueRequestService';
import type {
  RmiDocumentAction,
  RmiListParams,
  RmiPayload,
} from '../types/inventory/rmIssue.types';

export function useRmIssueList(params: RmiListParams) {
  return useQuery({
    queryKey: ['rm-issue', 'list', params],
    queryFn: ({ signal }) => rmIssueService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useRmIssueDocument(id?: string | null) {
  return useQuery({
    queryKey: ['rm-issue', 'document', id],
    queryFn: ({ signal }) => rmIssueService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useRmIssueNextNumber() {
  return useQuery({
    queryKey: ['rm-issue', 'next-number'],
    queryFn: ({ signal }) => rmIssueService.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function useRmIssueLookups() {
  const itemsQuery = useQuery({
    queryKey: ['master', 'items'],
    queryFn: ({ signal }) => masterService.getItems(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const locationsQuery = useQuery({
    queryKey: ['inventory', 'locations'],
    queryFn: ({ signal }) => masterService.getLocations(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const jobOrdersQuery = useQuery({
    queryKey: ['job-orders'],
    queryFn: ({ signal }) => masterService.getJobOrders(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const storesQuery = useQuery({
    queryKey: ['master', 'stores'],
    queryFn: ({ signal }) => masterService.getStores(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isLoading =
    itemsQuery.isPending ||
    locationsQuery.isPending ||
    jobOrdersQuery.isPending;

  const isError =
    itemsQuery.isError ||
    locationsQuery.isError ||
    jobOrdersQuery.isError;

  const firstError =
    itemsQuery.error || locationsQuery.error || jobOrdersQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load RM Issue master data.';

  const refetch = () =>
    Promise.all([
      itemsQuery.refetch(),
      locationsQuery.refetch(),
      jobOrdersQuery.refetch(),
      storesQuery.refetch(),
    ]);

  return {
    items: itemsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    stores: storesQuery.data ?? [],
    jobOrders: jobOrdersQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

export function useApprovedIssueRequests() {
  return useQuery({
    queryKey: ['stock-issue-request', 'approved-requests'],
    queryFn: ({ signal }) =>
      stockIssueRequestService.getApprovedRequests(signal),
    staleTime: 0,
    retry: 1,
  });
}

interface UpdateVariables {
  id: string;
  payload: RmiPayload;
}

interface ActionVariables {
  id: string;
  action: RmiDocumentAction;
  note?: string;
}

export function useRmIssueMutations() {
  const queryClient = useQueryClient();

  const invalidateRmIssue = () => {
    return queryClient.invalidateQueries({
      queryKey: ['rm-issue'],
    });
  };

  const invalidateStock = () => {
    return queryClient.invalidateQueries({
      queryKey: ['inventory', 'stock'],
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: RmiPayload) => rmIssueService.create(payload),
    onSuccess: invalidateRmIssue,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: UpdateVariables) =>
      rmIssueService.update(id, payload),
    onSuccess: invalidateRmIssue,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => rmIssueService.remove(id),
    onSuccess: invalidateRmIssue,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: ActionVariables) =>
      rmIssueService.action(id, action, note),
    onSuccess: () => {
      invalidateRmIssue();
      invalidateStock();
    },
  });

  return {
    createMutation,
    updateMutation,
    removeMutation,
    actionMutation,
  };
}