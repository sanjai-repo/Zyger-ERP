export function exportToCsv(
  data: Record<string, unknown>[],
  columns: { key: string; label: string; render?: (value: unknown, row: Record<string, unknown>) => string }[],
  filename: string,
) {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const raw = c.render ? c.render(row[c.key], row) : row[c.key];
        const val = raw == null ? '' : String(raw);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(','),
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSimpleCsv(
  data: Record<string, unknown>[],
  filename: string,
) {
  if (data.length === 0) return;
  const columns = Object.keys(data[0]).map((k) => ({ key: k, label: k }));
  exportToCsv(data, columns, filename);
}
