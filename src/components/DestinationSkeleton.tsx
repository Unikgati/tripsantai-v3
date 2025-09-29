import React from 'react';
import Skeleton from './Skeleton';

export const DestinationSkeleton: React.FC = () => {
  return (
    <article className="destination-card">
      <div className="card-image-container">
        <Skeleton height={0} style={{ paddingTop: '75%' }} className="skeleton-rounded" />
      </div>
      <div className="card-content">
        <Skeleton height={12} width="50%" />
        <Skeleton height={12} width="100%" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
          <Skeleton height={14} width="40%" />
          <Skeleton height={36} width={120} rounded />
        </div>
      </div>
    </article>
  );
};

export default DestinationSkeleton;
