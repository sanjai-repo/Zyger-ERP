import { useQuery } from '@tanstack/react-query';
import { masterService } from '../services/masterService';

export function usePoInwardLookups() {
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

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders', 'approved'],
    queryFn: ({ signal }) => masterService.getApprovedPurchaseOrders(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const locationsQuery = useQuery({
    queryKey: ['inventory', 'locations'],
    queryFn: ({ signal }) => masterService.getLocations(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const uomsQuery = useQuery({
    queryKey: ['master', 'uoms'],
    queryFn: ({ signal }) => masterService.getUoms(signal),
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
    suppliersQuery.isPending ||
    purchaseOrdersQuery.isPending ||
    locationsQuery.isPending;

  const isError =
    itemsQuery.isError ||
    suppliersQuery.isError ||
    purchaseOrdersQuery.isError ||
    locationsQuery.isError;

  const firstError =
    itemsQuery.error ||
    suppliersQuery.error ||
    purchaseOrdersQuery.error ||
    locationsQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load PO Inward master data.';

  const refetch = () => {
    return Promise.all([
      itemsQuery.refetch(),
      suppliersQuery.refetch(),
      purchaseOrdersQuery.refetch(),
      locationsQuery.refetch(),
      uomsQuery.refetch(),
      storesQuery.refetch(),
    ]);
  };

  return {
    items: itemsQuery.data ?? [],
    suppliers: suppliersQuery.data ?? [],
    purchaseOrders: purchaseOrdersQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    uoms: uomsQuery.data ?? [],
    stores: storesQuery.data ?? [],
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}