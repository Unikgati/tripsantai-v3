import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Destination } from '../types';
import DatePicker from '../components/DatePicker';
import SuccessModal from '../components/SuccessModal';
import DOMPurify from 'dompurify';

interface OrderPageProps {
  destinations: Destination[];
  onCreateOrder: (orderData: { customerName: string; customerPhone: string; participants: number; destination: Destination; departureDate?: string; totalPrice: number; }) => void;
}

const getPriceForParticipants = (tiers: any[] | undefined, count: number) => {
  const safeTiers = Array.isArray(tiers) && tiers.length > 0 ? tiers : [{ minPeople: 1, price: 0 }];
  const sortedTiers = [...safeTiers].sort((a, b) => (b.minPeople || 0) - (a.minPeople || 0));
  const applicable = sortedTiers.find(t => count >= (t.minPeople || 1));
  return applicable ? applicable.price : (Math.min(...safeTiers.map(t => t.price)) || 0);
};

export const OrderPage: React.FC<OrderPageProps> = ({ destinations, onCreateOrder }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location && (location as any).state) || {};
  const initialDest: Destination | null = state.destination || null;

  const [destination, setDestination] = useState<Destination | null>(initialDest);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [participants, setParticipants] = useState<number>(destination?.minPeople ?? 1);
  const [departureDate, setDepartureDate] = useState('');
  const [errors, setErrors] = useState({ fullName: '', phone: '', participants: '' });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [perPersonPrice, setPerPersonPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (!destination && destinations && (location.search || '').includes('dest=')) {
      const params = new URLSearchParams(location.search);
      const slug = params.get('dest') || '';
      const found = destinations.find(d => d.slug === slug || String(d.id) === slug) || null;
      if (found) setDestination(found);
    }
  }, [destination, destinations, location.search]);

  useEffect(() => {
    if (!destination) return;
    setParticipants(destination.minPeople || 1);
  }, [destination]);

  // Ensure page is scrolled to top when this page mounts (fix navigation landing position)
  useEffect(() => {
    try { window.scrollTo(0, 0); } catch (e) {}
  }, []);

  useEffect(() => {
    if (!destination) return;
    const price = getPriceForParticipants(destination.priceTiers, participants);
    const safeTiers = Array.isArray(destination.priceTiers) && destination.priceTiers.length > 0 ? destination.priceTiers : [{ price: 0 }];
    const maxPrice = Math.max(...safeTiers.map(t => t.price));
    setPerPersonPrice(price);
    setTotalPrice(price * participants);
    if (price < maxPrice && maxPrice > 0) {
      setDiscount(Math.round(((maxPrice - price) / maxPrice) * 100));
    } else setDiscount(0);
  }, [participants, destination]);

  const validate = () => {
    const newErrors = { fullName: '', phone: '', participants: '' };
    let valid = true;
    if (!fullName.trim()) { newErrors.fullName = 'Nama lengkap tidak boleh kosong.'; valid = false; }
    if (!phone.trim()) { newErrors.phone = 'Nomor WhatsApp tidak boleh kosong.'; valid = false; }
    if (destination && participants < (destination.minPeople || 1)) { newErrors.participants = `Minimal peserta adalah ${destination.minPeople}`; valid = false; }
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;
    if (!validate()) return;
    setSubmitError(null);
    setIsSending(true);
    try {
      const result = await onCreateOrder({ customerName: fullName, customerPhone: phone, participants, destination, departureDate: departureDate || undefined, totalPrice });
      // success
      setIsSubmitted(true);
    } catch (err: any) {
      console.warn('Order create failed', err);
      setSubmitError(err?.message || 'Gagal membuat pesanan. Silakan coba lagi.');
    } finally {
      setIsSending(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="page-container order-page">
        <div className="container">
  {/* header removed per request: no 'Formulir Pemesanan' title */}

        {!destination ? (
          <div className="no-selection">
            <p>Anda belum memilih destinasi. Pilih destinasi terlebih dahulu atau cari di daftar destinasi.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => navigate('/destinations')}>Jelajahi Destinasi</button>
              <button className="btn" onClick={() => navigate(-1)}>Kembali</button>
            </div>
          </div>
        ) : (
          <div className="order-form-layout">
            {isSubmitted ? (
              <SuccessModal
                title="Berhasil"
                message={<p>Pesanan Anda untuk paket <strong>{destination.title}</strong> telah kami terima. Kami akan menghubungi Anda via WhatsApp.</p>}
                primaryLabel="Kembali ke Beranda"
                onClose={() => { setIsSubmitted(false); navigate('/'); }}
              />
            ) : submitError ? (
              <SuccessModal
                title="Gagal"
                variant="error"
                message={<p>{submitError}</p>}
                primaryLabel="Tutup"
                onClose={() => setSubmitError(null)}
              />
            ) : (
              <form className="booking-form" onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom: '1rem' }}>
                  <h2>{destination.title}</h2>
                  <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(destination.shortDescription || '') }} />
                </div>
                <div className="form-group">
                  <label>Nama Lengkap</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} />
                  {errors.fullName && <p className="validation-error">{errors.fullName}</p>}
                </div>
                <div className="form-group">
                  <label>Nomor WhatsApp</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} />
                  {errors.phone && <p className="validation-error">{errors.phone}</p>}
                </div>
                <div className="form-group">
                  <label>Jumlah Peserta</label>
                  <input type="number" min={destination.minPeople} value={participants} onChange={e => setParticipants(Number(e.target.value))} />
                  {errors.participants && <p className="validation-error">{errors.participants}</p>}
                </div>
                <div className="form-group">
                  <label>Tanggal Keberangkatan (opsional)</label>
                  <DatePicker value={departureDate} onChange={(iso) => setDepartureDate(iso)} minDate={new Date().toISOString().split('T')[0]} />
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                  <h4 style={{ marginTop: 0 }}>Estimasi Biaya</h4>
                  <p>Harga per orang: <strong>{formatCurrency(perPersonPrice)}</strong></p>
                  <div className="price-display-container">
                    <span className="total-label">Total:</span>
                    <span className="final-price">{formatCurrency(totalPrice)}</span>
                    {discount > 0 && <span className="discount-badge">Diskon {discount}%</span>}
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary btn-large" disabled={isSending}>
                    {isSending ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><span className="spinner" /> Mengirim...</span> : 'Konfirmasi'}
                  </button>
                  <button type="button" className="btn" onClick={() => navigate(-1)} disabled={isSending} style={{ background: '#e53e3e', color: '#fff', border: 'none' }}>Batal</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderPage;
