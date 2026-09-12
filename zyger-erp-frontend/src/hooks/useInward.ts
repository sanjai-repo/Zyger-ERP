import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inwardService } from '../services/inwardService';
import { masterService } from '../services/masterService';
import type {
  InwardChartMetric,
  InwardListParams,
} from '../types/inward.types';
import type { InwardType } from '../config/inwardConfig';

export function useInwardDashboard(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['inward', 'dashboard', fromDate, toDate],
    queryFn: ({ signal }) => inwardService.getDashboard(fromDate, toDate, signal),
    staleTime: 1000 * 30,
    retry: 1,
  });
}

export function useInwardChart(
  fromDate: string,
  toDate: string,
  metric: InwardChartMetric
) {
  return useQuery({
    queryKey: ['inward', 'chart', fromDate, toDate, metric],
    queryFn: ({ signal }) => inwardService.getChart(fromDate, toDate, metric, signal),
    staleTime: 1000 * 30,
    retry: 1,
  });
}

export function useInwardPending() {
  return useQuery({
    queryKey: ['inward', 'pending'],
    queryFn: ({ signal }) => inwardService.getPending(signal),
    staleTime: 1000 * 30,
    retry: 1,
  });
}

export function useInwardLog() {
  return useQuery({
    queryKey: ['inward', 'log'],
    queryFn: ({ signal }) => inwardService.getLog(signal),
    staleTime: 1000 * 30,
    retry: 1,
  });
}

export function useInwardNextNumber(inwardType: InwardType | null) {
  return useQuery({
    queryKey: ['inward', 'next-number', inwardType],
    queryFn: ({ signal }) =>
      inwardService.getNextNumber(inwardType as InwardType, signal),
    enabled: Boolean(inwardType),
    staleTime: 0,
    retry: 1,
  });
}

export function useInwardList(inwardType: InwardType, params: InwardListParams) {
  return useQuery({
    queryKey: ['inward', 'list', inwardType, params],
    queryFn: ({ signal }) => inwardService.getList(inwardType, params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useInwardDocument(
  inwardType: InwardType,
  id?: string | null
) {
  return useQuery({
    queryKey: ['inward', 'document', inwardType, id],
    queryFn: ({ signal }) => inwardService.getById(inwardType, id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

interface InwardMutationVariables {
  inwardType: InwardType;
  id?: string | null;
  payload?: any;
  action?: string;
  note?: string;
}

export function useInwardMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    return queryClient.invalidateQueries({ queryKey: ['inward'] });
  };

  const invalidateStock = () => {
    return queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] });
  };

  const createMutation = useMutation({
    mutationFn: ({ inwardType, payload }: InwardMutationVariables) =>
      inwardService.create(inwardType, payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ inwardType, id, payload }: InwardMutationVariables) =>
      inwardService.update(inwardType, id as string, payload),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: ({ inwardType, id }: InwardMutationVariables) =>
      inwardService.remove(inwardType, id as string),
    onSuccess: invalidate,
  });

  const actionMutation = useMutation({
    mutationFn: ({ inwardType, id, action, note }: InwardMutationVariables) =>
      inwardService.action(inwardType, id as string, action as string, note),
    onSuccess: () => {
      invalidate();
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

export function useInwardOptions() {
  const suppliers = useQuery({
    queryKey: ['master', 'suppliers'],
    queryFn: ({ signal }) => masterService.getSuppliers(signal),
    staleTime: 1000 * 60 * 5,
  });

  const customers = useQuery({
    queryKey: ['master', 'customers'],
    queryFn: ({ signal }) => masterService.getCustomers?.(signal) ?? Promise.resolve([]),
    staleTime: 1000 * 60 * 5,
  });

  const locations = useQuery({
    queryKey: ['inventory', 'locations'],
    queryFn: ({ signal }) => masterService.getLocations(signal),
    staleTime: 1000 * 60 * 5,
  });

  const purchaseOrders = useQuery({
    queryKey: ['purchase-orders', 'approved'],
    queryFn: ({ signal }) => masterService.getApprovedPurchaseOrders(signal),
    staleTime: 1000 * 60 * 5,
  });

  const jobOrders = useQuery({
    queryKey: ['job-orders'],
    queryFn: ({ signal }) => masterService.getJobOrders(signal),
    staleTime: 1000 * 60 * 5,
  });

  const labourOrders = useQuery({
    queryKey: ['labour-orders'],
    queryFn: ({ signal }) => masterService.getLabourOrders(signal),
    staleTime: 1000 * 60 * 5,
  });

  const items = useQuery({
    queryKey: ['master', 'items'],
    queryFn: ({ signal }) => masterService.getItems(signal),
    staleTime: 1000 * 60 * 5,
  });

  const uoms = useQuery({
    queryKey: ['master', 'uoms'],
    queryFn: ({ signal }) => masterService.getUoms(signal),
    staleTime: 1000 * 60 * 5,
  });

  const stores = useQuery({
    queryKey: ['master', 'stores'],
    queryFn: ({ signal }) => masterService.getStores(signal),
    staleTime: 1000 * 60 * 5,
  });

  return {
    suppliers: suppliers.data ?? [],
    customers: customers.data ?? [],
    locations: locations.data ?? [],
    purchaseOrders: purchaseOrders.data ?? [],
    jobOrders: jobOrders.data ?? [],
    labourOrders: labourOrders.data ?? [],
    items: items.data ?? [],
    uoms: uoms.data ?? [],
    stores: stores.data ?? [],
    isLoading:
      suppliers.isPending ||
      locations.isPending ||
      purchaseOrders.isPending ||
      jobOrders.isPending ||
      labourOrders.isPending ||
      items.isPending,
  };
}