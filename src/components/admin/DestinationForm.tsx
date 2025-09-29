import React, { useState, useRef } from 'react';
import { useToast } from '../Toast';
import ReactQuill from 'react-quill';
import ItineraryEditor from '../ItineraryEditor';
import { Destination, PriceTier } from '../../types';
import { XIcon, UploadCloudIcon, StarIcon, ChevronDownIcon, ChevronUpIcon, SpinnerIcon } from '../Icons';
import uploadToCloudinary from '../../lib/cloudinary';
import { ConfirmationModal } from '../ConfirmationModal';

interface DestinationFormProps {
    destination: Destination;
    onSave: (destination: Destination) => void;
    onCancel: () => void;
    allCategories: string[];
}

const ALL_FACILITIES = [
    'Transportasi Darat',
    'Transportasi Laut',
    'Akomodasi Hotel',
    'Akomodasi Villa',
    'Makan 3x Sehari',
    'Makan Siang & Malam',
    'Pemandu Lokal',
    'Dokumentasi (Foto & Video)',
    'Asuransi Perjalanan',
    'Tiket Masuk Wisata'
];

export const DestinationForm: React.FC<DestinationFormProps> = ({ destination, onSave, onCancel, allCategories }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState<Destination>(destination);
    const [isSaving, setIsSaving] = useState(false);
    const [customFacility, setCustomFacility] = useState('');
    const initialImageUrls = destination.galleryImages.length > 0
        ? destination.galleryImages
        : (destination.imageUrl ? [destination.imageUrl] : []);
    const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls);
    // track corresponding Cloudinary public ids for each image (nullable for legacy)
    const initialPublicIds = destination.galleryPublicIds && destination.galleryPublicIds.length > 0
        ? destination.galleryPublicIds
        : (destination.imagePublicId ? [destination.imagePublicId] : []);
    // mark existing images as already uploaded (100)
    const [uploadProgress, setUploadProgress] = useState<number[]>(initialImageUrls.map(() => 100));
    // store original File objects for retry; existing entries are null
    const [uploadFiles, setUploadFiles] = useState<(File | null)[]>(initialImageUrls.map(() => null));
    // aligned array of public_ids matching imageUrls order
    const [publicIds, setPublicIds] = useState<(string | null)[]>(initialPublicIds.map(id => id ?? null));
    // track public_ids that the user deleted locally so server can remove them from Cloudinary
    const [removedPublicIds, setRemovedPublicIds] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // State for category input
    const [categoryInput, setCategoryInput] = useState('');
    const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
    const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
    
    const [activeItineraryIndex, setActiveItineraryIndex] = useState<number | null>(0);

    const [priceTierToDeleteIndex, setPriceTierToDeleteIndex] = useState<number | null>(null);
    const [itineraryItemToDeleteIndex, setItineraryItemToDeleteIndex] = useState<number | null>(null);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'duration' || name === 'minPeople' ? Number(value) : value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    files.forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Add preview and store the File object for later upload on submit
                setImageUrls(prev => {
                    const newIndex = prev.length;
                    const newArr = [...prev, reader.result as string];
                    // insert placeholder progress (-2 means pending upload)
                    setUploadProgress(prevP => {
                        const np = [...prevP];
                        np.splice(newIndex, 0, -2);
                        return np;
                    });
                    setUploadFiles(prevF => {
                        const nf = [...prevF];
                        nf.splice(newIndex, 0, file);
                        return nf;
                    });
                    setPublicIds(prevP => {
                        const np = [...prevP];
                        np.splice(newIndex, 0, null);
                        return np;
                    });

                    // DO NOT auto-upload here; we will upload when the user presses Save
                    return newArr;
                });
            };
            reader.readAsDataURL(file as Blob);
        });
        // clear input value so selecting same file again triggers change
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeleteImage = (indexToDelete: number) => {
    // If the image being removed has an existing Cloudinary public_id, record it.
    // If public_id is missing, try to derive it from the image URL so we still
    // request Cloudinary removal for previously-uploaded images.
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

    // Read current values synchronously to avoid relying on batched state values
    const currentPid = publicIds[indexToDelete];
    const currentUrl = imageUrls[indexToDelete];
    let removedId: string | null = null;
    if (currentPid) removedId = currentPid;
    else removedId = deriveFromUrl(currentUrl);

    if (removedId) {
        setRemovedPublicIds(prev => {
            // avoid duplicates
            if (prev.includes(removedId as string)) return prev;
            return [...prev, removedId as string];
        });
    }

    // Remove aligned entries from arrays
    setPublicIds(prev => prev.filter((_, index) => index !== indexToDelete));
    setImageUrls(prev => prev.filter((_, index) => index !== indexToDelete));
    setUploadProgress(prev => prev.filter((_, index) => index !== indexToDelete));
    setUploadFiles(prev => prev.filter((_, index) => index !== indexToDelete));
    };

    const handleSetMainImage = (indexToSet: number) => {
        if (indexToSet === 0) return;
        const newImageUrls = [...imageUrls];
        const mainImage = newImageUrls.splice(indexToSet, 1);
        const reordered = [mainImage[0], ...newImageUrls];
        // reorder aligned arrays (progress & files)
        setImageUrls(reordered);
        setUploadProgress(prev => {
            const p = [...prev];
            const item = p.splice(indexToSet, 1);
            return [item[0], ...p];
        });
        setUploadFiles(prev => {
            const f = [...prev];
            const item = f.splice(indexToSet, 1);
            return [item[0], ...f];
        });
        setPublicIds(prev => {
            const p = [...prev];
            const item = p.splice(indexToSet, 1);
            return [item[0], ...p];
        });
    };

    const retryUpload = async (index: number) => {
        const file = uploadFiles[index];
        if (!file) return;
        setUploadProgress(prev => {
            const np = [...prev];
            np[index] = 0;
            return np;
        });
        try {
            const res = await uploadToCloudinary(file, (pct: number) => {
                setUploadProgress(prev => {
                    const np = [...prev];
                    np[index] = pct;
                    return np;
                });
            });
            setImageUrls(prev => {
                const arr = [...prev];
                arr[index] = res.url;
                return arr;
            });
            setPublicIds(prev => {
                const arr = [...prev];
                arr[index] = res.public_id || null;
                return arr;
            });
            setUploadFiles(prev => {
                const nf = [...prev];
                nf[index] = null;
                return nf;
            });
            setUploadProgress(prev => {
                const np = [...prev];
                np[index] = 100;
                return np;
            });
        } catch (err) {
            setUploadProgress(prev => {
                const np = [...prev];
                np[index] = -1;
                return np;
            });
        }
    };


    const handleDescriptionChange = (value: string) => {
        setFormData(prev => ({ ...prev, longDescription: value }));
    };

    const handleItineraryChange = (index: number, field: 'title' | 'description', value: string) => {
        const newItinerary = [...formData.itinerary];
        newItinerary[index] = { ...newItinerary[index], [field]: value };
        setFormData(prev => ({ ...prev, itinerary: newItinerary }));
    };

    const addItineraryItem = () => {
        const newDay = formData.itinerary.length + 1;
        setFormData(prev => ({
            ...prev,
            itinerary: [...prev.itinerary, { day: newDay, title: '', description: '' }]
        }));
        setActiveItineraryIndex(formData.itinerary.length); // Open the new item
    };

    const removeItineraryItem = (indexToRemove: number) => {
        const newItinerary = formData.itinerary
            .filter((_, index) => index !== indexToRemove)
            .map((item, index) => ({ ...item, day: index + 1 })); // Re-number days
        setFormData(prev => ({ ...prev, itinerary: newItinerary }));
    };
    
    const toggleItineraryItem = (index: number) => {
        setActiveItineraryIndex(prevIndex => (prevIndex === index ? null : index));
    };
    
    const handleFacilityChange = (facility: string) => {
        setFormData(prev => {
            const currentFacilities = prev.facilities || [];
            const newFacilities = currentFacilities.includes(facility)
                ? currentFacilities.filter(f => f !== facility)
                : [...currentFacilities, facility];
            return { ...prev, facilities: newFacilities };
        });
    };

    const handleAddCustomFacility = () => {
        if (customFacility.trim() && !formData.facilities.includes(customFacility.trim())) {
            setFormData(prev => ({
                ...prev,
                facilities: [...(prev.facilities || []), customFacility.trim()]
            }));
            setCustomFacility('');
        }
    };

    const handleRemoveFacility = (facilityToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            facilities: (prev.facilities || []).filter(f => f !== facilityToRemove)
        }));
    };
    
    // Price Tiers Handlers
    const handlePriceTierChange = (index: number, field: 'minPeople', value: string) => {
        const newTiers = [...formData.priceTiers];
        newTiers[index] = { ...newTiers[index], [field]: Number(value) };
        setFormData(prev => ({...prev, priceTiers: newTiers}));
    };

    const handlePriceTierPriceChange = (index: number, value: string) => {
        const numberString = value.replace(/[^0-9]/g, '');
        const numberValue = numberString === '' ? 0 : parseInt(numberString, 10);
        
        const newTiers = [...formData.priceTiers];
        newTiers[index] = { ...newTiers[index], price: numberValue };
        setFormData(prev => ({...prev, priceTiers: newTiers}));
    };

    const addPriceTier = () => {
        const lastTier = formData.priceTiers[formData.priceTiers.length - 1];
        const newMinPeople = lastTier ? lastTier.minPeople + 1 : 1;
        setFormData(prev => ({
            ...prev,
            priceTiers: [...prev.priceTiers, { minPeople: newMinPeople, price: 0 }]
        }));
    };

    const removePriceTier = (indexToRemove: number) => {
        if (formData.priceTiers.length <= 1) return; // Cannot remove the last tier
        setFormData(prev => ({
            ...prev,
            priceTiers: prev.priceTiers.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleConfirmDeletePriceTier = () => {
        if (priceTierToDeleteIndex !== null) {
            removePriceTier(priceTierToDeleteIndex);
            setPriceTierToDeleteIndex(null);
        }
    };

    const handleConfirmDeleteItineraryItem = () => {
        if (itineraryItemToDeleteIndex !== null) {
            removeItineraryItem(itineraryItemToDeleteIndex);
            setItineraryItemToDeleteIndex(null);
        }
    };
    
    // Category Handlers
    const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCategoryInput(value);
        if (value) {
            const filtered = allCategories.filter(cat =>
                cat.toLowerCase().includes(value.toLowerCase()) &&
                !formData.categories.includes(cat)
            );
            setSuggestedCategories(filtered);
        } else {
            setSuggestedCategories([]);
        }
    };
    
    const addCategory = (category: string) => {
        const trimmedCategory = category.trim();
        if (trimmedCategory && !formData.categories.includes(trimmedCategory)) {
            setFormData(prev => ({ ...prev, categories: [...(prev.categories || []), trimmedCategory] }));
        }
        setCategoryInput('');
        setSuggestedCategories([]);
        setHighlightedSuggestion(-1);
    };

    const removeCategory = (categoryToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            categories: (prev.categories || []).filter(cat => cat !== categoryToRemove)
        }));
    };
    
    const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedSuggestion > -1 && suggestedCategories[highlightedSuggestion]) {
                addCategory(suggestedCategories[highlightedSuggestion]);
            } else if (categoryInput) {
                addCategory(categoryInput);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedSuggestion(prev => Math.min(prev + 1, suggestedCategories.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedSuggestion(prev => Math.max(prev - 1, 0));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate API Call
    setTimeout(async () => {
            // Build payload with DB-friendly keys (camelCase OK, server maps them)
            const slugValue = formData.slug && formData.slug.trim() !== ''
                ? formData.slug.trim()
                : String(formData.title || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            // If there are pending files, upload them now and replace previews with real URLs
            const finalImageUrls = [...imageUrls];
            // Ensure localPublicIds aligns with finalImageUrls length
            const localPublicIds = finalImageUrls.map((_, i) => (publicIds[i] ?? null));
            for (let i = 0; i < finalImageUrls.length; i++) {
                const file = uploadFiles[i];
                if (file) {
                    try {
                        // update progress to 0
                        setUploadProgress(prev => { const np = [...prev]; np[i] = 0; return np; });
                        const res = await uploadToCloudinary(file, (pct: number) => {
                            setUploadProgress(prev => { const np = [...prev]; np[i] = pct; return np; });
                        });
                        finalImageUrls[i] = res.url;
                        // store public id locally so it's immediately available for the payload
                        localPublicIds[i] = res.public_id || null;
                        // mark file as uploaded
                        setUploadFiles(prevF => { const nf = [...prevF]; nf[i] = null; return nf; });
                        setUploadProgress(prev => { const np = [...prev]; np[i] = 100; return np; });
                    } catch (err) {
                        setUploadProgress(prev => { const np = [...prev]; np[i] = -1; return np; });
                    }
                }
            }

            // persist collected public ids into state once (batch)
            setPublicIds(localPublicIds);

            const finalData = {
                ...formData,
                slug: slugValue,
                imageUrl: finalImageUrls[0] || '',
                galleryImages: finalImageUrls,
                // include public id fields so server can persist them for deletion later (use localPublicIds)
                imagePublicId: localPublicIds && localPublicIds[0] ? localPublicIds[0] : null,
                galleryPublicIds: localPublicIds && localPublicIds.length > 0 ? localPublicIds : [],
                // tell server which Cloudinary public_ids were removed by the user so it can delete them
                // dedupe and only include if non-empty
                ...(removedPublicIds && removedPublicIds.length > 0 ? { removed_public_ids: Array.from(new Set(removedPublicIds.filter(Boolean))) } : {}),
                // ensure numeric fields are numbers
                duration: Number(formData.duration) || 0,
                minPeople: Number(formData.minPeople) || 0,
                priceTiers: formData.priceTiers || [],
                itinerary: formData.itinerary || [],
                facilities: formData.facilities || [],
                categories: formData.categories || [],
                mapCoordinates: formData.mapCoordinates || null,
            };
            // Debug: log removedPublicIds so we can trace deletion requests
            try { console.debug('Submitting removed_public_ids:', removedPublicIds); } catch (e) {}
            try {
                await onSave(finalData);
            } catch (err: any) {
                const msg = (err && err.message) ? err.message : 'Gagal menyimpan destinasi. Coba lagi.';
                try { showToast(msg, 'error'); } catch {}
            }
            // No need to set isSaving(false) as the component will unmount in success path
        }, 1500);
    };

    const modules = {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike', 'blockquote'],
          [{'list': 'ordered'}, {'list': 'bullet'}],
          [{ 'align': [] }],
          ['link'],
          ['clean']
        ],
    };

    return (
        <div className="admin-card">
            <div className="admin-form-header">
                <h2>{formData.id === 0 ? 'Tambah' : 'Edit'} Destinasi</h2>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Judul</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
                </div>
                
                 <div className="form-group">
                    <label>Galeri Gambar</label>
                    <div className="image-upload-grid">
                        {imageUrls.map((url, index) => (
                            <div key={index} className="image-preview-item">
                                <img src={url} alt={`Preview ${index + 1}`} loading="lazy" decoding="async" />
                                {index === 0 && <div className="main-image-badge">Utama</div>}

                                {/* Upload progress overlay */}
                                {uploadProgress[index] !== undefined && uploadProgress[index] >= 0 && uploadProgress[index] < 100 && (
                                    <div className="upload-overlay">
                                        <div className="progress-circle">{uploadProgress[index]}%</div>
                                    </div>
                                )}

                                {/* Upload failed state */}
                                {uploadProgress[index] === -1 && (
                                    <div className="upload-overlay upload-failed">
                                        <button type="button" className="btn btn-secondary btn-small" onClick={() => retryUpload(index)}>Retry</button>
                                    </div>
                                )}

                                <div className="image-actions">
                                    <button 
                                        type="button" 
                                        className={`image-action-btn star ${index === 0 ? 'active' : ''}`}
                                        title="Jadikan Gambar Utama"
                                        onClick={() => handleSetMainImage(index)}
                                        disabled={index === 0}
                                    >
                                        <StarIcon filled={index === 0} />
                                    </button>
                                    <button 
                                        type="button" 
                                        className="image-action-btn delete"
                                        title="Hapus Gambar"
                                        onClick={() => handleDeleteImage(index)}
                                    >
                                        <XIcon />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button 
                            type="button" 
                            className="upload-placeholder"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UploadCloudIcon />
                            <span>Unggah</span>
                        </button>
                    </div>
                    <input 
                        type="file"
                        ref={fileInputRef}
                        className="hidden-file-input"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>
                
                <div className="form-group">
                    <label>Deskripsi</label>
                     <ReactQuill 
                        className="description-editor"
                        theme="snow" 
                        value={formData.longDescription} 
                        onChange={handleDescriptionChange}
                        modules={modules}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="categories">Kategori</label>
                    <div className="category-input-container">
                        {formData.categories && formData.categories.length > 0 && (
                            <div className="category-tags-list">
                                {formData.categories.map(cat => (
                                    <div key={cat} className="category-tag">
                                        <span>{cat}</span>
                                        <button type="button" className="remove-category-btn" onClick={() => removeCategory(cat)}>&times;</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="category-input-wrapper">
                            <input
                                type="text"
                                id="categories"
                                value={categoryInput}
                                onChange={handleCategoryInputChange}
                                onKeyDown={handleCategoryKeyDown}
                                placeholder="Tambah kategori baru..."
                            />
                             {suggestedCategories.length > 0 && (
                                <div className="category-suggestions">
                                    {suggestedCategories.map((suggestion, index) => (
                                        <div
                                            key={suggestion}
                                            className={`category-suggestion-item ${index === highlightedSuggestion ? 'highlighted' : ''}`}
                                            onClick={() => addCategory(suggestion)}
                                            onMouseEnter={() => setHighlightedSuggestion(index)}
                                        >
                                            {suggestion}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-row-compact" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group">
                        <label htmlFor="duration">Durasi (Hari)</label>
                        <input type="number" id="duration" name="duration" value={formData.duration} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="minPeople">Minimal Peserta</label>
                        <input type="number" id="minPeople" name="minPeople" value={formData.minPeople} onChange={handleChange} required />
                    </div>
                </div>
                
                {/* Price Tiers Editor */}
                <div className="form-group">
                    <label>Jenjang Harga</label>
                     <div className="itinerary-editor">
                         {formData.priceTiers.map((tier, index) => (
                             <div key={index} className="itinerary-editor-item">
                                 <div className="itinerary-editor-header" style={{border: 'none', padding: 0, marginBottom: '1rem'}}>
                                     <h4>Jenjang {index + 1}</h4>
                                     <button type="button" className="btn btn-danger btn-small" onClick={() => setPriceTierToDeleteIndex(index)} disabled={formData.priceTiers.length <= 1}>Hapus</button>
                                 </div>
                                 <div className="form-row-compact" style={{ gridTemplateColumns: '1fr 2fr', marginBottom: 0 }}>
                                    <div className="form-group">
                                        <label htmlFor={`tier-minpeople-${index}`}>Minimal Peserta</label>
                                        <input type="number" id={`tier-minpeople-${index}`} value={tier.minPeople} onChange={(e) => handlePriceTierChange(index, 'minPeople', e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor={`tier-price-${index}`}>Harga per Orang (IDR)</label>
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            id={`tier-price-${index}`}
                                            value={tier.price ? new Intl.NumberFormat('id-ID').format(tier.price) : ''}
                                            onChange={(e) => handlePriceTierPriceChange(index, e.target.value)}
                                            placeholder="cth: 1.200.000"
                                            required 
                                        />
                                    </div>
                                 </div>
                             </div>
                         ))}
                         <button type="button" className="btn btn-secondary" onClick={addPriceTier}>Tambah Jenjang</button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Fasilitas</label>
                    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                        {formData.facilities && formData.facilities.length > 0 && (
                            <div className="selected-facilities-list" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0, marginBottom: '1rem' }}>
                                {formData.facilities.map(facility => (
                                    <div key={facility} className="selected-facility-item">
                                        <span>{facility}</span>
                                        <button type="button" className="remove-facility-btn" onClick={() => handleRemoveFacility(facility)}>&times;</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="custom-facility-adder" style={{ marginTop: formData.facilities.length > 0 ? '1rem' : 0, paddingTop: formData.facilities.length > 0 ? '1rem' : 0, borderTop: formData.facilities.length > 0 ? '1px solid var(--border-color)' : 'none' }}>
                            <input type="text" placeholder="Tambah fasilitas kustom..." value={customFacility} onChange={(e) => setCustomFacility(e.target.value)} />
                            <button type="button" className="btn btn-secondary" onClick={handleAddCustomFacility}>Tambah</button>
                        </div>
                        <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--border-color)' }}/>
                        <div className="facilities-checklist" style={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}>
                            {ALL_FACILITIES.map(facility => (
                                <div key={facility} className="checklist-item">
                                    <input type="checkbox" id={`facility-${facility.replace(/\s/g, '-')}`} checked={(formData.facilities || []).includes(facility)} onChange={() => handleFacilityChange(facility)} />
                                    <label htmlFor={`facility-${facility.replace(/\s/g, '-')}`}>{facility}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label>Itinerary</label>
                    <div className="itinerary-editor">
                        {formData.itinerary.map((item, index) => {
                            const isOpen = activeItineraryIndex === index;
                            return (
                                <div key={index} className="itinerary-editor-item">
                                    <div
                                        className="itinerary-editor-header"
                                        onClick={() => toggleItineraryItem(index)}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexGrow: 1, minWidth: 0 }}>
                                            {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                            <h4 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                Hari {item.day}{item.title ? `: ${item.title}` : ''}
                                            </h4>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setItineraryItemToDeleteIndex(index);
                                            }}
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                    {isOpen && (
                                        <div style={{ paddingTop: '1rem', marginTop: '0.75rem' }}>
                                            <div className="form-group">
                                                <label htmlFor={`itinerary-title-${index}`}>Judul Hari</label>
                                                <input type="text" id={`itinerary-title-${index}`} value={item.title} onChange={(e) => handleItineraryChange(index, 'title', e.target.value)} placeholder="cth: Tiba di Nusa Penida & Eksplorasi Barat" required />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor={`itinerary-desc-${index}`}>Deskripsi Hari</label>
                                                <ItineraryEditor
                                                    id={`itinerary-desc-${index}`}
                                                    value={item.description}
                                                    onChange={(val) => handleItineraryChange(index, 'description', val)}
                                                    placeholder="cth: Tiba di pelabuhan, check-in hotel..."
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <button type="button" className="btn btn-secondary" onClick={addItineraryItem}>Tambah Hari</button>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>Batal</button>
                    <button type="submit" className={`btn btn-primary ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
                        {isSaving && <SpinnerIcon />}
                        <span>Simpan</span>
                    </button>
                </div>
            </form>

            {priceTierToDeleteIndex !== null && (
                <ConfirmationModal
                    isOpen={priceTierToDeleteIndex !== null}
                    onClose={() => setPriceTierToDeleteIndex(null)}
                    onConfirm={handleConfirmDeletePriceTier}
                    title="Konfirmasi Hapus Jenjang Harga"
                    confirmButtonText="Hapus"
                >
                    <p>Apakah Anda yakin ingin menghapus <strong>Jenjang Harga {priceTierToDeleteIndex + 1}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
                </ConfirmationModal>
            )}

            {itineraryItemToDeleteIndex !== null && (
                <ConfirmationModal
                    isOpen={itineraryItemToDeleteIndex !== null}
                    onClose={() => setItineraryItemToDeleteIndex(null)}
                    onConfirm={handleConfirmDeleteItineraryItem}
                    title="Konfirmasi Hapus Itinerary"
                    confirmButtonText="Hapus"
                >
                    <p>Apakah Anda yakin ingin menghapus <strong>Hari {itineraryItemToDeleteIndex + 1}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
                </ConfirmationModal>
            )}
        </div>
    );
};