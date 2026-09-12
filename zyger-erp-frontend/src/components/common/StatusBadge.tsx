interface StatusBadgeProps {
  status: string;
  variant?: Record<string, { color: string; bg: string }>;
}

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  const isMailSent = status === 'SENT' || status === 'MAIL SENT' || status === 'MAIL_SENT';
  const label = isMailSent ? 'Mail Sent' : status === 'DRAFT' ? 'Draft' : status;
  if (variant && variant[status]) {
    const v = variant[status];
    return (
      <span
        className="bdg"
        style={{ background: v.bg, color: v.color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}
      >
        {label}
      </span>
    );
  }
  const cssClass = isMailSent ? 'SENT' : status;
  return <span className={`bdg bdg-${cssClass}`}>{label}</span>;
}
