import { useMemo } from 'react';

interface SkeletonLoaderProps {
  rows?: number;
  columns?: number;
  type?: 'table' | 'form' | 'card' | 'stats';
  className?: string;
}

const shimmerKeyframes = `
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-bone {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 6px;
}

.skeleton-bone-dark {
  background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 6px;
}
`;

export default function SkeletonLoader({ rows = 5, columns = 4, type = 'table', className = '' }: SkeletonLoaderProps) {
  useMemo(() => {
    // Inject styles once
    if (!document.getElementById('skeleton-styles')) {
      const style = document.createElement('style');
      style.id = 'skeleton-styles';
      style.textContent = shimmerKeyframes;
      document.head.appendChild(style);
    }
  }, []);

  if (type === 'stats') {
    return (
      <div className={className} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} style={{ padding: 20, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0' }}>
            <div className="skeleton-bone" style={{ height: 14, width: '60%', marginBottom: 12 }} />
            <div className="skeleton-bone" style={{ height: 28, width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            <div className="skeleton-bone" style={{ height: 12, width: '30%', marginBottom: 8 }} />
            <div className="skeleton-bone" style={{ height: 40, width: '100%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={className} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ padding: 20, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0' }}>
            <div className="skeleton-bone" style={{ height: 20, width: '70%', marginBottom: 12 }} />
            <div className="skeleton-bone" style={{ height: 14, width: '100%', marginBottom: 8 }} />
            <div className="skeleton-bone" style={{ height: 14, width: '80%' }} />
          </div>
        ))}
      </div>
    );
  }

  // Table type (default)
  return (
    <div className={className} style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: '8px 8px 0 0' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton-bone" style={{ height: 14, width: '70%' }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 16,
            padding: '16px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={colIdx} className="skeleton-bone" style={{ height: 16, width: `${50 + Math.random() * 40}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
