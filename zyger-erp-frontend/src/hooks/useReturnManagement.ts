import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { masterService } from '../services/masterService';
import type {
  ReturnManagementDocumentAction,
  ReturnManagementListParams,
  ReturnManagementPayload,
  ReturnManagementTypeConfig,
} from '../types/inventory/returnManagement.types';
import { createReturnManagementService } from '../services/returnManagementService';

export function useReturnManagementList(
  config: ReturnManagementTypeConfig,
  params: ReturnManagementListParams
) {
  const service = createReturnManagementService(config.apiPath);

  return useQuery({
    queryKey: [config.screenId, 'list', params],
    queryFn: ({ signal }) => service.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useReturnManagementDocument(
  config: ReturnManagementTypeConfig,
  id?: string | null
) {
  const service = createReturnManagementService(config.apiPath);

  return useQuery({
    queryKey: [config.screenId, 'document', id],
    queryFn: ({ signal }) => service.getById(id as string, signal),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useReturnManagementNextNumber(
  config: ReturnManagementTypeConfig
) {
  const service = createReturnManagementService(config.apiPath);

  return useQuery({
    queryKey: [config.screenId, 'next-number'],
    queryFn: ({ signal }) => service.getNextNumber(signal),
    staleTime: 0,
    retry: 1,
  });
}

export function useReturnManagementLookups(
  config: ReturnManagementTypeConfig
) {
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

  const suppliersQuery = useQuery({
    queryKey: ['master', 'suppliers'],
    queryFn: ({ signal }) => masterService.getSuppliers(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const customersQuery = useQuery({
    queryKey: ['master', 'customers'],
    queryFn: ({ signal }) => masterService.getCustomers(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const departmentsQuery = useQuery({
    queryKey: ['master', 'departments'],
    queryFn: ({ signal }) => masterService.getDepartments(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const storesQuery = useQuery({
    queryKey: ['master', 'stores'],
    queryFn: ({ signal }) => masterService.getStores(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const partyOptions =
    config.partySource === 'suppliers'
      ? (suppliersQuery.data ?? []).map((party) => ({
          value: party.code,
          label: `${party.code} — ${party.name}`,
        }))
      : config.partySource === 'customers'
        ? (customersQuery.data ?? []).map((party) => ({
            value: party.code,
            label: `${party.code} — ${party.name}`,
          }))
        : (departmentsQuery.data ?? []).map((dept) => ({
            value: dept,
            label: dept,
          }));

  const isLoading =
    itemsQuery.isPending || locationsQuery.isPending;

  const isError = itemsQuery.isError || locationsQuery.isError;

  const firstError = itemsQuery.error || locationsQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : `Unable to load ${config.title} master data.`;

  const refetch = () =>
    Promise.all([itemsQuery.refetch(), locationsQuery.refetch(), storesQuery.refetch()]);

  return {
    items: itemsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    stores: storesQuery.data ?? [],
    partyOptions,
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface UpdateVariables {
  id: string;
  payload: ReturnManagementPayload;
}

interface ActionVariables {
  id: string;
  action: ReturnManagementDocumentAction;
  note?: string;
}

export function useReturnManagementMutations(
  config: ReturnManagementTypeConfig
) {
  const queryClient = useQueryClient();
  const service = createReturnManagementService(config.apiPath);

  const invalidateScreen = () =>
    queryClient.invalidateQueries({
      queryKey: [config.screenId],
    });

  const invalidateStock = () =>
    queryClient.invalidateQueries({
      queryKey: ['inventory', 'stock'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: ReturnManagementPayload) =>
      service.create(payload),
    onSuccess: invalidateScreen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: UpdateVariables) =>
      service.update(id, payload),
    onSuccess: invalidateScreen,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => service.remove(id),
    onSuccess: invalidateScreen,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: ActionVariables) =>
      service.action(id, action, note),
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