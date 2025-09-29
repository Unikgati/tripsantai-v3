import React from 'react';
import { Order } from '../../types';
import { MessageSquareIcon, CheckCircleIcon, CheckSquareIcon, XCircleIcon, DollarSignIcon, EyeIcon, InvoiceLinkIcon } from '../Icons';

interface OrderCardProps {
    order: Order;
    onContact: (order: Order) => void;
    onOpenPaymentModal: (order: Order) => void;
    onViewDetails: (order: Order) => void;
    onComplete: (order: Order) => void;
    onCancel: (order: Order) => void;
    onGenerateInvoice?: (order: Order) => void;
    isGeneratingInvoice?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onContact, onOpenPaymentModal, onViewDetails, onComplete, onCancel, onGenerateInvoice, isGeneratingInvoice }) => {

    const formatDepartureDate = (dateString: string) => {
        // The date from <input type="date"> is already YYYY-MM-DD.
        // We need to add time to avoid timezone issues when parsing.
        return new Date(dateString + 'T00:00:00').toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const renderActions = () => {
        switch (order.status) {
            case 'Baru':
                return (
                    <button className="btn-icon" title="Hubungi & Kirim Tagihan" onClick={() => onContact(order)}>
                        <MessageSquareIcon />
                    </button>
                );
            case 'Menunggu Pembayaran':
                return (
                    <>
                        <button className="btn-icon" title="Kirim Pesan" onClick={() => onContact(order)}>
                            <MessageSquareIcon />
                        </button>
                        <button className="btn-icon delete" title="Batalkan Pesanan" onClick={() => onCancel(order)}>
                            <XCircleIcon />
                        </button>
                        <button className="btn-icon confirm" title="Konfirmasi Pembayaran" onClick={() => onOpenPaymentModal(order)}>
                            <CheckCircleIcon />
                        </button>
                    </>
                );
            case 'Siap Jalan':
                 return (
                    <>
                        <button className="btn-icon" title="Kirim Pesan" onClick={() => onContact(order)}>
                            <MessageSquareIcon />
                        </button>
                        <button className="btn-icon delete" title="Batalkan Pesanan" onClick={() => onCancel(order)}>
                            <XCircleIcon />
                        </button>
                        {order.paymentStatus === 'DP' && (
                            <button className="btn-icon confirm" title="Konfirmasi Pembayaran Lanjutan" onClick={() => onOpenPaymentModal(order)}>
                                <DollarSignIcon />
                            </button>
                        )}
                        <button 
                            className="btn-icon confirm" 
                            title={order.paymentStatus !== 'Lunas' ? "Pelunasan diperlukan sebelum menyelesaikan pesanan" : "Tandai Selesai"}
                            onClick={() => onComplete(order)}
                            disabled={order.paymentStatus !== 'Lunas'}
                        >
                           <CheckSquareIcon />
                        </button>
                    </>
                );
            default:
                return null;
        }
    };


    return (
        <div className="order-card">
            <div className="order-card-header">
                <div className="order-title-with-badge">
                    <button className="order-title-btn" onClick={() => onViewDetails(order)} aria-label={`Lihat detail pesanan ${order.customerName}`}>
                        <h3>{order.customerName}</h3>
                    </button>
                    <span className="participant-badge" aria-label={`${order.participants} peserta`}>{order.participants} org</span>
                </div>
            </div>
            <div className="order-card-body">
                <div className="order-card-info-item">
                    Destinasi:
                    <strong>{order.destinationTitle}</strong>
                </div>
                <div className="order-card-info-item">
                    Tgl Berangkat:
                    <strong>{order.departureDate ? formatDepartureDate(order.departureDate) : 'Belum diatur'}</strong>
                </div>
            </div>
            <div className="order-card-actions">
                <button className="btn-icon" title="Lihat Detail" onClick={() => onViewDetails(order)}>
                    <EyeIcon />
                </button>
                {/* Show invoice generation only when order is waiting for payment */}
                {order.status === 'Menunggu Pembayaran' && (
                    <button
                        className="btn-icon"
                        title="Buat & Bagikan Invoice"
                        onClick={() => onGenerateInvoice && onGenerateInvoice(order)}
                        disabled={false}
                    >
                        {/* Show spinner if parent passes isGeneratingInvoice prop */}
                        {isGeneratingInvoice ? (
                            <div className="spinner" aria-hidden style={{ width: 18, height: 18 }} />
                        ) : (
                            <InvoiceLinkIcon />
                        )}
                    </button>
                )}
                {renderActions()}
            </div>
        </div>
    );
};