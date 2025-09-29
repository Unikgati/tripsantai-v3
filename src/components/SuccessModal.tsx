import React from 'react';
import { CheckCircleIcon } from './Icons';

interface SuccessModalProps {
  title?: string;
  message?: React.ReactNode;
  primaryLabel?: string;
  onClose: () => void;
  variant?: 'success' | 'error';
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ title = 'Berhasil', message, primaryLabel = 'Kembali ke Beranda', onClose, variant = 'success' as 'success' | 'error' }) => {
  const icon = (v: 'success' | 'error') => v === 'error' ? (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
    </span>
  ) : <CheckCircleIcon />;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ textAlign: 'center' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          {icon(variant)}
          <h2 style={{ margin: 0 }}>{title}</h2>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 520 }}>{message}</div>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={onClose}>{primaryLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
