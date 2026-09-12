import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  physicalStockAmendmentService,
  stockAmendmentService,
} from '../services/adjustmentService';
import { masterService } from '../services/masterService';
import type {
  AdjustmentDocumentAction,
  AdjustmentListParams,
  PhysicalStockAmendmentPayload,
  StockAmendmentPayload,
} from '../types/inventory/adjustment.types';

/* ==================== STOCK AMENDMENT HOOKS ==================== */

export function useStockAmendmentList(params: AdjustmentListParams) {
  return useQuery({
    queryKey: ['stock-amendment', 'list', params],
    queryFn: ({ signal }) => stockAmendmentService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useStockAmendmentDocument(id?: string | null) {
  return useQuery({
    queryKey: ['stock-amendment', 'document', id],
    queryFn: ({ signal }) =>
      stockAmendmentService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useStockAmendmentNextNumber() {
  return useQuery({
    queryKey: ['stock-amendment', 'next-number'],
    queryFn: ({ signal }) => stockAmendmentService.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function useStockAmendmentLookups() {
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

  const storesQuery = useQuery({
    queryKey: ['master', 'stores'],
    queryFn: ({ signal }) => masterService.getStores(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isLoading = itemsQuery.isPending || locationsQuery.isPending;

  const isError = itemsQuery.isError || locationsQuery.isError;

  const firstError = itemsQuery.error || locationsQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load Stock Amendment master data.';

  const refetch = () =>
    Promise.all([itemsQuery.refetch(), locationsQuery.refetch(), storesQuery.refetch()]);

  return {
    items: itemsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    stores: storesQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface AmendmentUpdateVariables {
  id: string;
  payload: StockAmendmentPayload;
}

interface AmendmentActionVariables {
  id: string;
  action: AdjustmentDocumentAction;
  note?: string;
}

export function useStockAmendmentMutations() {
  const queryClient = useQueryClient();

  const invalidateScreen = () =>
    queryClient.invalidateQueries({
      queryKey: ['stock-amendment'],
    });

  const invalidateStock = () =>
    queryClient.invalidateQueries({
      queryKey: ['inventory', 'stock'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: StockAmendmentPayload) =>
      stockAmendmentService.create(payload),
    onSuccess: invalidateScreen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: AmendmentUpdateVariables) =>
      stockAmendmentService.update(id, payload),
    onSuccess: invalidateScreen,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => stockAmendmentService.remove(id),
    onSuccess: invalidateScreen,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: AmendmentActionVariables) =>
      stockAmendmentService.action(id, action, note),
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

/* ==================== PHYSICAL STOCK AMENDMENT HOOKS ==================== */

export function usePhysicalStockAmendmentList(params: AdjustmentListParams) {
  return useQuery({
    queryKey: ['physical-stock-amendment', 'list', params],
    queryFn: ({ signal }) =>
      physicalStockAmendmentService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function usePhysicalStockAmendmentDocument(id?: string | null) {
  return useQuery({
    queryKey: ['physical-stock-amendment', 'document', id],
    queryFn: ({ signal }) =>
      physicalStockAmendmentService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function usePhysicalStockAmendmentNextNumber() {
  return useQuery({
    queryKey: ['physical-stock-amendment', 'next-number'],
    queryFn: ({ signal }) =>
      physicalStockAmendmentService.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function usePhysicalStockAmendmentLookups() {
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

  const storesQuery = useQuery({
    queryKey: ['master', 'stores'],
    queryFn: ({ signal }) => masterService.getStores(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isLoading = itemsQuery.isPending || locationsQuery.isPending;

  const isError = itemsQuery.isError || locationsQuery.isError;

  const firstError = itemsQuery.error || locationsQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load Physical Stock Amendment master data.';

  const refetch = () =>
    Promise.all([itemsQuery.refetch(), locationsQuery.refetch(), storesQuery.refetch()]);

  return {
    items: itemsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    stores: storesQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface PhysicalUpdateVariables {
  id: string;
  payload: PhysicalStockAmendmentPayload;
}

interface PhysicalActionVariables {
  id: string;
  action: AdjustmentDocumentAction;
  note?: string;
}

export function usePhysicalStockAmendmentMutations() {
  const queryClient = useQueryClient();

  const invalidateScreen = () =>
    queryClient.invalidateQueries({
      queryKey: ['physical-stock-amendment'],
    });

  const invalidateStock = () =>
    queryClient.invalidateQueries({
      queryKey: ['inventory', 'stock'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: PhysicalStockAmendmentPayload) =>
      physicalStockAmendmentService.create(payload),
    onSuccess: invalidateScreen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: PhysicalUpdateVariables) =>
      physicalStockAmendmentService.update(id, payload),
    onSuccess: invalidateScreen,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => physicalStockAmendmentService.remove(id),
    onSuccess: invalidateScreen,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: PhysicalActionVariables) =>
      physicalStockAmendmentService.action(id, action, note),
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