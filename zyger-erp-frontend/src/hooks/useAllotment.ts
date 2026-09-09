import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  stockAllotmentService,
  stockReleaseService,
} from '../services/allotmentService';
import { masterService } from '../services/masterService';
import type {
  AllotmentDocumentAction,
  AllotmentListParams,
  ReleaseDocumentAction,
  StockAllotmentPayload,
  StockReleasePayload,
} from '../types/inventory/allotment.types';

/* ==================== STOCK ALLOTMENT HOOKS ==================== */

export function useStockAllotmentList(params: AllotmentListParams) {
  return useQuery({
    queryKey: ['stock-allotment', 'list', params],
    queryFn: ({ signal }) => stockAllotmentService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useStockAllotmentDocument(id?: string | null) {
  return useQuery({
    queryKey: ['stock-allotment', 'document', id],
    queryFn: ({ signal }) =>
      stockAllotmentService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useStockAllotmentNextNumber() {
  return useQuery({
    queryKey: ['stock-allotment', 'next-number'],
    queryFn: ({ signal }) => stockAllotmentService.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function useStockAllotmentLookups() {
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

  const customersQuery = useQuery({
    queryKey: ['master', 'customers'],
    queryFn: ({ signal }) => masterService.getCustomers(signal),
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
    customersQuery.isPending;

  const isError =
    itemsQuery.isError ||
    locationsQuery.isError ||
    customersQuery.isError;

  const firstError =
    itemsQuery.error || locationsQuery.error || customersQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load Stock Allotment master data.';

  const refetch = () =>
    Promise.all([
      itemsQuery.refetch(),
      locationsQuery.refetch(),
      customersQuery.refetch(),
      storesQuery.refetch(),
    ]);

  return {
    items: itemsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    stores: storesQuery.data ?? [],
    customers: customersQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface AllotmentUpdateVariables {
  id: string;
  payload: StockAllotmentPayload;
}

interface AllotmentActionVariables {
  id: string;
  action: AllotmentDocumentAction;
  note?: string;
}

export function useStockAllotmentMutations() {
  const queryClient = useQueryClient();

  const invalidateScreen = () =>
    queryClient.invalidateQueries({
      queryKey: ['stock-allotment'],
    });

  const invalidateStock = () =>
    queryClient.invalidateQueries({
      queryKey: ['inventory', 'stock'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: StockAllotmentPayload) =>
      stockAllotmentService.create(payload),
    onSuccess: invalidateScreen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: AllotmentUpdateVariables) =>
      stockAllotmentService.update(id, payload),
    onSuccess: invalidateScreen,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => stockAllotmentService.remove(id),
    onSuccess: invalidateScreen,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: AllotmentActionVariables) =>
      stockAllotmentService.action(id, action, note),
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

/* ==================== STOCK RELEASE HOOKS ==================== */

export function useStockReleaseList(params: AllotmentListParams) {
  return useQuery({
    queryKey: ['stock-release', 'list', params],
    queryFn: ({ signal }) => stockReleaseService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useStockReleaseDocument(id?: string | null) {
  return useQuery({
    queryKey: ['stock-release', 'document', id],
    queryFn: ({ signal }) =>
      stockReleaseService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useStockReleaseNextNumber() {
  return useQuery({
    queryKey: ['stock-release', 'next-number'],
    queryFn: ({ signal }) => stockReleaseService.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function useStockReleaseLookups() {
  const itemsQuery = useQuery({
    queryKey: ['master', 'items'],
    queryFn: ({ signal }) => masterService.getItems(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const approvedAllotmentsQuery = useQuery({
    queryKey: ['stock-allotment', 'approved-options'],
    queryFn: ({ signal }) =>
      stockAllotmentService.getApprovedAllotments(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isLoading =
    itemsQuery.isPending || approvedAllotmentsQuery.isPending;

  const isError =
    itemsQuery.isError || approvedAllotmentsQuery.isError;

  const firstError =
    itemsQuery.error || approvedAllotmentsQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load Stock Release master data.';

  const refetch = () =>
    Promise.all([itemsQuery.refetch(), approvedAllotmentsQuery.refetch()]);

  return {
    items: itemsQuery.data ?? [],
    approvedAllotments: approvedAllotmentsQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface ReleaseUpdateVariables {
  id: string;
  payload: StockReleasePayload;
}

interface ReleaseActionVariables {
  id: string;
  action: ReleaseDocumentAction;
  note?: string;
}

export function useStockReleaseMutations() {
  const queryClient = useQueryClient();

  const invalidateScreen = () =>
    queryClient.invalidateQueries({
      queryKey: ['stock-release'],
    });

  const invalidateStock = () =>
    queryClient.invalidateQueries({
      queryKey: ['inventory', 'stock'],
    });

  const invalidateAllotment = () =>
    queryClient.invalidateQueries({
      queryKey: ['stock-allotment'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: StockReleasePayload) =>
      stockReleaseService.create(payload),
    onSuccess: invalidateScreen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: ReleaseUpdateVariables) =>
      stockReleaseService.update(id, payload),
    onSuccess: invalidateScreen,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => stockReleaseService.remove(id),
    onSuccess: invalidateScreen,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: ReleaseActionVariables) =>
      stockReleaseService.action(id, action, note),
    onSuccess: () => {
      invalidateScreen();
      invalidateStock();
      invalidateAllotment();
    },
  });

  return {
    createMutation,
    updateMutation,
    removeMutation,
    actionMutation,
  };
}