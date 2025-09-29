import React from 'react';
import { WhatsAppIcon } from './Icons';

interface StickyWhatsAppButtonProps {
    whatsappNumber: string;
}

export const StickyWhatsAppButton: React.FC<StickyWhatsAppButtonProps> = ({ whatsappNumber }) => {
    // Remove non-digit characters to ensure the link works
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}`;

    return (
        <a 
            href={whatsappUrl} 
            className="sticky-whatsapp-btn"
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Hubungi kami di WhatsApp"
            title="Hubungi kami di WhatsApp"
        >
            <WhatsAppIcon />
            <span className="whatsapp-cta-text">Tanya Dulu Aja Yuk!</span>
        </a>
    );
};