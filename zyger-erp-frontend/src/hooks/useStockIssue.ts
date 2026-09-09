import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { stockIssueService } from '../services/stockIssueService';
import { masterService } from '../services/masterService';
import { stockIssueRequestService } from '../services/stockIssueRequestService';
import type {
  StockIssueDocumentAction,
  StockIssueListParams,
  StockIssuePayload,
  StockIssueTypeConfig,
} from '../types/inventory/stockIssue.types';

export function useStockIssueList(
  config: StockIssueTypeConfig,
  params: StockIssueListParams
) {
  return useQuery({
    queryKey: [config.screenId, 'list', params],
    queryFn: ({ signal }) =>
      stockIssueService.getList(config.apiPath, params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useStockIssueDocument(
  config: StockIssueTypeConfig,
  id?: string | null
) {
  return useQuery({
    queryKey: [config.screenId, 'document', id],
    queryFn: ({ signal }) =>
      stockIssueService.getById(config.apiPath, id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useStockIssueNextNumber(config: StockIssueTypeConfig) {
  return useQuery({
    queryKey: [config.screenId, 'next-number'],
    queryFn: ({ signal }) =>
      stockIssueService.getNextNumber(config.apiPath, signal),
    staleTime: 0,
    retry: 1,
  });
}

export function useApprovedIssueRequests() {
  return useQuery({
    queryKey: ['stock-issue-request', 'approved'],
    queryFn: ({ signal }) =>
      stockIssueRequestService.getApprovedRequests(signal),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useStockIssueLookups() {
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

  const departmentsQuery = useQuery({
    queryKey: ['master', 'departments'],
    queryFn: ({ signal }) => masterService.getDepartments(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const suppliersQuery = useQuery({
    queryKey: ['master', 'suppliers'],
    queryFn: ({ signal }) => masterService.getSuppliers(signal),
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
    departmentsQuery.isPending ||
    suppliersQuery.isPending ||
    jobOrdersQuery.isPending;

  const isError =
    itemsQuery.isError ||
    locationsQuery.isError ||
    departmentsQuery.isError ||
    suppliersQuery.isError ||
    jobOrdersQuery.isError;

  const firstError =
    itemsQuery.error ||
    locationsQuery.error ||
    departmentsQuery.error ||
    suppliersQuery.error ||
    jobOrdersQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load Stock Issue master data.';

  const refetch = () =>
    Promise.all([
      itemsQuery.refetch(),
      locationsQuery.refetch(),
      departmentsQuery.refetch(),
      suppliersQuery.refetch(),
      jobOrdersQuery.refetch(),
      storesQuery.refetch(),
    ]);

  return {
    items: itemsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    stores: storesQuery.data ?? [],
    departments: departmentsQuery.data ?? [],
    suppliers: suppliersQuery.data ?? [],
    jobOrders: jobOrdersQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface UpdateVariables {
  id: string;
  payload: StockIssuePayload;
}

interface ActionVariables {
  id: string;
  action: StockIssueDocumentAction;
  note?: string;
}

export function useStockIssueMutations(config: StockIssueTypeConfig) {
  const queryClient = useQueryClient();

  const invalidateScreen = () =>
    queryClient.invalidateQueries({
      queryKey: [config.screenId],
    });

  const invalidateStock = () =>
    queryClient.invalidateQueries({
      queryKey: ['inventory', 'stock'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: StockIssuePayload) =>
      stockIssueService.create(config.apiPath, payload),
    onSuccess: invalidateScreen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: UpdateVariables) =>
      stockIssueService.update(config.apiPath, id, payload),
    onSuccess: invalidateScreen,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => stockIssueService.remove(config.apiPath, id),
    onSuccess: invalidateScreen,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: ActionVariables) =>
      stockIssueService.action(config.apiPath, id, action, note),
    onSuccess: () => {
      invalidateScreen();
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