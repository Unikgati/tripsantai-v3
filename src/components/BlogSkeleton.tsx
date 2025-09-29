import React from 'react';
import Skeleton from './Skeleton';

export const BlogSkeleton: React.FC = () => (
  <article className="blog-card">
    <div className="blog-card-image-container">
      <Skeleton height={0} style={{ paddingTop: '75%' }} className="skeleton-rounded" />
    </div>
    <div className="blog-card-content">
      <Skeleton height={14} width="60%" />
      <Skeleton height={12} width="100%" />
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton height={12} width="30%" />
        <Skeleton height={12} width="30%" />
      </div>
    </div>
  </article>
);

export default BlogSkeleton;
