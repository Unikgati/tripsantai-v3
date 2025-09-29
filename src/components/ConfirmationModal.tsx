import React, { useEffect } from 'react';
import { XIcon, SpinnerIcon } from './Icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
    confirmButtonVariant?: 'primary' | 'danger';
    confirmButtonText?: string;
    isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    children,
    confirmButtonVariant = 'danger',
    confirmButtonText = 'Hapus',
    isLoading = false
}) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Respect isLoading: don't allow closing while an action is in progress
                if (!isLoading) onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose, isLoading]);

    if (!isOpen) {
        return null;
    }

    return (
    <div className="modal-overlay" onClick={(e) => { if (!isLoading) onClose(); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="modal-close-btn" aria-label="Tutup" disabled={isLoading}>
                        <XIcon />
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>Batal</button>
                    <button 
                        className={`btn ${confirmButtonVariant === 'primary' ? 'btn-primary' : 'btn-danger'} ${isLoading ? 'loading' : ''}`} 
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading && <SpinnerIcon />}
                        <span>{confirmButtonText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};