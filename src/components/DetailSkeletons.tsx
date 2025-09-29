import React from 'react';
import Skeleton from './Skeleton';

export const DestinationDetailSkeleton: React.FC = () => (
  <div className="page-container destination-detail-page">
    <div className="container">
      <div className="page-header-with-back">
        <Skeleton height={28} width="60%" />
      </div>

      <section className="gallery-container">
        <div className="main-image">
          <Skeleton height={0} style={{ paddingTop: '50%' }} className="skeleton-rounded" />
        </div>
        <div className="thumbnail-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="thumbnail">
              <Skeleton height={0} style={{ paddingTop: '40%' }} />
            </div>
          ))}
        </div>
      </section>

      <div className="destination-content-layout">
        <main className="destination-main-content">
          <div className="destination-tabs">
            <div className="tab-list">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Skeleton height={28} width={28} style={{ borderRadius: '50%' }} />
                <Skeleton height={28} width={28} style={{ borderRadius: '50%' }} />
                <Skeleton height={28} width={28} style={{ borderRadius: '50%' }} />
              </div>
            </div>
          </div>

          <div className="tab-panel">
            <Skeleton height={18} width="70%" />
            <Skeleton height={12} width="100%" />
            <Skeleton height={12} width="100%" />
            <Skeleton height={12} width="80%" />
          </div>
        </main>

        <aside className="info-sidebar">
          <h3><Skeleton height={18} width="60%" /></h3>
          <div style={{ marginTop: '1rem' }}>
            <Skeleton height={14} width="50%" />
            <Skeleton height={14} width="70%" />
          </div>
        </aside>
      </div>
    </div>

    <div className="sticky-booking-bar">
      <div className="container booking-bar-content">
        <div>
          <Skeleton height={12} width={80} />
          <Skeleton height={18} width={140} />
        </div>
        <Skeleton height={36} width={120} rounded />
      </div>
    </div>
  </div>
);

export const BlogDetailSkeleton: React.FC = () => (
  <div className="page-container blog-detail-page">
    <header className="blog-detail-header">
      <Skeleton height={0} style={{ paddingTop: '40%' }} className="skeleton-rounded" />
    </header>
    <div className="container">
      <div className="blog-detail-layout">
        <div className="blog-detail-title-container">
          <Skeleton height={28} width="70%" />
        </div>

        <div className="blog-detail-meta">
          <Skeleton height={12} width={120} />
        </div>

        <main className="blog-detail-content">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={12} width={`${100 - (i%3)*10}%`} />)}
        </main>
      </div>
    </div>
  </div>
);

export const AdminRowSkeleton: React.FC = () => (
  <div className="admin-item-card">
    <div className="admin-item-image skeleton-avatar" />
    <div className="admin-item-info">
      <Skeleton height={14} width="40%" />
      <Skeleton height={12} width="60%" />
    </div>
    <div className="admin-item-actions">
      <div style={{ width: 36 }} />
    </div>
  </div>
);

export const OrderCardSkeleton: React.FC = () => (
  <div className="admin-card">
    <div style={{ padding: '1rem' }}>
      <Skeleton height={18} width="30%" />
      <div style={{ marginTop: '0.75rem' }}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={12} width={`${100 - i*15}%`} />)}
      </div>
    </div>
  </div>
);

export default DestinationDetailSkeleton;
