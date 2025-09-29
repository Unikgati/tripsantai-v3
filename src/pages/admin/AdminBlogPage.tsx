import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { BlogPost } from '../../types';
import { BlogPostForm } from '../../components/admin/BlogPostForm';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { EditIcon, TrashIcon } from '../../components/Icons';
import { AdminRowSkeleton } from '../../components/DetailSkeletons';

interface AdminBlogPageProps {
    blogPosts: BlogPost[];
    onSave: (post: BlogPost) => void;
    onDelete: (id: number) => void;
}

export const AdminBlogPage: React.FC<AdminBlogPageProps> = ({ blogPosts, onSave, onDelete }) => {
    const { showToast } = useToast();
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
    const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 300);
        return () => clearTimeout(t);
    }, []);

    const handleAddNew = () => {
        const newPostTemplate: BlogPost = {
            id: 0,
            title: '',
            imageUrl: '',
            category: '',
            author: '',
            date: '', // Will be set on save
            content: ''
        };
        setEditingPost(newPostTemplate);
        setIsFormVisible(true);
    };

    const handleEdit = (post: BlogPost) => {
        setEditingPost(post);
        setIsFormVisible(true);
    };
    
    const handleSave = (post: BlogPost) => {
        (async () => {
            try {
                await Promise.resolve(onSave(post));
                try { showToast('Artikel berhasil disimpan', 'success'); } catch {}
                setIsFormVisible(false);
                setEditingPost(null);
            } catch (err) {
                console.error('Save blog post failed', err);
                try { showToast('Gagal menyimpan artikel. Coba lagi atau periksa konfigurasi server.', 'error'); } catch {}
                // keep form open for retry
            }
        })();
    };

    const handleCancel = () => {
        setIsFormVisible(false);
        setEditingPost(null);
    };

    const handleDeleteRequest = (post: BlogPost) => {
        setPostToDelete(post);
    };

    const handleConfirmDelete = () => {
        if (postToDelete) {
            setIsDeleting(true);
            // Simulate API call
            setTimeout(() => {
                onDelete(postToDelete.id);
                setPostToDelete(null);
                setIsDeleting(false);
            }, 1000);
        }
    };
    
    // Await the delete handler so modal remains open during deletion and we can
    // show success/error toasts based on real outcome.
    const handleConfirmDeleteAsync = async () => {
        if (!postToDelete) return;
        setIsDeleting(true);
        try {
            await Promise.resolve(onDelete(postToDelete.id));
            setPostToDelete(null);
        } catch (err) {
            console.error('Delete blog post failed', err);
            // Optionally show toast here if Toast context available in this file
        } finally {
            setIsDeleting(false);
        }
    };

    if (isFormVisible && editingPost) {
        return <BlogPostForm post={editingPost} onSave={handleSave} onCancel={handleCancel} />
    }

    return (
        <div>
            <div className="admin-page-actions">
                {(!isLoading && blogPosts.length > 0) && (
                    <button className="btn btn-primary" onClick={handleAddNew}>Tambah Baru</button>
                )}
            </div>
            <div className="admin-grid">
                {isLoading && (
                    Array.from({ length: 6 }).map((_, i) => <AdminRowSkeleton key={i} />)
                )}

                {!isLoading && blogPosts.length === 0 && (
                    <div className="admin-empty-state">
                        <div className="admin-empty-illustration" aria-hidden>
                            <svg width="160" height="110" viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="10" y="20" width="140" height="70" rx="8" fill="var(--empty-fill)" stroke="var(--empty-stroke)"/>
                                <rect x="26" y="36" width="40" height="8" rx="4" fill="var(--empty-rect-fill)"/>
                                <rect x="26" y="52" width="100" height="8" rx="4" fill="var(--empty-rect-fill)"/>
                                <rect x="26" y="68" width="70" height="8" rx="4" fill="var(--empty-rect-fill)"/>
                            </svg>
                        </div>
                        <h3>Belum ada artikel</h3>
                        <p>Tambahkan artikel baru untuk mengisi bagian blog Anda.</p>
                        <div style={{ marginTop: '1rem' }}>
                            <button className="btn btn-primary" onClick={handleAddNew}>Tambah Artikel</button>
                        </div>
                    </div>
                )}

                {!isLoading && blogPosts.length > 0 && (
                    blogPosts.map(post => (
                     <div key={post.id} className="admin-item-card">
                         <img src={post.imageUrl} alt={post.title} className="admin-item-image" loading="lazy" decoding="async" />
                         <div className="admin-item-info">
                             <h3>{post.title}</h3>
                             <p>{post.category} - oleh {post.author}</p>
                         </div>
                         <div className="admin-item-actions">
                             <button className="btn-icon" onClick={() => handleEdit(post)} aria-label={`Edit ${post.title}`}>
                                <EditIcon />
                            </button>
                             <button className="btn-icon delete" onClick={() => handleDeleteRequest(post)} aria-label={`Hapus ${post.title}`}>
                                <TrashIcon />
                            </button>
                         </div>
                    </div>
                    ))
                )}
            </div>
            
            {postToDelete && (
                <ConfirmationModal
                    isOpen={!!postToDelete}
                    onClose={() => setPostToDelete(null)}
                    onConfirm={async () => {
                        setIsDeleting(true);
                        try {
                            await Promise.resolve(onDelete(postToDelete.id));
                            try { showToast('Artikel berhasil dihapus', 'success'); } catch {}
                            setPostToDelete(null);
                        } catch (err) {
                            console.error('Delete blog post failed', err);
                            try { showToast('Gagal menghapus artikel. Coba lagi.', 'error'); } catch {}
                        } finally {
                            setIsDeleting(false);
                        }
                    }}
                    title="Konfirmasi Penghapusan"
                    confirmButtonText="Hapus"
                    confirmButtonVariant="danger"
                    isLoading={isDeleting}
                >
                    <p>Apakah Anda yakin ingin menghapus artikel <strong>{postToDelete.title}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
                </ConfirmationModal>
            )}
        </div>
    );
};