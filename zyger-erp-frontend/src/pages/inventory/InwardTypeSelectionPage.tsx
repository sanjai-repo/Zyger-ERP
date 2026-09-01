import { useLanguage } from '../../contexts/LanguageContext';
import type { InwardType } from '../../config/inwardConfig';

interface InwardTypeSelectionPageProps {
  onSelectType: (type: InwardType) => void;
  onOpenPendingQC?: () => void;
}

export default function InwardTypeSelectionPage({ onSelectType, onOpenPendingQC }: InwardTypeSelectionPageProps) {
  const { language, setLanguage, t } = useLanguage();

  const cardConfigs = [
    {
      type: 'PO_INWARD' as InwardType,
      title: t('poInward'),
      subtitle: 'Material arriving from supplier PO',
      icon: 'local_shipping',
      color: '#2563eb',
      bgColor: '#eff6ff',
    },
    {
      type: 'LO_INWARD' as InwardType,
      title: t('loInward'),
      subtitle: 'Material returning from heat treatment / plating vendor',
      icon: 'sync_alt',
      color: '#7c3aed',
      bgColor: '#f5f3ff',
    },
    {
      type: 'JO_INWARD' as InwardType,
      title: t('joInward'),
      subtitle: 'Finished / semi-finished parts from internal shop floor',
      icon: 'precision_manufacturing',
      color: '#16a34a',
      bgColor: '#f0fdf4',
    },
    {
      type: 'GENERAL_INWARD' as InwardType,
      title: t('generalInward'),
      subtitle: 'Opening stock, samples, customer returns, internal transfers',
      icon: 'inventory',
      color: '#d97706',
      bgColor: '#fffbeb',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header & Language Toggle */}
      <div className="pg-head pg-head-flex" style={{ marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="pg-head-text">
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            🚚 {t('materialIn')} — Select Inward Type
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)' }}>
            Pick an inward category below to make a new entry
          </p>
        </div>

        {/* Language Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card, #ffffff)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color, #cbd5e1)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>🌐 Language:</span>
          <button
            onClick={() => setLanguage('en')}
            style={{
              padding: '4px 10px',
              borderRadius: '14px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              background: language === 'en' ? 'var(--p-color, #2563eb)' : 'transparent',
              color: language === 'en' ? '#ffffff' : 'var(--text-main)',
            }}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('hi')}
            style={{
              padding: '4px 10px',
              borderRadius: '14px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              background: language === 'hi' ? 'var(--p-color, #2563eb)' : 'transparent',
              color: language === 'hi' ? '#ffffff' : 'var(--text-main)',
            }}
          >
            हिंदी (Regional)
          </button>
        </div>
      </div>

      {/* 4 Big Touch-Friendly Buttons Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {cardConfigs.map((card) => (
          <div
            key={card.type}
            onClick={() => onSelectType(card.type)}
            style={{
              background: card.bgColor,
              border: `2px solid ${card.color}`,
              borderRadius: '16px',
              padding: '24px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '190px',
            }}
            className="big-button-card"
          >
            <div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <span className="material-symbols-rounded" style={{ color: '#ffffff', fontSize: '32px' }}>
                  {card.icon}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                {card.title}
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                {card.subtitle}
              </p>
            </div>

            <div style={{ marginTop: '16px', fontWeight: 700, fontSize: '0.9rem', color: card.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Create Entry <span className="material-symbols-rounded">arrow_forward</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action: Quality Inspection Link */}
      {onOpenPendingQC && (
        <div
          onClick={onOpenPendingQC}
          style={{
            background: 'var(--yellow-light, #fef3c7)',
            border: '2px dashed var(--yellow, #f59e0b)',
            borderRadius: '12px',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--yellow-dark, #b45309)', fontSize: '32px' }}>
              hourglass_top
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--yellow-dark, #b45309)' }}>
                {t('pendingInspection')} Queue
              </div>
              <div style={{ fontSize: '0.88rem', color: '#78350f' }}>
                Inspect received materials and update usable inventory stock
              </div>
            </div>
          </div>

          <button className="btn btn-p" style={{ background: 'var(--yellow-dark, #b45309)', borderColor: 'var(--yellow-dark)' }}>
            Open Quality Queue →
          </button>
        </div>
      )}
    </div>
  );
}
