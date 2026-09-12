import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  purchaseInvoiceService,
  subcontractInvoiceService,
} from '../services/supplierInvoiceService';
import { masterService } from '../services/masterService';
import type {
  PurchaseInvoicePayload,
  SubcontractInvoicePayload,
  SupplierInvoiceDocumentAction,
  SupplierInvoiceListParams,
} from '../types/inventory/supplierInvoice.types';

/* ==================== PURCHASE INVOICE ==================== */

export function usePurchaseInvoiceList(params: SupplierInvoiceListParams) {
  return useQuery({
    queryKey: ['purchase-invoice', 'list', params],
    queryFn: ({ signal }) => purchaseInvoiceService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function usePurchaseInvoiceDocument(id?: string | null) {
  return useQuery({
    queryKey: ['purchase-invoice', 'document', id],
    queryFn: ({ signal }) => purchaseInvoiceService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function usePurchaseInvoiceNextNumber() {
  return useQuery({
    queryKey: ['purchase-invoice', 'next-number'],
    queryFn: ({ signal }) => purchaseInvoiceService.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function usePurchaseInvoiceLookups() {
  const suppliersQuery = useQuery({
    queryKey: ['master', 'suppliers'],
    queryFn: ({ signal }) => masterService.getSuppliers(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders', 'approved'],
    queryFn: ({ signal }) => masterService.getApprovedPurchaseOrders(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isLoading = suppliersQuery.isPending || purchaseOrdersQuery.isPending;

  const isError = suppliersQuery.isError || purchaseOrdersQuery.isError;

  const firstError = suppliersQuery.error || purchaseOrdersQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load Purchase Invoice master data.';

  const refetch = () =>
    Promise.all([suppliersQuery.refetch(), purchaseOrdersQuery.refetch()]);

  return {
    suppliers: suppliersQuery.data ?? [],
    purchaseOrders: purchaseOrdersQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface PurchaseInvoiceUpdateVariables {
  id: string;
  payload: PurchaseInvoicePayload;
}

interface PurchaseInvoiceActionVariables {
  id: string;
  action: SupplierInvoiceDocumentAction;
  note?: string;
}

export function usePurchaseInvoiceMutations() {
  const queryClient = useQueryClient();

  const invalidateScreen = () =>
    queryClient.invalidateQueries({
      queryKey: ['purchase-invoice'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: PurchaseInvoicePayload) =>
      purchaseInvoiceService.create(payload),
    onSuccess: invalidateScreen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: PurchaseInvoiceUpdateVariables) =>
      purchaseInvoiceService.update(id, payload),
    onSuccess: invalidateScreen,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => purchaseInvoiceService.remove(id),
    onSuccess: invalidateScreen,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: PurchaseInvoiceActionVariables) =>
      purchaseInvoiceService.action(id, action, note),
    onSuccess: invalidateScreen,
  });

  return {
    createMutation,
    updateMutation,
    removeMutation,
    actionMutation,
  };
}

/* ==================== SUBCONTRACT INVOICE ==================== */

export function useSubcontractInvoiceList(params: SupplierInvoiceListParams) {
  return useQuery({
    queryKey: ['subcontract-invoice', 'list', params],
    queryFn: ({ signal }) => subcontractInvoiceService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useSubcontractInvoiceDocument(id?: string | null) {
  return useQuery({
    queryKey: ['subcontract-invoice', 'document', id],
    queryFn: ({ signal }) =>
      subcontractInvoiceService.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useSubcontractInvoiceNextNumber() {
  return useQuery({
    queryKey: ['subcontract-invoice', 'next-number'],
    queryFn: ({ signal }) => subcontractInvoiceService.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function useSubcontractInvoiceLookups() {
  const itemsQuery = useQuery({
    queryKey: ['master', 'items'],
    queryFn: ({ signal }) => masterService.getItems(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const suppliersQuery = useQuery({
    queryKey: ['master', 'suppliers'],
    queryFn: ({ signal }) => masterService.getSuppliers(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const labourOrdersQuery = useQuery({
    queryKey: ['labour-orders'],
    queryFn: ({ signal }) => masterService.getLabourOrders(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isLoading =
    itemsQuery.isPending ||
    suppliersQuery.isPending ||
    labourOrdersQuery.isPending;

  const isError =
    itemsQuery.isError || suppliersQuery.isError || labourOrdersQuery.isError;

  const firstError =
    itemsQuery.error || suppliersQuery.error || labourOrdersQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load Sub-Contract Invoice master data.';

  const refetch = () =>
    Promise.all([
      itemsQuery.refetch(),
      suppliersQuery.refetch(),
      labourOrdersQuery.refetch(),
    ]);

  return {
    items: itemsQuery.data ?? [],
    suppliers: suppliersQuery.data ?? [],
    labourOrders: labourOrdersQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface SubcontractInvoiceUpdateVariables {
  id: string;
  payload: SubcontractInvoicePayload;
}

interface SubcontractInvoiceActionVariables {
  id: string;
  action: SupplierInvoiceDocumentAction;
  note?: string;
}

export function useSubcontractInvoiceMutations() {
  const queryClient = useQueryClient();

  const invalidateScreen = () =>
    queryClient.invalidateQueries({
      queryKey: ['subcontract-invoice'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: SubcontractInvoicePayload) =>
      subcontractInvoiceService.create(payload),
    onSuccess: invalidateScreen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: SubcontractInvoiceUpdateVariables) =>
      subcontractInvoiceService.update(id, payload),
    onSuccess: invalidateScreen,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => subcontractInvoiceService.remove(id),
    onSuccess: invalidateScreen,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: SubcontractInvoiceActionVariables) =>
      subcontractInvoiceService.action(id, action, note),
    onSuccess: invalidateScreen,
  });

  return {
    createMutation,
    updateMutation,
    removeMutation,
    actionMutation,
  };
}