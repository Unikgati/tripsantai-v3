import React, { useState } from 'react';
import { useToast } from '../../components/Toast';
import { Order } from '../../types';
import { XIcon, EditIcon } from '../Icons';

interface OrderDetailModalProps {
    order: Order;
    onClose: () => void;
    onUpdateDepartureDate: (orderId: number, date: string) => void;
    onUpdateParticipants?: (orderId: number, participants: number) => void;
    minParticipants?: number;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onUpdateDepartureDate, onUpdateParticipants, minParticipants }) => {
    const { showToast } = useToast();
    const [localOrder, setLocalOrder] = useState(order);
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [editableDate, setEditableDate] = useState(order.departureDate || '');

    // Only allow editing the departure date when the order is not finalized or cancelled
    const DATE_EDITABLE_STATUSES: Array<typeof order.status> = ['Baru', 'Menunggu Pembayaran', 'Siap Jalan'];
    const PARTICIPANTS_EDITABLE_STATUSES: Array<typeof order.status> = ['Baru', 'Menunggu Pembayaran', 'Siap Jalan'];
    const [isEditingParticipants, setIsEditingParticipants] = useState(false);
    const effectiveMin = typeof minParticipants === 'number' && minParticipants > 0 ? minParticipants : 1;
    const [editableParticipants, setEditableParticipants] = useState<number>(Math.max(order.participants || 1, effectiveMin));

    // Keep localOrder in sync if parent order changes (e.g. after close/reopen)
    React.useEffect(() => { setLocalOrder(order); }, [order]);

    const handleParticipantsSave = () => {
        if (!PARTICIPANTS_EDITABLE_STATUSES.includes(localOrder.status)) return;
        if (editableParticipants < effectiveMin) {
            showToast(`Jumlah peserta minimal untuk paket ini adalah ${effectiveMin} orang.`, 'error');
            return;
        }
        if (onUpdateParticipants) {
            try {
                const result = onUpdateParticipants(localOrder.id, editableParticipants);
                if (result && typeof (result as any).then === 'function') {
                    (result as any).then((updated: any) => {
                        if (updated) setLocalOrder(updated);
                        setIsEditingParticipants(false);
                        }).catch((err: any) => {
                        console.warn('Failed to save participants', err);
                        showToast('Gagal menyimpan jumlah peserta. Cek koneksi atau lihat console.', 'error');
                    });
                } else {
                    setIsEditingParticipants(false);
                }
            } catch (err) {
                console.warn('onUpdateParticipants threw', err);
                showToast('Gagal menyimpan jumlah peserta.', 'error');
            }
        } else {
            setIsEditingParticipants(false);
        }
    };

    const handleDateSave = () => {
    if (!DATE_EDITABLE_STATUSES.includes(order.status)) return;
    onUpdateDepartureDate(order.id, editableDate);
    setIsEditingDate(false);
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };
    
    const formatDepartureDate = (dateString: string | undefined) => {
        if (!dateString) return 'Belum diatur';
        // Add time to avoid timezone issues
        return new Date(dateString + 'T00:00:00').toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    const totalPaid = localOrder.paymentHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const remainingBalance = localOrder.totalPrice - totalPaid;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content order-detail-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Detail Pesanan #{order.id.toString().slice(-6)}</h2>
                    <button onClick={onClose} className="modal-close-btn" aria-label="Tutup">
                        <XIcon />
                    </button>
                </div>
                <div className="modal-body">
                    <section className="detail-section">
                        <h4>Informasi Pelanggan</h4>
                        <div className="detail-grid">
                            <div className="detail-grid-item">
                                <span>Nama</span>
                                <strong>{order.customerName}</strong>
                            </div>
                             <div className="detail-grid-item">
                                <span>No. WhatsApp</span>
                                <strong>{order.customerPhone}</strong>
                            </div>
                        </div>
                    </section>
                    
                     <section className="detail-section">
                        <h4>Ringkasan Pesanan</h4>
                        <div className="detail-grid">
                            <div className="detail-grid-item">
                                <span>Destinasi</span>
                                <strong>{localOrder.destinationTitle}</strong>
                            </div>
                             <div className="detail-grid-item">
                                <span>Jumlah Peserta</span>
                                {!isEditingParticipants ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <strong>{localOrder.participants} orang</strong>
                                        {PARTICIPANTS_EDITABLE_STATUSES.includes(localOrder.status) && (
                                            <button className="btn-icon" onClick={() => { setEditableParticipants(localOrder.participants || 1); setIsEditingParticipants(true); }} title="Ubah jumlah peserta">
                                                <EditIcon />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                        <input type="number" min={effectiveMin} value={editableParticipants} onChange={(e) => setEditableParticipants(Number(e.target.value))} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', width: '100px' }} />
                                        <button className="btn btn-primary btn-small" onClick={handleParticipantsSave}>Simpan</button>
                                        <button className="btn btn-secondary btn-small" onClick={() => setIsEditingParticipants(false)}>Batal</button>
                                    </div>
                                )}
                            </div>
                             <div className="detail-grid-item">
                                <span>Tanggal Pesan</span>
                                <strong>{formatDate(localOrder.orderDate)}</strong>
                            </div>
                             <div className="detail-grid-item">
                                <span>Status Pesanan</span>
                                <strong>{localOrder.status}</strong>
                            </div>
                             <div className="detail-grid-item" style={{ gridColumn: 'span 2' }}>
                                <span>Tanggal Keberangkatan</span>
                                {!isEditingDate ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <strong>{formatDepartureDate(localOrder.departureDate)}</strong>
                                        {DATE_EDITABLE_STATUSES.includes(localOrder.status) && (
                                            <button className="btn-icon" onClick={() => setIsEditingDate(true)} title="Ubah tanggal">
                                                <EditIcon />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                        <input 
                                            type="date"
                                            value={editableDate}
                                            onChange={(e) => setEditableDate(e.target.value)}
                                            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)'}}
                                        />
                                        <button className="btn btn-primary btn-small" onClick={handleDateSave}>Simpan</button>
                                        <button className="btn btn-secondary btn-small" onClick={() => setIsEditingDate(false)}>Batal</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="detail-section financial-summary">
                        <h4>Ringkasan Keuangan</h4>
                        <div className="detail-grid">
                            <div className="detail-grid-item total-price">
                                <span>Total Tagihan</span>
                                <strong>{formatCurrency(localOrder.totalPrice)}</strong>
                            </div>
                             <div className="detail-grid-item">
                                <span>Total Dibayar</span>
                                <strong>{formatCurrency(totalPaid)}</strong>
                            </div>
                            <div className={`detail-grid-item ${remainingBalance > 0 ? 'balance-due' : ''}`}>
                                <span>Sisa Tagihan</span>
                                <strong>{formatCurrency(remainingBalance)}</strong>
                            </div>
                             <div className="detail-grid-item">
                                <span>Status Pembayaran</span>
                                <strong>{localOrder.paymentStatus || '-'}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="detail-section">
                        <h4>Riwayat Pembayaran</h4>
                        {localOrder.paymentHistory && localOrder.paymentHistory.length > 0 ? (
                             <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Catatan</th>
                                        <th className="amount">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {localOrder.paymentHistory.map((p, index) => (
                                        <tr key={index}>
                                            <td>{formatDate(p.date)}</td>
                                            <td>{p.notes || '-'}</td>
                                            <td className="amount">{formatCurrency(p.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>Belum ada riwayat pembayaran.</p>
                        )}
                    </section>

                </div>
                 <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>Tutup</button>
                </div>
            </div>
        </div>
    );
};