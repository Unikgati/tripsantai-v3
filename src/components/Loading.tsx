import React from 'react';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Memuat...', size = 'medium' }) => {
  return (
    <div className={`loading-viewport loading-${size}`} role="status" aria-live="polite">
      <div className="loading-card">
        <div className="loading-spinner" aria-hidden="true"></div>
        <div className="loading-message">{message}</div>
      </div>
    </div>
  );
};

export default Loading;
