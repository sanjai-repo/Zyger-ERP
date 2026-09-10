export type ReorderStatus =
  | 'OK'
  | 'REORDER_SOON'
  | 'PURCHASE_NOW'
  | 'OUT_OF_STOCK';

type Numericish = string | number | null | undefined;

function toNum(value: Numericish): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(n) ? n : 0;
}

export interface StockLevelRow {
  id?: string;
  status?: string | null;
  reorderStatus?: string | null;
  onHand?: Numericish;
  onHandQty?: Numericish;
  reorderPoint?: Numericish;
  safetyStock?: Numericish;
  safetyQty?: Numericish;
  reorderQty?: Numericish;
  maxStockLevel?: Numericish;
  [key: string]: Numericish | undefined;
}

/** Reorder threshold for a row: explicit reorderPoint when configured, else the
 * safety stock (matches the alert spec reorderPoint ?? safetyStock ?? 0). */
export function reorderThreshold(row: StockLevelRow): number {
  const rp = toNum(row.reorderPoint);
  if (rp > 0) return rp;
  return toNum(row.safetyStock ?? row.safetyQty);
}

/** Traffic-light classification — 🔴 out of stock / below reorder point,
 * 🟡 within a 20% buffer above the reorder point, 🟢 otherwise. Prefers the
 * backend-computed status when present; falls back to a local computation. */
export function classifyStock(row: StockLevelRow): ReorderStatus {
  const status = String(row.reorderStatus ?? row.status ?? '').toUpperCase();
  if (status === 'OUT_OF_STOCK') return 'OUT_OF_STOCK';
  if (status === 'PURCHASE_NOW') return 'PURCHASE_NOW';
  if (status === 'REORDER_SOON') return 'REORDER_SOON';
  if (status === 'OK') return 'OK';

  const onHand = toNum(row.onHand ?? row.onHandQty);
  const threshold = reorderThreshold(row);
  if (onHand <= 0) return threshold > 0 ? 'OUT_OF_STOCK' : 'OK';
  if (onHand < threshold) return 'PURCHASE_NOW';
  if (onHand <= threshold * 1.2) return 'REORDER_SOON';
  return 'OK';
}

/** Suggested replenishment qty: configured reorderQty when present, else the
 * "fill to max" heuristic (maxStockLevel − reorder threshold). */
export function suggestedOrderQty(row: StockLevelRow): number {
  const reorderQty = toNum(row.reorderQty);
  if (reorderQty > 0) return Math.round(reorderQty);
  const max = toNum(row.maxStockLevel);
  const threshold = reorderThreshold(row);
  return Math.max(0, Math.round(max - threshold));
}

export const REORDER_STATUS_META: Record<
  ReorderStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  OUT_OF_STOCK: {
    label: 'Out of Stock',
    color: 'var(--red)',
    bg: 'var(--red-bg, #fdecec)',
    icon: 'cancel',
  },
  PURCHASE_NOW: {
    label: 'Purchase Now',
    color: 'var(--red)',
    bg: 'var(--red-bg, #fdecec)',
    icon: 'warning',
  },
  REORDER_SOON: {
    label: 'Reorder Soon',
    color: 'var(--yellow)',
    bg: 'var(--yellow-bg, #fdf3dc)',
    icon: 'schedule',
  },
  OK: {
    label: 'OK',
    color: 'var(--green)',
    bg: 'var(--green-bg, #e7f6ec)',
    icon: 'check_circle',
  },
};