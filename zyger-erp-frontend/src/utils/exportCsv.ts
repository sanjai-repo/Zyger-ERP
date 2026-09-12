export function exportToCsv(rows: Record<string, unknown>[], filename: string, columns?: { key: string; label: string }[]) {
  if (rows.length === 0) return;

  const cols = columns || Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const headers = cols.map((c) => c.label);

  const csvEscape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => cols.map((c) => csvEscape(row[c.key])).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
