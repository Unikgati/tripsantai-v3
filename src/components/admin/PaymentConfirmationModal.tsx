import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { XIcon } from '../Icons';

interface PaymentConfirmationModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (paymentDetails: { paymentStatus: 'DP' | 'Lunas', paymentAmount: number, notes: string }) => void;
}

export const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({ order, onClose, onConfirm }) => {
    const totalPaid = order.paymentHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const remainingBalance = order.totalPrice - totalPaid;

    const [paymentStatus, setPaymentStatus] = useState<'DP' | 'Lunas'>(remainingBalance <= 0 ? 'Lunas' : 'DP');
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
    const [displayAmount, setDisplayAmount] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    
    const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

    useEffect(() => {
        if (paymentStatus === 'Lunas') {
            const amount = remainingBalance > 0 ? remainingBalance : '';
            setPaymentAmount(amount);
            setDisplayAmount(amount === '' ? '' : formatNumber(amount));
        } else {
            setPaymentAmount('');
            setDisplayAmount('');
        }
        if (error) setError('');
    }, [paymentStatus, remainingBalance]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }
    
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const numberString = value.replace(/[^0-9]/g, '');
        const numberValue = numberString === '' ? '' : parseInt(numberString, 10);

        setPaymentAmount(numberValue);
        setDisplayAmount(numberValue === '' ? '' : formatNumber(numberValue));
        
        if (error) setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericPaymentAmount = Number(paymentAmount);

        if (paymentAmount === '' || numericPaymentAmount <= 0) {
            setError('Jumlah dibayar harus diisi dan lebih dari 0.');
            return;
        }

        if (numericPaymentAmount > remainingBalance) {
            setError(`Jumlah pembayaran tidak boleh melebihi sisa tagihan (${formatCurrency(remainingBalance)}).`);
            return;
        }
        
        const finalPaymentStatus = (totalPaid + numericPaymentAmount) >= order.totalPrice ? 'Lunas' : 'DP';

        onConfirm({
            paymentStatus: finalPaymentStatus,
            paymentAmount: numericPaymentAmount,
            notes
        });
    };
    
    const formattedTotalPrice = formatCurrency(order.totalPrice);
    const formattedRemainingBalance = formatCurrency(remainingBalance);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Konfirmasi Pembayaran</h2>
                    <button onClick={onClose} className="modal-close-btn" aria-label="Tutup">
                        <XIcon />
                    </button>
                </div>
                <div className="modal-body">
                    <p style={{marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>
                        Pesanan a.n. <strong>{order.customerName}</strong><br/>
                        Total Tagihan: <strong style={{color: 'var(--accent)', fontSize: '1.2em'}}>{formattedTotalPrice}</strong><br/>
                        {totalPaid > 0 && (
                            <span style={{color: '#e53e3e'}}>Sisa Tagihan Saat Ini: <strong>{formattedRemainingBalance}</strong></span>
                        )}
                    </p>
                    <form className="payment-form" onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label>Status Pembayaran</label>
                            <div className="segmented-control">
                                <button type="button" onClick={() => setPaymentStatus('DP')} className={paymentStatus === 'DP' ? 'active' : ''}>
                                    Cicilan / DP
                                </button>
                                <button type="button" onClick={() => setPaymentStatus('Lunas')} className={paymentStatus === 'Lunas' ? 'active' : ''}>
                                    Pelunasan
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="paymentAmount">Jumlah Dibayar (IDR)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                id="paymentAmount"
                                value={displayAmount}
                                onChange={handleAmountChange}
                                placeholder="cth: 500000"
                                required
                            />
                            {error && <p className="validation-error">{error}</p>}
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="notes">Catatan (Opsional)</label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="cth: Pembayaran cicilan ke-2"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
                            <button type="submit" className="btn btn-primary">Simpan</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};