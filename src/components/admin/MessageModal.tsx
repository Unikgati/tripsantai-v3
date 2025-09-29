import React, { useState, useEffect } from 'react';
import { XIcon, SendIcon } from '../Icons';

interface MessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (message: string) => void;
    title: string;
    initialMessage: string;
}

export const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, onSend, title, initialMessage }) => {
    const [message, setMessage] = useState(initialMessage);

    useEffect(() => {
        // Reset message when the modal is opened with a new initial message
        setMessage(initialMessage);
    }, [initialMessage]);
    
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }
    
    const handleSendClick = () => {
        if(message.trim()) {
            onSend(message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button onClick={onClose} className="modal-close-btn" aria-label="Tutup">
                        <XIcon />
                    </button>
                </div>
                <div className="modal-body">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendClick(); }}>
                        <div className="form-group">
                            <label htmlFor="whatsappMessage">Pesan WhatsApp</label>
                            <textarea
                                id="whatsappMessage"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                style={{ minHeight: '250px', resize: 'vertical', width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                                required
                            />
                        </div>
                         <div className="modal-actions" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)'}}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
                            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <SendIcon />
                                Kirim ke WhatsApp
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};