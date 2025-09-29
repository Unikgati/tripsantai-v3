import React from 'react';
import Skeleton from './Skeleton';

export const ReviewSkeleton: React.FC = () => {
  return (
    <article className="review-card" style={{ borderRadius: 12, padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <div>
          <Skeleton height={48} width={48} rounded />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton height={14} width="40%" />
              <div style={{ marginTop: 4 }}>
                <Skeleton height={12} width="30%" />
              </div>
            </div>
            <div>
              <Skeleton height={12} width={60} />
            </div>
          </div>

          <div style={{ marginTop: 6 }}>
            <Skeleton height={12} width="100%" />
            <Skeleton height={12} width="80%" />
          </div>
        </div>
      </div>
    </article>
  );
};

export default ReviewSkeleton;
