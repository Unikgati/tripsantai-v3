import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, AppSettings } from '../../types';
import { OrderCard } from '../../components/admin/OrderCard';
import { OrderCardSkeleton } from '../../components/DetailSkeletons';
import { useEffect } from 'react';
import { PaymentConfirmationModal } from '../../components/admin/PaymentConfirmationModal';
import { OrderDetailModal } from '../../components/admin/OrderDetailModal';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { MessageModal } from '../../components/admin/MessageModal';

interface AdminOrdersPageProps {
    destinations: import('../../types').Destination[];
    orders: Order[];
    onUpdateStatus: (orderId: number, status: OrderStatus) => void;
    onUpdateDepartureDate: (orderId: number, date: string) => void;
    onUpdateParticipants?: (orderId: number, participants: number) => void;
    onConfirmPayment: (orderId: number, paymentDetails: { paymentStatus: 'DP' | 'Lunas', paymentAmount: number, notes: string }) => void;
    onDelete: (orderId: number) => void;
    appSettings: AppSettings;
    onGenerateInvoice?: (order: Order) => void;
}

const TABS: OrderStatus[] = ['Baru', 'Menunggu Pembayaran', 'Siap Jalan', 'Selesai', 'Dibatalkan'];

export const AdminOrdersPage: React.FC<AdminOrdersPageProps> = ({ destinations, orders, onUpdateStatus, onUpdateDepartureDate, onConfirmPayment, onDelete, onUpdateParticipants, appSettings, onGenerateInvoice }) => {
    const [activeTab, setActiveTab] = useState<OrderStatus>('Baru');
    const [isLoading, setIsLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [orderToContact, setOrderToContact] = useState<Order | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToConfirmAction, setOrderToConfirmAction] = useState<Order | null>(null);
    const [confirmationConfig, setConfirmationConfig] = useState<{
        action: 'complete' | 'cancel';
        title: string;
        message: React.ReactNode;
        confirmText: string;
        variant: 'primary' | 'danger';
    } | null>(null);

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => order.status === activeTab)
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [orders, activeTab]);

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 300);
        return () => clearTimeout(t);
    }, []);
    
    const handleOpenMessageModal = (order: Order) => {
        let message = '';
        if (order.status === 'Baru') {
            const departureDateText = order.departureDate
                ? new Date(order.departureDate + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
                : '-';

            const totalFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.totalPrice);

            message = `Halo Bapak/Ibu ${order.customerName},\n\nTerima kasih telah memilih ${appSettings.brandName}!\nPesanan Anda kami konfirmasi:\n\nDestinasi: ${order.destinationTitle}\n\nJumlah Peserta: ${order.participants} orang\n\nTanggal Keberangkatan: ${departureDateText}\n\nTotal Tagihan: ${totalFormatted}\n\nKonfirmasi segera agar tim ${appSettings.brandName} dapat menindaklanjuti pesanan Anda.`;
        }
        
        setMessageContent(message);
        setOrderToContact(order);
        setIsMessageModalOpen(true);
    };
    
    const handleSendMessage = (editedMessage: string) => {
        if (!orderToContact) return;
        
        const whatsappUrl = `https://wa.me/${orderToContact.customerPhone}?text=${encodeURIComponent(editedMessage)}`;
        window.open(whatsappUrl, '_blank');
        
        // Only update status if the order was 'Baru'
        if (orderToContact.status === 'Baru') {
            onUpdateStatus(orderToContact.id, 'Menunggu Pembayaran');
        }
        
        // Cleanup state
        setIsMessageModalOpen(false);
        setOrderToContact(null);
        setMessageContent('');
    };


    const handleOpenPaymentModal = (order: Order) => {
        setSelectedOrder(order);
        setIsPaymentModalOpen(true);
    };

    const handleConfirmPaymentSubmit = (paymentDetails: { paymentStatus: 'DP' | 'Lunas', paymentAmount: number, notes: string }) => {
        if (selectedOrder) {
            onConfirmPayment(selectedOrder.id, paymentDetails);
        }
        setIsPaymentModalOpen(false);
        setSelectedOrder(null);
    };
    
    const handleOpenDetailModal = (order: Order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };
    
    const handleUpdateDateAndCloseModal = (orderId: number, date: string) => {
        onUpdateDepartureDate(orderId, date);
        // Optimistically update the selected order to reflect the change immediately
        if(selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, departureDate: date } : null);
        }
    };

    const handleRequestComplete = (order: Order) => {
        setConfirmationConfig({
            action: 'complete',
            title: 'Konfirmasi Penyelesaian',
            message: <p>Apakah Anda yakin ingin menandai pesanan untuk <strong>{order.customerName}</strong> sebagai 'Selesai'?</p>,
            confirmText: 'Ya, Selesaikan',
            variant: 'primary',
        });
        setOrderToConfirmAction(order);
    };

    const handleRequestCancel = (order: Order) => {
        setConfirmationConfig({
            action: 'cancel',
            title: 'Konfirmasi Pembatalan',
            message: <p>Apakah Anda yakin ingin membatalkan pesanan untuk <strong>{order.customerName}</strong>?</p>,
            confirmText: 'Ya, Batalkan',
            variant: 'danger',
        });
        setOrderToConfirmAction(order);
    };

    const handleConfirmAction = () => {
        if (!orderToConfirmAction || !confirmationConfig) return;

        if (confirmationConfig.action === 'complete') {
            onUpdateStatus(orderToConfirmAction.id, 'Selesai');
        } else if (confirmationConfig.action === 'cancel') {
            onUpdateStatus(orderToConfirmAction.id, 'Dibatalkan');
        }
        
        setOrderToConfirmAction(null);
        setConfirmationConfig(null);
    };

    const handleCloseConfirmation = () => {
        setOrderToConfirmAction(null);
        setConfirmationConfig(null);
    };

    const tabCounts = useMemo(() => {
        const map: Record<OrderStatus, number> = {
            'Baru': 0,
            'Menunggu Pembayaran': 0,
            'Siap Jalan': 0,
            'Selesai': 0,
            'Dibatalkan': 0,
        };
        orders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
        return map;
    }, [orders]);

    // Track invoice generation loading states per-order
    const [loadingInvoiceIds, setLoadingInvoiceIds] = useState<Record<number, boolean>>({});

    const handleGenerateInvoice = async (order: Order) => {
        if (typeof onGenerateInvoice !== 'function') return;
        setLoadingInvoiceIds(prev => ({ ...prev, [order.id]: true }));
        try {
            await onGenerateInvoice(order);
        } catch (e) {
            console.warn('onGenerateInvoice failed', e);
        } finally {
            setLoadingInvoiceIds(prev => {
                const copy = { ...prev };
                delete copy[order.id];
                return copy;
            });
        }
    };

    return (
        <div className="admin-card">
            <div className="admin-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        <span className="tab-label">{tab}</span>
                        {tabCounts[tab] > 0 && (
                            <span className="tab-badge" aria-hidden>{tabCounts[tab]}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="admin-tab-content">
                {isLoading ? (
                    <div className="order-card-grid order-card-vertical">
                        {Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)}
                    </div>
                ) : filteredOrders.length > 0 ? (
                    <div className="order-card-grid order-card-vertical">
                        {filteredOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onContact={handleOpenMessageModal}
                                onOpenPaymentModal={handleOpenPaymentModal}
                                onViewDetails={handleOpenDetailModal}
                                onComplete={handleRequestComplete}
                                onCancel={handleRequestCancel}
                                onGenerateInvoice={handleGenerateInvoice}
                                isGeneratingInvoice={!!loadingInvoiceIds[order.id]}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="no-results" style={{ padding: '2rem 0' }}>
                        <p>Tidak ada pesanan di tahap ini.</p>
                    </div>
                )}
            </div>
            
            {isMessageModalOpen && orderToContact && (
                <MessageModal 
                    isOpen={isMessageModalOpen}
                    onClose={() => setIsMessageModalOpen(false)}
                    onSend={handleSendMessage}
                    initialMessage={messageContent}
                    title={`Kirim Pesan ke ${orderToContact.customerName}`}
                />
            )}

            {isPaymentModalOpen && selectedOrder && (
                <PaymentConfirmationModal
                    order={selectedOrder}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onConfirm={handleConfirmPaymentSubmit}
                />
            )}
            
            {isDetailModalOpen && selectedOrder && (
                <OrderDetailModal 
                    order={selectedOrder}
                    onClose={() => setIsDetailModalOpen(false)}
                    onUpdateDepartureDate={handleUpdateDateAndCloseModal}
                    onUpdateParticipants={onUpdateParticipants}
                    minParticipants={destinations.find(d => d.id === selectedOrder.destinationId)?.minPeople ?? 1}
                />
            )}

            {orderToConfirmAction && confirmationConfig && (
                <ConfirmationModal
                    isOpen={!!orderToConfirmAction}
                    onClose={handleCloseConfirmation}
                    onConfirm={handleConfirmAction}
                    title={confirmationConfig.title}
                    confirmButtonText={confirmationConfig.confirmText}
                    confirmButtonVariant={confirmationConfig.variant}
                >
                    {confirmationConfig.message}
                </ConfirmationModal>
            )}
        </div>
    );
};