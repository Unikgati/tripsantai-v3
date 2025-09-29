import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { AppSettings, HeroSlide } from '../../types';
import { UploadCloudIcon, XIcon, EditIcon, ChevronDownIcon, ChevronUpIcon, SpinnerIcon } from '../../components/Icons';
import uploadToCloudinary from '../../lib/cloudinary';
import getSupabaseClient, { fetchAppSettings } from '../../lib/supabase';
import { ConfirmationModal } from '../../components/ConfirmationModal';


interface AdminSettingsPageProps {
    appSettings: AppSettings;
    onSaveSettings: (settings: AppSettings) => void;
}

const HeroSlideEditor: React.FC<{
    slides: HeroSlide[];
    onSlidesChange: (slides: HeroSlide[]) => void;
    // parent-managed pending files keyed by `heroSlide:<id>`
    onSetPendingSlideFile: (slideId: number, file: File | null) => void;
    onSlideDelete?: (slideId: number) => void;
    uploadProgress: Record<string, number>;
}> = ({ slides, onSlidesChange, onSetPendingSlideFile, onSlideDelete, uploadProgress }) => {
    const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(0);
    const [slideToDelete, setSlideToDelete] = useState<number | null>(null); // Index of the slide to delete

    const toggleSlide = (index: number) => {
        setActiveSlideIndex(prevIndex => (prevIndex === index ? null : index));
    };

    const handleSlideChange = (index: number, field: 'title' | 'subtitle', value: string) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        onSlidesChange(newSlides);
    };

    // Register a selected file as "pending" and show a local preview (no upload here).
    const handleSlideFileSelect = (index: number, file: File) => {
        const objectUrl = URL.createObjectURL(file);
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], imageUrl: objectUrl };
        onSlidesChange(newSlides);
        // inform parent to keep the File and mark progress as pending
        onSetPendingSlideFile(newSlides[index].id, file);
    };

    const addSlide = () => {
        const newSlide: HeroSlide = {
            id: Date.now(),
            title: 'Judul Baru',
            subtitle: 'Subjudul baru yang menarik.',
            imageUrl: ''
        };
        const newSlides = [...slides, newSlide];
        onSlidesChange(newSlides);
        setActiveSlideIndex(newSlides.length - 1); // Open the new slide
    };

    const handleDeleteRequest = (index: number) => {
        setSlideToDelete(index);
    };

    const handleConfirmDelete = () => {
        if (slideToDelete === null) return;

        const newSlides = slides.filter((_, index) => index !== slideToDelete);
        onSlidesChange(newSlides);

        if (activeSlideIndex === slideToDelete) {
            setActiveSlideIndex(null);
        }
        setSlideToDelete(null); // Close modal
    };

    return (
        <>
            <div className="itinerary-editor" style={{padding: 0, border: 'none', background: 'transparent'}}>
                {slides.map((slide, index) => {
                    const isOpen = activeSlideIndex === index;
                    return (
                        <div key={slide.id} className="itinerary-editor-item">
                            <div 
                                className="itinerary-editor-header"
                                onClick={() => toggleSlide(index)}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, minWidth: 0 }}>
                                    {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                    <h4 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        Slide {index + 1}: {slide.title}
                                    </h4>
                                </div>
                                <button 
                                    type="button" 
                                    className="btn btn-danger btn-small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRequest(index);
                                    }}
                                >
                                    Hapus
                                </button>
                            </div>
                            {isOpen && (
                                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '0.75rem' }}>
                                    <div className="form-group">
                                        <label htmlFor={`slide-title-${index}`}>Judul</label>
                                        <input
                                            type="text"
                                            id={`slide-title-${index}`}
                                            className="setting-input"
                                            value={slide.title}
                                            onChange={(e) => handleSlideChange(index, 'title', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor={`slide-subtitle-${index}`}>Subjudul</label>
                                        <input
                                            type="text"
                                            id={`slide-subtitle-${index}`}
                                            className="setting-input"
                                            value={slide.subtitle}
                                            onChange={(e) => handleSlideChange(index, 'subtitle', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Gambar Latar</label>
                                        <div className="image-upload-grid" style={{ gridTemplateColumns: 'minmax(150px, 250px)' }}>
                                            {slide.imageUrl ? (
                                                <div className="image-preview-item">
                                                    <img src={slide.imageUrl} alt={`Preview Slide ${index + 1}`} />
                                                    <div className="image-actions" style={{ opacity: 1, gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            className="image-action-btn"
                                                            title="Ganti Gambar"
                                                            onClick={() => document.getElementById(`slide-image-input-${index}`)?.click()}
                                                        >
                                                            <EditIcon />
                                                        </button>
                                                        {(() => {
                                                            const key = `heroSlide:${slide.id}`;
                                                            const val = uploadProgress[key];
                                                                return val !== undefined ? (
                                                                <div className="upload-progress" style={{ alignSelf: 'center' }}>
                                                                    {val < 0 ? null : `Mengunggah ${val}%`}
                                                                </div>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="upload-placeholder"
                                                    onClick={() => document.getElementById(`slide-image-input-${index}`)?.click()}
                                                >
                                                    <UploadCloudIcon />
                                                    <span>Unggah Gambar</span>
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            id={`slide-image-input-${index}`}
                                            className="hidden-file-input"
                                            accept="image/*"
                                            onChange={(e) => e.target.files && e.target.files[0] && handleSlideFileSelect(index, e.target.files[0])}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
                <button type="button" className="btn btn-secondary" onClick={addSlide} style={{alignSelf: 'flex-start'}}>Tambah Slide Baru</button>
            </div>
            {slideToDelete !== null && (
                <ConfirmationModal
                    isOpen={slideToDelete !== null}
                    onClose={() => setSlideToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Konfirmasi Penghapusan"
                    confirmButtonText="Hapus"
                    confirmButtonVariant="danger"
                >
                    <p>Apakah Anda yakin ingin menghapus <strong>Slide {slideToDelete + 1}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
                </ConfirmationModal>
            )}
        </>
    );
};


export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ appSettings, onSaveSettings }) => {
    const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings);
    const { showToast } = useToast();
    // Keep localSettings in sync when parent provides updated appSettings (e.g., loaded from Supabase)
    useEffect(() => {
        setLocalSettings(appSettings);
    }, [appSettings]);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    // Track files selected but not yet uploaded (deferred until Save)
    const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>({});
    // Track public_ids for images that existed before edit so we can request deletion later
    const [removedPublicIds, setRemovedPublicIds] = useState<string[]>([]);
    
    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => ({ ...prev, [name]: value }));
    };

    // Helper to derive Cloudinary public_id from a delivered URL (returns null if cannot derive)
    const derivePublicIdFromUrl = (url: string | undefined | null) => {
        if (!url) return null;
        try {
            const u = new URL(url);
            const parts = u.pathname.split('/');
            const uploadIndex = parts.findIndex(p => p === 'upload');
            if (uploadIndex === -1) return null;
            const remainder = parts.slice(uploadIndex + 1).join('/');
            if (!remainder) return null;
            const withoutVersion = remainder.replace(/^v\d+\//, '');
            const publicIdWithPath = withoutVersion.replace(/\.[^/.]+$/, '');
            return publicIdWithPath || null;
        } catch (e) {
            return null;
        }
    };

    // Deferred upload: only store selected file and preview; perform real upload on Save
    const handleImageUpload = (file: File, key: keyof AppSettings) => {
        // Show immediate preview as data URL
        const reader = new FileReader();
        reader.onloadend = () => {
            setLocalSettings(prev => ({ ...prev, [key]: reader.result as string }));
            setUploadProgress(p => ({ ...p, [String(key)]: -2 })); // -2 = pending
        };
        reader.readAsDataURL(file);

        // Track pending file for upload on Save
        setPendingFiles(p => ({ ...p, [String(key)]: file }));

        // If there was an existing image URL, try to derive its Cloudinary public_id and mark for removal
        const deriveFromUrl = (url: string | undefined | null) => {
            if (!url) return null;
            try {
                const u = new URL(url);
                const parts = u.pathname.split('/');
                const uploadIndex = parts.findIndex(p => p === 'upload');
                if (uploadIndex === -1) return null;
                const remainder = parts.slice(uploadIndex + 1).join('/');
                if (!remainder) return null;
                const withoutVersion = remainder.replace(/^v\d+\//, '');
                const publicIdWithPath = withoutVersion.replace(/\.[^/.]+$/, '');
                return publicIdWithPath || null;
            } catch (e) {
                return null;
            }
        };
        const prevUrl = (localSettings as any)[String(key)];
        const prevPid = derivePublicIdFromUrl(prevUrl);
        if (prevPid) {
            setRemovedPublicIds(prev => prev.includes(prevPid as string) ? prev : [...prev, prevPid as string]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof AppSettings) => {
        if (e.target.files && e.target.files[0]) {
            handleImageUpload(e.target.files[0], key);
        }
    };

    // Called by HeroSlideEditor when a slide file is selected/cleared
    const handleSetPendingSlideFile = (slideId: number, file: File | null) => {
        const key = `heroSlide:${slideId}`;
        if (file) {
            // If there was an existing image URL for this slide, try to derive its Cloudinary public_id and mark for removal
            const slide = (localSettings.heroSlides || []).find(s => s.id === slideId);
            if (slide && slide.imageUrl) {
                const pid = derivePublicIdFromUrl(slide.imageUrl);
                if (pid) setRemovedPublicIds(prev => prev.includes(pid as string) ? prev : [...prev, pid as string]);
            }
            setPendingFiles(p => ({ ...p, [key]: file }));
            setUploadProgress(p => ({ ...p, [key]: -2 }));
        } else {
            setPendingFiles(p => { const copy = { ...p }; delete copy[key]; return copy; });
            setUploadProgress(p => { const copy = { ...p }; delete copy[key]; return copy; });
        }
    };

    // Called when the slides array changes. We diff previous slides and new slides to detect deletions
    const handleSlidesChange = (newSlides: HeroSlide[]) => {
        const prevSlides = localSettings.heroSlides || [];
        const removed = prevSlides.filter(ps => !newSlides.find(ns => ns.id === ps.id));
        if (removed.length > 0) {
            const pids = removed.map(r => derivePublicIdFromUrl(r.imageUrl)).filter(Boolean) as string[];
            if (pids.length > 0) {
                setRemovedPublicIds(prev => {
                    const set = new Set(prev.concat(pids));
                    return Array.from(set);
                });
            }
        }
        setLocalSettings(prev => ({ ...prev, heroSlides: newSlides }));
    };
    
    const handleRemoveImage = async (key: keyof AppSettings) => {
        // remove locally
        // derive possible public_id from the current value so server can delete the asset on Save
        const prevUrl = (localSettings as any)[String(key)];
        const prevPid = derivePublicIdFromUrl(prevUrl);
        if (prevPid) {
            setRemovedPublicIds(prev => prev.includes(prevPid as string) ? prev : [...prev, prevPid as string]);
        }

    // update local UI only; actual DB update + Cloudinary deletion will happen when user
    // explicitly presses the Save button (handleSave). This avoids accidental network
    // calls when admin is still editing.
    const updated = { ...localSettings, [key]: '' } as AppSettings;
    setLocalSettings(updated);
    // Inform the admin that change is local and needs explicit save
    showToast('Gambar dihapus secara lokal. Tekan "Simpan Pengaturan" untuk menyimpan perubahan.', 'info');
    };

    const handleSave = async () => {
        setIsSaving(true);

        // Make a local copy of settings to assemble final payload (avoid relying on async setState)
        let finalSettings: AppSettings = { ...localSettings };

        try {
            // Upload any pending files into finalSettings
            const keys = Object.keys(pendingFiles).filter(k => pendingFiles[k]);
            for (const k of keys) {
                const file = pendingFiles[k];
                if (!file) continue;
                setUploadProgress(p => ({ ...p, [k]: 0 }));
                try {
                    const res = await uploadToCloudinary(file, (pct: number) => setUploadProgress(p => ({ ...p, [k]: pct })));
                    const uploadedUrl = typeof res === 'string' ? res : res.url;
                    // If this is a heroSlide key, write uploaded URL into the matching slide by id
                    if (k.startsWith('heroSlide:')) {
                        const idStr = k.split(':')[1];
                        const idNum = Number(idStr);
                        finalSettings.heroSlides = finalSettings.heroSlides.map(s => s.id === idNum ? { ...s, imageUrl: uploadedUrl } : s);
                    } else {
                        // write uploaded URL into the finalSettings object for normal keys
                        (finalSettings as any)[k] = uploadedUrl;
                    }
                } catch (err) {
                    console.warn('[CLOUDINARY] failed to upload pending file for', k, err);
                    showToast('Gagal mengunggah salah satu gambar. Periksa koneksi dan coba lagi.', 'error');
                    setUploadProgress(p => { const copy = { ...p }; delete copy[k]; return copy; });
                    setIsSaving(false);
                    return;
                } finally {
                    setUploadProgress(p => { const copy = { ...p }; delete copy[k]; return copy; });
                }
            }

            // Clear pendingFiles map now that uploads succeeded
            setPendingFiles({});

            // Persist finalSettings to local state so UI reflects canonical values
            setLocalSettings(finalSettings);

            // Attach removed_public_ids so server can cleanup old Cloudinary assets, then call parent save handler
            const payload = { ...finalSettings } as any;
            if (removedPublicIds && removedPublicIds.length > 0) {
                payload.removed_public_ids = Array.from(new Set(removedPublicIds.filter(Boolean)));
            }
            try {
                onSaveSettings(payload);
            } catch (err) {
                console.warn('onSaveSettings threw', err);
            }
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="settings-page-container">
            {/* Branding Settings */}
            <section className="settings-section">
                <h3>Branding</h3>
                <div className="setting-item">
                    <div className="setting-item-label">
                        Nama Brand
                    </div>
                    <div className="setting-item-control">
                        <input 
                            type="text" 
                            name="brandName" 
                            className="setting-input" 
                            value={localSettings.brandName} 
                            onChange={handleSettingChange} 
                        />
                    </div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">
                        Tagline
                    </div>
                    <div className="setting-item-control">
                        <input 
                            type="text" 
                            name="tagline" 
                            className="setting-input" 
                            value={localSettings.tagline} 
                            onChange={handleSettingChange} 
                        />
                    </div>
                </div>
            </section>
            
            {/* Contact & Social Media Settings */}
            <section className="settings-section">
                <h3>Informasi Kontak & Sosial Media</h3>
                <div className="setting-item">
                    <div className="setting-item-label">Email Kontak</div>
                    <div className="setting-item-control"><input type="email" name="email" className="setting-input" value={localSettings.email} onChange={handleSettingChange} /></div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">Alamat</div>
                    <div className="setting-item-control"><input type="text" name="address" className="setting-input" value={localSettings.address} onChange={handleSettingChange} /></div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">Nomor WhatsApp</div>
                    <div className="setting-item-control"><input type="tel" name="whatsappNumber" className="setting-input" value={localSettings.whatsappNumber} onChange={handleSettingChange} placeholder="cth: 6281234567890" /></div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">URL Facebook</div>
                    <div className="setting-item-control"><input type="url" name="facebookUrl" className="setting-input" value={localSettings.facebookUrl} onChange={handleSettingChange} placeholder="https://facebook.com/username" /></div>
                </div>
                <div className="setting-item">
                    <div className="setting-item-label">URL Instagram</div>
                    <div className="setting-item-control"><input type="url" name="instagramUrl" className="setting-input" value={localSettings.instagramUrl} onChange={handleSettingChange} placeholder="https://instagram.com/username" /></div>
                </div>
                 <div className="setting-item">
                    <div className="setting-item-label">URL Twitter (X)</div>
                    <div className="setting-item-control"><input type="url" name="twitterUrl" className="setting-input" value={localSettings.twitterUrl} onChange={handleSettingChange} placeholder="https://x.com/username" /></div>
                </div>
            </section>
            
            {/* Payment Information Settings */}
            <section className="settings-section">
                <h3>Informasi Pembayaran</h3>
                <div className="setting-item">
                    <div className="setting-item-label">Nama Bank</div>
                    <div className="setting-item-control"><input type="text" name="bankName" className="setting-input" value={localSettings.bankName} onChange={handleSettingChange} placeholder="cth: Bank Central Asia" /></div>
                </div>
                 <div className="setting-item">
                    <div className="setting-item-label">Nomor Rekening</div>
                    <div className="setting-item-control"><input type="text" name="bankAccountNumber" className="setting-input" value={localSettings.bankAccountNumber} onChange={handleSettingChange} placeholder="cth: 1234567890" /></div>
                </div>
                 <div className="setting-item">
                    <div className="setting-item-label">Atas Nama</div>
                    <div className="setting-item-control"><input type="text" name="bankAccountHolder" className="setting-input" value={localSettings.bankAccountHolder} onChange={handleSettingChange} placeholder="cth: PT Wisata Indonesia" /></div>
                </div>
            </section>

            {/* Theme Settings */}
            <section className="settings-section">
                <h3>Tema</h3>
                <div className="setting-item">
                    <div className="setting-item-label">
                        Warna Aksen
                    </div>
                    <div className="setting-item-control">
                        <input type="color" name="accentColor" value={localSettings.accentColor} onChange={handleSettingChange} />
                    </div>
                </div>
            </section>
            
            {/* Logo Settings */}
            <section className="settings-section">
                <h3>Logo</h3>
                <div className="setting-item">
                     <div className="setting-item-label">
                        Logo (Mode Terang)
                    </div>
                    <div className="setting-item-control">
                        <div className="image-preview logo-preview">
                            {localSettings.logoLightUrl ? <img src={localSettings.logoLightUrl} alt="Logo Preview" loading="lazy" decoding="async"/> : 'Teks'}
                        </div>
                        <div className="file-upload-wrapper">
                            <button className="btn btn-secondary">Unggah</button>
                            <input type="file" className="file-upload-input" accept="image/*" onChange={(e) => handleFileChange(e, 'logoLightUrl')} />
                            {uploadProgress['logoLightUrl'] !== undefined && (
                                <div className="upload-progress">{uploadProgress['logoLightUrl'] < 0 ? null : `Mengunggah ${uploadProgress['logoLightUrl']}%`}</div>
                            )}
                        </div>
                        {localSettings.logoLightUrl && (
                           <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('logoLightUrl')}>Hapus</button>
                        )}
                    </div>
                </div>
                 <div className="setting-item">
                     <div className="setting-item-label">
                        Logo (Mode Gelap)
                    </div>
                    <div className="setting-item-control">
                        <div className="image-preview logo-preview">
                            {localSettings.logoDarkUrl ? <img src={localSettings.logoDarkUrl} alt="Logo Preview" loading="lazy" decoding="async"/> : 'Teks'}
                        </div>
                        <div className="file-upload-wrapper">
                            <button className="btn btn-secondary">Unggah</button>
                            <input type="file" className="file-upload-input" accept="image/*" onChange={(e) => handleFileChange(e, 'logoDarkUrl')} />
                            {uploadProgress['logoDarkUrl'] !== undefined && (
                                <div className="upload-progress">{uploadProgress['logoDarkUrl'] < 0 ? null : `Mengunggah ${uploadProgress['logoDarkUrl']}%`}</div>
                            )}
                        </div>
                        {localSettings.logoDarkUrl && (
                           <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('logoDarkUrl')}>Hapus</button>
                        )}
                    </div>
                </div>
            </section>
            
            {/* Favicon Settings */}
            <section className="settings-section">
                <h3>Favicon</h3>
                <div className="setting-item">
                    <div className="setting-item-label">
                        Ikon Situs
                    </div>
                    <div className="setting-item-control">
                        <div className="favicon-upload-grid">
                            {/* 16x16 */}
                            <div className="favicon-item">
                                <strong>16x16</strong>
                                <div className="image-preview favicon-preview-16">
                                    {localSettings.favicon16Url && <img src={localSettings.favicon16Url} alt="Favicon 16x16" loading="lazy" decoding="async"/>}
                                </div>
                                <div className="file-upload-wrapper">
                                    <button className="btn btn-secondary btn-small">Pilih</button>
                                    <input type="file" className="file-upload-input" accept="image/png" onChange={(e) => handleFileChange(e, 'favicon16Url')} />
                                    {uploadProgress['favicon16Url'] !== undefined && (
                                        <div className="upload-progress">{uploadProgress['favicon16Url'] < 0 ? null : `Mengunggah ${uploadProgress['favicon16Url']}%`}</div>
                                    )}
                                </div>
                                          {localSettings.favicon16Url && (
                                              <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('favicon16Url')}>Hapus</button>
                                          )}
                            </div>
                            {/* 192x192 */}
                             <div className="favicon-item">
                                <strong>192x192</strong>
                                <div className="image-preview favicon-preview-192">
                                     {localSettings.favicon192Url && <img src={localSettings.favicon192Url} alt="Favicon 192x192" loading="lazy" decoding="async"/>}
                                </div>
                                <div className="file-upload-wrapper">
                                    <button className="btn btn-secondary btn-small">Pilih</button>
                                    <input type="file" className="file-upload-input" accept="image/png" onChange={(e) => handleFileChange(e, 'favicon192Url')} />
                                    {uploadProgress['favicon192Url'] !== undefined && (
                                        <div className="upload-progress">{uploadProgress['favicon192Url'] < 0 ? null : `Mengunggah ${uploadProgress['favicon192Url']}%`}</div>
                                    )}
                                </div>
                                          {localSettings.favicon192Url && (
                                              <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('favicon192Url')}>Hapus</button>
                                          )}
                            </div>
                            {/* 512x512 */}
                            <div className="favicon-item">
                                <strong>512x512</strong>
                                <div className="image-preview favicon-preview-192">
                                     {localSettings.favicon512Url && <img src={localSettings.favicon512Url} alt="Favicon 512x512" loading="lazy" decoding="async"/>}
                                </div>
                                <div className="file-upload-wrapper">
                                    <button className="btn btn-secondary btn-small">Pilih</button>
                                    <input type="file" className="file-upload-input" accept="image/png" onChange={(e) => handleFileChange(e, 'favicon512Url')} />
                                    {uploadProgress['favicon512Url'] !== undefined && (
                                        <div className="upload-progress">{uploadProgress['favicon512Url'] < 0 ? null : `Mengunggah ${uploadProgress['favicon512Url']}%`}</div>
                                    )}
                                </div>
                                          {localSettings.favicon512Url && (
                                              <button className="btn btn-danger btn-small" onClick={() => handleRemoveImage('favicon512Url')}>Hapus</button>
                                          )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Hero Section Settings */}
            <section className="settings-section">
                <h3>Pengaturan Hero Section</h3>
                <HeroSlideEditor
                    slides={localSettings.heroSlides}
                    onSlidesChange={handleSlidesChange}
                    onSetPendingSlideFile={handleSetPendingSlideFile}
                    uploadProgress={uploadProgress}
                />
            </section>

            <section className="settings-section" style={{ background: 'transparent', border: 'none', padding: '1rem 0 0 0', boxShadow: 'none' }}>
                 <div className="form-actions" style={{justifyContent: 'flex-end', marginTop: 0}}>
                    <button type="button" className={`btn btn-primary btn-large ${isSaving ? 'loading' : ''}`} onClick={handleSave} disabled={isSaving}>
                        {isSaving && <SpinnerIcon />}
                        <span>Simpan Pengaturan</span>
                    </button>
                </div>
            </section>
        </div>
    );
};