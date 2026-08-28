export interface ReportsOverviewKpis {
  totalOnHand: number;
  stockValue: number;
  reserved: number;
  available: number;
  lowStockCount: number;
  pendingInward: number;
  pendingApprovals: number;
  ledgerEntries: number;
  accuracyPct: number;
}

export interface MonthlyStatusPoint {
  month: string;
  received: number;
  onHand: number;
  issued: number;
}

export interface CategorySlice {
  category: string;
  value: number;
}

export interface LocationBar {
  location: string;
  onHand: number;
}

export interface TrendPoint {
  date: string;
  inward: number;
  issued: number;
}

export interface TopItemBar {
  itemCode: string;
  itemName: string;
  value: number;
}

export interface ReportsOverviewDto {
  kpis: ReportsOverviewKpis;
  monthlyStatus: MonthlyStatusPoint[];
  categoryDistribution: CategorySlice[];
  locationDistribution: LocationBar[];
  inwardIssueTrend: TrendPoint[];
  topItemsByValue: TopItemBar[];
}

export interface ReportQueryParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  itemCode?: string;
  location?: string;
  category?: string;
  status?: string;
  txType?: string;
  lowStockOnly?: boolean;
  includeZero?: boolean;
}

export type DrilldownRow = { id: string } & Record<
  string,
  string | number | null | undefined
>;

export interface ItemGroupSummary {
  group: string;
  itemCount: number;
  qtyOnHand: number;
  qtyAvailable: number;
  value: number;
  notAvailableCount: number;
  lowStockCount: number;
}

export interface StockSummaryTotals {
  itemCount: number;
  qtyOnHand: number;
  qtyAvailable: number;
  value: number;
  notAvailableCount: number;
  lowStockCount: number;
}

export interface NotAvailableItem {
  itemCode: string;
  itemName: string;
  category: string;
  itemType: string;
  itemGroup: string;
  uom: string;
  defaultWarehouse: string;
  available: number;
  status: string;
}

export interface StockSummaryDto {
  groups: ItemGroupSummary[];
  totals: StockSummaryTotals;
  notAvailableItems: NotAvailableItem[];
}

export interface SimpleReportDto {
  totals: StockSummaryTotals;
  groups: ItemGroupSummary[];
  reorderList: DrilldownRow[];
}