import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import { Destination } from '../../types';
import { DestinationForm } from '../../components/admin/DestinationForm';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { EditIcon, TrashIcon } from '../../components/Icons';
import { AdminRowSkeleton } from '../../components/DetailSkeletons';

interface AdminDestinationsPageProps {
    destinations: Destination[];
    onSave: (destination: Destination) => void;
    onDelete: (id: number) => void;
}

export const AdminDestinationsPage: React.FC<AdminDestinationsPageProps> = ({ destinations, onSave, onDelete }) => {
    const { showToast } = useToast();
    const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
    const [destinationToDelete, setDestinationToDelete] = useState<Destination | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const allCategories = useMemo(() => {
        const categorySet = new Set<string>();
        destinations.forEach(dest => {
            if (dest.categories) {
                dest.categories.forEach(cat => categorySet.add(cat));
            }
        });
        return Array.from(categorySet).sort();
    }, [destinations]);
    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 300);
        return () => clearTimeout(t);
    }, []);
    
    const handleAddNew = () => {
        const newDestinationTemplate: Destination = {
            id: 0,
            title: '',
            priceTiers: [{ minPeople: 1, price: 0 }],
            duration: 0,
            imageUrl: '',
            galleryImages: [],
            longDescription: '',
            minPeople: 1,
            itinerary: [{ day: 1, title: '', description: '' }],
            mapCoordinates: { lat: 0, lng: 0 },
            facilities: [],
            categories: [],
        };
        setEditingDestination(newDestinationTemplate);
        setIsFormVisible(true);
    };

    const handleEdit = (destination: Destination) => {
        setEditingDestination(destination);
        setIsFormVisible(true);
    };

    const handleSave = async (destination: Destination) => {
        try {
            await onSave(destination);
            try { showToast('Destinasi berhasil disimpan', 'success'); } catch {}
            // Close form only after successful save
            setIsFormVisible(false);
            setEditingDestination(null);
        } catch (err) {
            console.error('Save destination failed', err);
            try { showToast('Gagal menyimpan destinasi. Coba lagi atau periksa konfigurasi server.', 'error'); } catch {}
            // Keep the form open so the admin can fix issues and retry
        }
    };
    
    const handleCancel = () => {
        setIsFormVisible(false);
        setEditingDestination(null);
    };

    const handleDeleteRequest = (destination: Destination) => {
        setDestinationToDelete(destination);
    };

    const handleConfirmDelete = async () => {
        if (!destinationToDelete) return;
        setIsDeleting(true);
        try {
            // Support both sync and async onDelete handlers
            await Promise.resolve(onDelete(destinationToDelete.id));
            try { showToast('Destinasi berhasil dihapus', 'success'); } catch {}
            setDestinationToDelete(null);
        } catch (err) {
            console.error('Delete destination failed', err);
            try { showToast('Gagal menghapus destinasi. Coba lagi.', 'error'); } catch {}
        } finally {
            setIsDeleting(false);
        }
    };

    const formattedPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

    if (isFormVisible && editingDestination) {
        return <DestinationForm 
            destination={editingDestination} 
            onSave={handleSave} 
            onCancel={handleCancel}
            allCategories={allCategories}
        />
    }

    return (
        <div>
            <div className="admin-page-actions">
                {(!isLoading && destinations.length > 0) && (
                    <button className="btn btn-primary" onClick={handleAddNew}>Tambah Baru</button>
                )}
            </div>
            <div className="admin-grid">
                {isLoading && (
                    Array.from({ length: 6 }).map((_, i) => (<AdminRowSkeleton key={i} />))
                )}

                {!isLoading && destinations.length === 0 && (
                    <div className="admin-empty-state">
                        <div className="admin-empty-illustration" aria-hidden>
                            <svg width="160" height="110" viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="10" y="20" width="140" height="70" rx="8" fill="var(--empty-fill)" stroke="var(--empty-stroke)"/>
                                <rect x="26" y="36" width="40" height="8" rx="4" fill="var(--empty-rect-fill)"/>
                                <rect x="26" y="52" width="100" height="8" rx="4" fill="var(--empty-rect-fill)"/>
                                <rect x="26" y="68" width="70" height="8" rx="4" fill="var(--empty-rect-fill)"/>
                            </svg>
                        </div>
                        <h3>Belum ada destinasi</h3>
                        <p>Tambahkan destinasi baru untuk mulai menjual paket wisata Anda.</p>
                        <div style={{ marginTop: '1rem' }}>
                            <button className="btn btn-primary" onClick={handleAddNew}>Tambah Destinasi</button>
                        </div>
                    </div>
                )}

                {!isLoading && destinations.length > 0 && (
                    destinations.map((dest) => {
                        // Defensive guards: ensure priceTiers is an array with at least one tier
                        const tiers = Array.isArray(dest.priceTiers) && dest.priceTiers.length > 0 ? dest.priceTiers : [{ price: 0 }];
                        const startingPrice = Math.min(...tiers.map(t => t?.price ?? 0));
                        return (
                            <div key={dest.id} className="admin-item-card">
                                <img src={dest.imageUrl} alt={dest.title} className="admin-item-image" loading="lazy" decoding="async" />
                                <div className="admin-item-info">
                                    <h3>{dest.title}</h3>
                                    <p>Mulai dari {formattedPrice(startingPrice)} - {dest.duration} hari</p>
                                </div>
                                <div className="admin-item-actions">
                                    <button className="btn-icon" onClick={() => handleEdit(dest)} aria-label={`Edit ${dest.title}`}>
                                        <EditIcon />
                                    </button>
                                    <button className="btn-icon delete" onClick={() => handleDeleteRequest(dest)} aria-label={`Hapus ${dest.title}`}>
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            {destinationToDelete && (
                <ConfirmationModal
                    isOpen={!!destinationToDelete}
                    onClose={() => setDestinationToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Konfirmasi Penghapusan"
                    confirmButtonText="Hapus"
                    confirmButtonVariant="danger"
                    isLoading={isDeleting}
                >
                    <p>Apakah Anda yakin ingin menghapus destinasi <strong>{destinationToDelete.title}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
                </ConfirmationModal>
            )}
        </div>
    );
};