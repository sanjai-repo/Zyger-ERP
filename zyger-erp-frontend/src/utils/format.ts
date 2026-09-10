const numberFormatter = new Intl.NumberFormat('en-IN');

function parseNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : parseFloat(String(value));

  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatNumber(value: number | string | null | undefined): string {
  return numberFormatter.format(parseNumber(value));
}

export function formatMoney(value: number | string | null | undefined): string {
  return `Rs.${numberFormatter.format(parseNumber(value))}`;
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const normalized = value.length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function toNumber(value: string | number | null | undefined): number {
  return parseNumber(value);
}

export function toOptionalNumber(
  value: string | number | null | undefined
): number | undefined {
  if (value === null || value === undefined || String(value).trim() === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : parseFloat(String(value));

  return Number.isNaN(parsed) ? undefined : parsed;
}

export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCurrency(
  value: number | string | null | undefined
): string {
  const parsed =
    typeof value === 'number' ? value : parseFloat(String(value ?? ''));

  const safe = Number.isNaN(parsed) ? 0 : parsed;

  return '₹' + new Intl.NumberFormat('en-IN').format(safe);
}