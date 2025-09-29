import React, { useState } from 'react';
import { insertReview } from '../lib/supabase';
import ReviewCard from '../components/ReviewCard';
import { useToast } from '../components/Toast';

const ReviewsPage: React.FC = () => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const initialsFrom = (full: string) => {
    if (!full) return '';
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // static quick templates (Opsi A)
  const templates = [
    'Liburan keluarga yang menyenangkan — pelayanan ramah, fasilitas lengkap.',
    'Destinasi sangat bersih dan aman. Pemandu sangat membantu.',
    'Harga sebanding dengan pengalaman — sangat direkomendasikan!'
  ];

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const applyTemplate = (t: string) => {
    // trim to max 120 and warn if truncated
    const trimmed = t.slice(0, 120);
    if (t.length > 120) {
      setError('Template dipotong karena melebihi batas 120 karakter');
    } else {
      setError(null);
    }
    setContent(trimmed);
    // focus textarea so user can edit
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !content.trim()) { setError('Nama dan review tidak boleh kosong'); return; }
    setIsSubmitting(true);
    try {
      const initials = initialsFrom(name);
  await insertReview({ name: name.trim(), initials, content: content.trim(), rating });
      setName(''); setContent('');
      setRating(5);
  setSubmitted(true);
  // show toast success
  try { showToast && showToast('Terima kasih — ulasan Anda telah dikirim', 'success'); } catch {}
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Gagal menyimpan review');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Ulasan Pengunjung</h1>
        <p>Berikan pengalamanmu agar membantu pengunjung lain.</p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div className="container">
          <div className="admin-card reviews-form-card">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="review-name">Nama</label>
              <input
                id="review-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nama Anda"
                aria-label="Nama"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="review-content">Ulasan</label>
              <textarea
                id="review-content"
                value={content}
                onChange={e => setContent(e.target.value)}
                ref={textareaRef}
                placeholder="Tulis review Anda di sini"
                aria-label="Review"
                rows={4}
                maxLength={120}
                required
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {templates.map((t, i) => (
                  <button key={i} type="button" className="btn btn-secondary" onClick={() => applyTemplate(t)} style={{ padding: '6px 10px', borderRadius: 999, fontSize: 13 }} aria-label={`Gunakan template ${i+1}`}>
                    {t.length > 30 ? t.slice(0, 30) + '…' : t}
                  </button>
                ))}
              </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nilai:</div>
                  <div aria-hidden style={{ display: 'flex', gap: 6 }}>
                    { [1,2,3,4,5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i)}
                        className={`btn ${rating >= i ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '6px 8px', borderRadius: 6 }}
                        aria-label={`Rate ${i} stars`}
                      >{i <= rating ? '★' : '☆'}</button>
                    )) }
                  </div>
                </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                {error ? (
                  <div className="validation-error">{error}</div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }} aria-live="polite">{content.length}/120 karakter</div>
                )}
                <div />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Mengirim...' : 'Kirim Ulasan'}</button>
            </div>
          </form>
          </div>
        </div>

        {/* Reviews list removed by request; page shows only the form. */}
        <section style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: '1rem' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Terima kasih! Ulasan Anda telah dikirim dan akan muncul setelah moderasi.</div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default ReviewsPage;
