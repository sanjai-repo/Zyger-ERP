import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { issueInternalExternalService } from '../services/issueInternalExternalService';
import { masterService } from '../services/masterService';
import { stockIssueRequestService } from '../services/stockIssueRequestService';
import type {
  IssueInternalExternalDocumentAction,
  IssueInternalExternalListParams,
  IssueInternalExternalPayload,
  IssueInternalExternalType,
} from '../types/inventory/issueInternalExternal.types';

export function useIssueInternalExternalList(
  params: IssueInternalExternalListParams
) {
  return useQuery({
    queryKey: ['issue-internal-external', 'list', params],
    queryFn: ({ signal }) =>
      issueInternalExternalService.getList(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: 1,
  });
}

export function useIssueInternalExternalDocument(id?: string | null) {
  return useQuery({
    queryKey: ['issue-internal-external', 'document', id],
    queryFn: ({ signal }) =>
      issueInternalExternalService.getById(id as string, signal),
    enabled: Boolean(id),
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

export function useIssueInternalExternalNextNumber(
  issueType: IssueInternalExternalType | null
) {
  return useQuery({
    queryKey: ['issue-internal-external', 'next-number', issueType],
    queryFn: ({ signal }) =>
      issueInternalExternalService.getNextNumber(
        issueType as IssueInternalExternalType,
        signal
      ),
    enabled: Boolean(issueType),
    staleTime: 0,
    retry: 1,
  });
}

export function useIssueInternalExternalLookups() {
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

  const storesQuery = useQuery({
    queryKey: ['master', 'stores'],
    queryFn: ({ signal }) => masterService.getStores(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isLoading =
    itemsQuery.isPending ||
    locationsQuery.isPending ||
    departmentsQuery.isPending;

  const isError =
    itemsQuery.isError || locationsQuery.isError || departmentsQuery.isError;

  const firstError =
    itemsQuery.error || locationsQuery.error || departmentsQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load Issue Internal / External master data.';

  const refetch = () =>
    Promise.all([
      itemsQuery.refetch(),
      locationsQuery.refetch(),
      departmentsQuery.refetch(),
      storesQuery.refetch(),
    ]);

  return {
    items: itemsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    stores: storesQuery.data ?? [],
    departments: departmentsQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}

interface UpdateVariables {
  id: string;
  payload: IssueInternalExternalPayload;
}

interface ActionVariables {
  id: string;
  action: IssueInternalExternalDocumentAction;
  note?: string;
}

export function useIssueInternalExternalMutations() {
  const queryClient = useQueryClient();

  const invalidateScreen = () =>
    queryClient.invalidateQueries({
      queryKey: ['issue-internal-external'],
    });

  const invalidateStock = () =>
    queryClient.invalidateQueries({
      queryKey: ['inventory', 'stock'],
    });

  const createMutation = useMutation({
    mutationFn: (payload: IssueInternalExternalPayload) =>
      issueInternalExternalService.create(payload),
    onSuccess: invalidateScreen,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: UpdateVariables) =>
      issueInternalExternalService.update(id, payload),
    onSuccess: invalidateScreen,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => issueInternalExternalService.remove(id),
    onSuccess: invalidateScreen,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, note }: ActionVariables) =>
      issueInternalExternalService.action(id, action, note),
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