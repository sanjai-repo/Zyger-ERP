const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  PURCHASABLE: {
    label: 'Purchasable',
    color: '#1d4ed8',
    bg: '#e8effd',
  },
  CUSTOMER_SUPPLIED: {
    label: 'Customer Supplied',
    color: '#7c3aed',
    bg: '#f3edfc',
  },
  MANUFACTURING: {
    label: 'Manufacturing',
    color: '#0f766e',
    bg: '#e3f5f3',
  },
  FG: {
    label: 'Manufacturing',
    color: '#0f766e',
    bg: '#e3f5f3',
  },
};

export function itemTypeMeta(type?: string | null): {
  label: string;
  color: string;
  bg: string;
} {
  return (
    TYPE_META[String(type ?? '').toUpperCase()] ?? {
      label: String(type ?? '') || '—',
      color: 'var(--muted)',
      bg: 'var(--bg, #f1f3f5)',
    }
  );
}

export default function ItemTypeChip({ type }: { type?: string | null }) {
  const meta = itemTypeMeta(type);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: meta.color,
        background: meta.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  );
}