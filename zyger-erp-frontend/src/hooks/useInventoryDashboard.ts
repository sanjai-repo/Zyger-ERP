import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';

export function useInventoryDashboard() {
  const summaryQuery = useQuery({
    queryKey: ['inventory', 'dashboard', 'summary'],
    queryFn: ({ signal }) => inventoryService.getDashboardSummary(signal),
    staleTime: 1000 * 30,
    retry: 1,
  });

  const recentLedgerQuery = useQuery({
    queryKey: ['inventory', 'ledger', 'recent'],
    queryFn: ({ signal }) => inventoryService.getRecentLedger(signal),
    staleTime: 1000 * 30,
    retry: 1,
  });

  const lowStockQuery = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: ({ signal }) => inventoryService.getLowStock(signal),
    staleTime: 1000 * 30,
    retry: 1,
  });

  const isLoading =
    summaryQuery.isPending ||
    recentLedgerQuery.isPending ||
    lowStockQuery.isPending;

  const isError =
    summaryQuery.isError ||
    recentLedgerQuery.isError ||
    lowStockQuery.isError;

  const firstError =
    summaryQuery.error ||
    recentLedgerQuery.error ||
    lowStockQuery.error;

  const errorMessage =
    firstError instanceof Error
      ? firstError.message
      : 'Unable to load inventory dashboard.';

  const refetch = () => {
    return Promise.all([
      summaryQuery.refetch(),
      recentLedgerQuery.refetch(),
      lowStockQuery.refetch(),
    ]);
  };

  return {
    summary: summaryQuery.data,
    recentLedger: recentLedgerQuery.data,
    lowStockItems: lowStockQuery.data,
    isLoading,
    isError,
    errorMessage,
    refetch,
  };
}