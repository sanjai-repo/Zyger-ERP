import { useQuery } from '@tanstack/react-query';
import { masterService } from '../services/masterService';
import { stockIssueRequestService } from '../services/stockIssueRequestService';

export interface IssueRequestLookupEntry {
  date?: string;
  requestedBy?: string;
}

/**
 * Doc No -> { date, requestedBy } for every Stock Issue Request, regardless of
 * status. Used by the RM Issue / General Issue / Issue Internal-External list
 * tables to show "Requested Date" and "Requested By" without an extra request
 * per row — the doc-type list endpoint already returns full entity rows
 * (including issueRequestNo), so one bulk SIR fetch is enough to resolve every
 * row on the page.
 */
export function useIssueRequestLookup() {
  return useQuery({
    queryKey: ['stock-issue-request', 'lookup-all'],
    queryFn: async ({ signal }) => {
      const page = await stockIssueRequestService.getList(
        { page: 0, size: 500, sort: 'date,desc' },
        signal
      );

      const map: Record<string, IssueRequestLookupEntry> = {};

      (page.content ?? []).forEach((row) => {
        map[row.docNo] = { date: row.date, requestedBy: row.requestedBy };
      });

      return map;
    },
    staleTime: 1000 * 60,
    retry: 1,
  });
}

/**
 * Store code -> display name, from store_master. Falls back to the raw code
 * (e.g. a location_master code with no store_master row) wherever a lookup
 * misses, so nothing renders blank.
 */
export function useStoreNameLookup() {
  return useQuery({
    queryKey: ['master', 'stores'],
    queryFn: ({ signal }) => masterService.getStores(signal),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    select: (stores) => {
      const map: Record<string, string> = {};
      stores.forEach((store) => {
        if (store.code) {
          map[store.code] = store.name || store.code;
        }
      });
      return map;
    },
  });
}
