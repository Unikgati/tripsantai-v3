import React, { useState, useEffect, useRef } from 'react';
import { Destination, PriceTier } from '../types';
import { XIcon } from './Icons';

// Helper function to get price based on participant count
const getPriceForParticipants = (tiers: PriceTier[] | undefined, count: number): number => {
    const safeTiers = Array.isArray(tiers) && tiers.length > 0 ? tiers : [{ minPeople: 1, price: 0 }];
    // Sort tiers by minPeople descending to find the best match
    const sortedTiers = [...safeTiers].sort((a, b) => b.minPeople - a.minPeople);
    const applicableTier = sortedTiers.find(tier => count >= tier.minPeople);
    // Fallback to the lowest price if no tier matches
    return applicableTier ? applicableTier.price : (Math.min(...safeTiers.map(t => t.price)) || 0);
};

// FIX: Define the BookingModalProps interface
interface BookingModalProps {
  destination: Destination;
  onClose: () => void;
  onCreateOrder: (orderData: {
    customerName: string;
    customerPhone: string;
    participants: number;
    destination: Destination;
    departureDate?: string;
    totalPrice: number;
  }) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ destination, onClose, onCreateOrder }) => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [participants, setParticipants] = useState(destination.minPeople);
    const [departureDate, setDepartureDate] = useState('');
    const [errors, setErrors] = useState({ fullName: '', phone: '', participants: '' });
    
    const [perPersonPrice, setPerPersonPrice] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [discount, setDiscount] = useState(0);
    
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const price = getPriceForParticipants(destination.priceTiers, participants);
        const safeTiers = Array.isArray(destination.priceTiers) && destination.priceTiers.length > 0 ? destination.priceTiers : [{ price: 0 }];
        const maxPrice = Math.max(...safeTiers.map(t => t.price));

        setPerPersonPrice(price);
        setTotalPrice(price * participants);
        
        if (price < maxPrice && maxPrice > 0) {
            const calculatedDiscount = Math.round(((maxPrice - price) / maxPrice) * 100);
            setDiscount(calculatedDiscount);
        } else {
            setDiscount(0);
        }

    }, [participants, destination.priceTiers]);
    
    // Close calendar on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const validate = () => {
        const newErrors = { fullName: '', phone: '', participants: '' };
        let isValid = true;

        if (!fullName.trim()) {
            newErrors.fullName = 'Nama lengkap tidak boleh kosong.';
            isValid = false;
        }

        if (!phone.trim()) {
            newErrors.phone = 'Nomor WhatsApp tidak boleh kosong.';
            isValid = false;
        }

        if (participants < destination.minPeople) {
            newErrors.participants = `Minimal peserta untuk paket ini adalah ${destination.minPeople} orang.`;
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onCreateOrder({
                customerName: fullName,
                customerPhone: phone,
                participants: participants,
                destination: destination,
                departureDate: departureDate || undefined,
                totalPrice: totalPrice,
            });
            setIsSubmitted(true);
        }
    };
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    
    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00'); // Ensure correct date parsing
        return date.toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    // Calendar Component
    const Calendar = () => {
        const [currentDate, setCurrentDate] = useState(departureDate ? new Date(departureDate + 'T00:00:00') : new Date());
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const handlePrevMonth = () => {
            setCurrentDate(new Date(year, month - 1, 1));
        };

        const handleNextMonth = () => {
            setCurrentDate(new Date(year, month + 1, 1));
        };
        
        const handleDateSelect = (day: number) => {
            const selected = new Date(year, month, day);
            setDepartureDate(selected.toISOString().split('T')[0]);
            setIsCalendarOpen(false);
        };

        const days = [];
        for (let i = 0; i < startingDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            date.setHours(0,0,0,0);
            const isSelected = departureDate === date.toISOString().split('T')[0];
            const isToday = date.getTime() === today.getTime();
            const isDisabled = date < today;

            days.push(
                <button
                    key={i}
                    type="button"
                    className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => handleDateSelect(i)}
                    disabled={isDisabled}
                >
                    {i}
                </button>
            );
        }

        return (
            <div className="calendar-container">
                <div className="calendar-header">
                    <button type="button" onClick={handlePrevMonth}>&lt;</button>
                    <span>{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(currentDate)}</span>
                    <button type="button" onClick={handleNextMonth}>&gt;</button>
                </div>
                <div className="calendar-weekdays">
                    {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, index) => <div key={`${d}-${index}`}>{d}</div>)}
                </div>
                <div className="calendar-grid">{days}</div>
                 <div className="calendar-footer">
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => { setDepartureDate(''); setIsCalendarOpen(false); }}>
                        Hapus Tanggal
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {!isSubmitted && (
                    <div className="modal-header">
                        <h2>Formulir Pemesanan</h2>
                        <button onClick={onClose} className="modal-close-btn" aria-label="Tutup">
                            <XIcon />
                        </button>
                    </div>
                )}
                <div className="modal-body">
                    {isSubmitted ? (
                        <div className="success-message">
                            <h3>Terima Kasih!</h3>
                            <p>Pesanan Anda untuk paket <strong>{destination.title}</strong> telah kami terima. Tim kami akan segera menghubungi Anda melalui WhatsApp untuk konfirmasi lebih lanjut.</p>
                            <button className="btn btn-primary" onClick={onClose}>Tutup</button>
                        </div>
                    ) : (
                        <>
                            <p>Anda akan memesan paket wisata ke <strong>{destination.title}</strong>.</p>
                            <form className="booking-form" onSubmit={handleSubmit} noValidate>
                                <div className="form-group">
                                    <label htmlFor="fullName">Nama Lengkap</label>
                                    <input 
                                        type="text" 
                                        id="fullName" 
                                        name="fullName" 
                                        value={fullName}
                                        onChange={(e) => {
                                            setFullName(e.target.value);
                                            if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                                        }}
                                        required 
                                    />
                                    {errors.fullName && <p className="validation-error">{errors.fullName}</p>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="phone">Nomor WhatsApp</label>
                                    <input 
                                        type="tel" 
                                        id="phone" 
                                        name="phone" 
                                        value={phone}
                                        onChange={(e) => {
                                            setPhone(e.target.value);
                                            if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                        }}
                                        required 
                                    />
                                     {errors.phone && <p className="validation-error">{errors.phone}</p>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="participants">Jumlah Peserta</label>
                                    <input 
                                        type="number" 
                                        id="participants" 
                                        name="participants" 
                                        min={destination.minPeople}
                                        value={participants}
                                        onChange={(e) => {
                                            const num = Number(e.target.value);
                                            if (num > 0) {
                                                setParticipants(num);
                                                if (errors.participants) setErrors(prev => ({ ...prev, participants: '' }));
                                            }
                                        }}
                                        required 
                                    />
                                    {errors.participants && <p className="validation-error">{errors.participants}</p>}
                                </div>
                                <div className="form-group" ref={calendarRef}>
                                    <label htmlFor="departureDate">Tanggal Keberangkatan (Opsional)</label>
                                    <button
                                        type="button"
                                        id="departureDate"
                                        className="date-picker-input"
                                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                    >
                                        {departureDate ? formatDisplayDate(departureDate) : "Pilih Tanggal"}
                                    </button>
                                    {isCalendarOpen && <Calendar />}
                                </div>
                                
                                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', border: '1px solid var(--border-color)'}}>
                                    <h4 style={{marginTop: 0, marginBottom: '0.5rem'}}>Estimasi Biaya</h4>
                                    <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>Harga per orang: <strong>{formatCurrency(perPersonPrice)}</strong></p>
                                    <div className="price-display-container">
                                        <span className="total-label">Total:</span>
                                        <span className="final-price">{formatCurrency(totalPrice)}</span>
                                        {discount > 0 && <span className="discount-badge">Diskon {discount}%</span>}
                                    </div>
                                </div>
                                
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary btn-large">Konfirmasi</button>

                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};