import React from 'react';

type Props = { name: string; initials: string; content: string; created_at?: string; rating?: number };

const ReviewCard: React.FC<Props> = ({ name, initials, content, created_at, rating = 5 }) => {
  return (
    <article
      className="review-card"
      style={{ borderRadius: 12, padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
    >
  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            background: 'var(--accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}
          aria-hidden
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: '1rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={name}>
                {name}
              </strong>

        <div style={{ marginTop: 4, display: 'flex', gap: 4, alignItems: 'center' }} aria-hidden>
                { [1,2,3,4,5].map(i => (
          <span key={i} style={{ fontSize: 14, lineHeight: 1, color: i <= rating ? 'var(--accent)' : 'var(--text-secondary)' }}>{i <= rating ? '★' : '☆'}</span>
                )) }
              </div>
            </div>

            {created_at && (
              <small style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{new Date(created_at).toLocaleDateString()}</small>
            )}
          </div>

          <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', marginBottom: 0 }}>{content}</p>
        </div>
      </div>
    </article>
  );
};

export default ReviewCard;
