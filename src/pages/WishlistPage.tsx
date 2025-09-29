import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Destination, Page } from '../types';
import { useWishlist } from '../contexts/WishlistContext';
import { DestinationCard } from '../components/DestinationCard';
import { ArrowLeftIcon } from '../components/Icons';

interface WishlistPageProps {
    setPage: (page: Page) => void;
    onViewDetail: (d: Destination) => void;
    onBookNow: (d: Destination) => void;
    allDestinations: Destination[];
}

export const WishlistPage: React.FC<WishlistPageProps> = ({ setPage, onViewDetail, onBookNow, allDestinations }) => {
    const { wishlist } = useWishlist();
    const wishlistedDestinations = allDestinations.filter(dest => wishlist.includes(dest.id));
    const navigate = useNavigate();

    return (
        <div className="page-container">
            <div className="container">
                <div className="page-header">
                    <h1>Destinasi Impian Saya</h1>
                    <p>Berikut adalah daftar destinasi yang telah Anda simpan.</p>
                </div>
                {wishlistedDestinations.length > 0 ? (
                    <div className="destinations-grid homepage-grid wishlist-grid">
                        {wishlistedDestinations.map(dest => <DestinationCard key={dest.id} destination={dest} onViewDetail={onViewDetail} onBookNow={onBookNow} showCategories={false} />)}
                    </div>
                ) : (
                    <div className="wishlist-empty-state">
                        <h2>Wishlist Anda kosong</h2>
                        <p>Mulai jelajahi dan tambahkan destinasi impian Anda ke sini!</p>
                        <button className="btn btn-primary" onClick={() => { navigate('/destinations'); try { setPage && setPage('destinations'); } catch {} }}>Jelajahi Destinasi</button>
                    </div>
                )}
            </div>
        </div>
    );
};