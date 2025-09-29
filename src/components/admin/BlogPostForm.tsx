import React, { useState, useRef } from 'react';
import { useToast } from '../Toast';
import ReactQuill from 'react-quill';
import { BlogPost } from '../../types';
import { UploadCloudIcon, XIcon, EditIcon, SpinnerIcon } from '../Icons';
import uploadToCloudinary from '../../lib/cloudinary';

interface BlogPostFormProps {
    post: BlogPost;
    onSave: (post: BlogPost) => void;
    onCancel: () => void;
}

export const BlogPostForm: React.FC<BlogPostFormProps> = ({ post, onSave, onCancel }) => {
    const [formData, setFormData] = useState<BlogPost>(post);
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // -2 = pending (selected, not uploaded), -1 = failed, 0..100 = progress
    const [uploadProgress, setUploadProgress] = useState<number>(formData.imageUrl ? 100 : -2);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    // track Cloudinary public_id for the image (nullable)
    const [imagePublicId, setImagePublicId] = useState<string | null>((post as any).imagePublicId ?? null);
    // track public_ids removed during this edit session so server can delete them
    const [removedPublicIds, setRemovedPublicIds] = useState<string[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContentChange = (value: string) => {
        setFormData(prev => ({ ...prev, content: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0] as File;
        // If there is an existing image (either with known public id or URL), record it for deletion
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

        // If replacing an existing image, accumulate its public id for deletion
        const prevPid = imagePublicId || (formData as any).imagePublicId || null;
        const prevDerived = !prevPid ? deriveFromUrl(formData.imageUrl) : null;
        const toRemove = prevPid || prevDerived;
        if (toRemove) {
            setRemovedPublicIds(prev => prev.includes(toRemove as string) ? prev : [...prev, toRemove as string]);
        }

        // Do NOT auto-upload here. Just show preview and store file for upload on submit.
        setUploadFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            setUploadProgress(-2); // pending
            // clear any previous public id until we actually upload or save
            setImagePublicId(null);
        };
        reader.readAsDataURL(file);
    };

    const retryUpload = async () => {
        if (!uploadFile) return;
        setUploadProgress(0);
        try {
            const res = await uploadToCloudinary(uploadFile, (pct: number) => setUploadProgress(pct));
            const uploadedUrl = typeof res === 'string' ? res : res.url;
            const publicId = (res && typeof res === 'object') ? (res.public_id || null) : null;
            setFormData(prev => ({ ...prev, imageUrl: uploadedUrl }));
            setImagePublicId(publicId);
            setUploadFile(null);
            setUploadProgress(100);
        } catch (err) {
            setUploadProgress(-1);
        }
    };

    const handleRemoveImage = () => {
    // When removing image, try to record public_id (or derive from URL) so server can delete
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

    const prevPid = imagePublicId || (formData as any).imagePublicId || null;
    const prevDerived = !prevPid ? deriveFromUrl(formData.imageUrl) : null;
    const toRemove = prevPid || prevDerived;
    if (toRemove) {
        setRemovedPublicIds(prev => prev.includes(toRemove as string) ? prev : [...prev, toRemove as string]);
    }

    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setImagePublicId(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Ensure there's an image either already uploaded or selected
        if (!formData.imageUrl && !uploadFile) {
            showToast('Gambar utama wajib diunggah.', 'error');
            return;
        }
        setIsSaving(true);

        (async () => {
            try {
                let finalImageUrl = formData.imageUrl || '';
                let finalPublicId = imagePublicId || (formData as any).imagePublicId || null;
                // If a new file was selected, upload it now
                if (uploadFile) {
                    setUploadProgress(0);
                    const res = await uploadToCloudinary(uploadFile, (pct: number) => setUploadProgress(pct));
                    finalImageUrl = typeof res === 'string' ? res : res.url;
                    finalPublicId = (res && typeof res === 'object') ? (res.public_id || null) : finalPublicId;
                }

                const finalPost = {
                    ...formData,
                    imageUrl: finalImageUrl || '',
                    imagePublicId: finalPublicId,
                    ...(removedPublicIds && removedPublicIds.length > 0 ? { removed_public_ids: Array.from(new Set(removedPublicIds.filter(Boolean))) } : {}),
                } as BlogPost & { imagePublicId?: string | null; removed_public_ids?: string[] };

                try { console.debug('Submitting removed_public_ids:', removedPublicIds); } catch (e) {}

                // Simulate short delay for UX parity
                setTimeout(() => {
                    onSave(finalPost as BlogPost);
                    // component likely unmounts; no need to setIsSaving(false)
                }, 300);
            } catch (err) {
                setIsSaving(false);
                setUploadProgress(-1);
                showToast('Gagal mengunggah gambar. Silakan coba lagi.', 'error');
            }
        })();
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
                <h2>{formData.id === 0 ? 'Tambah' : 'Edit'} Artikel Blog</h2>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Judul</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
                </div>
                
                <div className="form-group">
                    <label>Gambar Utama</label>
                    <div className="image-upload-grid" style={{ gridTemplateColumns: 'minmax(150px, 250px)' }}>
                         {formData.imageUrl ? (
                            <div className="image-preview-item">
                                <img src={formData.imageUrl} alt="Preview" loading="lazy" decoding="async" />

                                {uploadProgress >= 0 && uploadProgress < 100 && (
                                    <div className="upload-overlay">
                                        <div className="progress-circle">{uploadProgress}%</div>
                                    </div>
                                )}

                                {uploadProgress === -1 && (
                                    <div className="upload-overlay upload-failed">
                                        <button type="button" className="btn btn-secondary btn-small" onClick={retryUpload}>Retry</button>
                                    </div>
                                )}

                                <div className="image-actions" style={{ opacity: 1, gap: '8px' }}>
                                    <button 
                                        type="button" 
                                        className="image-action-btn delete"
                                        title="Hapus Gambar"
                                        onClick={handleRemoveImage}
                                    >
                                        <XIcon />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                type="button" 
                                className="upload-placeholder"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <UploadCloudIcon />
                                <span>Unggah Gambar</span>
                            </button>
                        )}
                    </div>
                     <input 
                        type="file"
                        ref={fileInputRef}
                        className="hidden-file-input"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>

                <div className="form-group">
                    <label>Konten</label>
                    <ReactQuill 
                        className="description-editor"
                        theme="snow" 
                        value={formData.content} 
                        onChange={handleContentChange}
                        modules={modules}
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="category">Kategori</label>
                    <input type="text" id="category" name="category" value={formData.category} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="author">Penulis</label>
                    <input type="text" id="author" name="author" value={formData.author} onChange={handleChange} required />
                </div>

                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSaving}>Batal</button>
                    <button type="submit" className={`btn btn-primary ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
                        {isSaving && <SpinnerIcon />}
                        <span>Simpan</span>
                    </button>
                </div>
            </form>
        </div>
    );
};