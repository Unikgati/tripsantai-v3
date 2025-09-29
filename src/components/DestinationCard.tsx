import React from 'react';
import { Destination } from '../types';
import { useWishlist } from '../contexts/WishlistContext';
import { ClockIcon, HeartIcon } from './Icons';

interface DestinationCardProps {
    destination: Destination;
    onViewDetail: (destination: Destination) => void;
    onBookNow: (destination: Destination) => void;
    showCategories?: boolean;
}

const DestinationCardComponent: React.FC<DestinationCardProps> = ({ destination, onViewDetail, onBookNow, showCategories = true }) => {
    const { id, title, longDescription, priceTiers, duration, imageUrl, categories } = destination;
    const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
    const isWishlisted = isInWishlist(id);
    
    const handleWishlistToggle = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click event
        if (isWishlisted) {
            removeFromWishlist(id);
        } else {
            addToWishlist(id);
        }
    };

    
    const handleBookClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onBookNow(destination);
    };
    
    // Updated logic: Use safe fallbacks for priceTiers and categories
    const tiers = Array.isArray(priceTiers) && priceTiers.length > 0 ? priceTiers : [{ price: 0 }];
    const startingPrice = tiers[0]?.price ?? 0;
    const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(startingPrice);

    // Function to strip HTML tags for a plain text preview
    const createSnippet = (htmlContent: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        return tempDiv.textContent || tempDiv.innerText || "";
    };

    const snippet = createSnippet(longDescription);


    return (
        <article className="destination-card" aria-labelledby={`destination-title-${id}`} onClick={() => onViewDetail(destination)}>
            <div className="card-image-container">
                <img src={imageUrl} alt={title} loading="lazy" decoding="async" />
                <div className="card-badge">
                   <ClockIcon /> {duration} Hari
                </div>
                <button 
                    className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
                    onClick={handleWishlistToggle}
                    aria-label={isWishlisted ? `Hapus ${title} dari wishlist` : `Tambah ${title} ke wishlist`}
                >
                    <HeartIcon filled={isWishlisted} />
                </button>
            </div>
            <div className="card-content">
        {showCategories && (categories ?? []).length > 0 && (
                    <div className="card-category-list">
            {(categories ?? []).slice(0, 2).map(cat => (
                            <span key={cat} className="card-category-badge">{cat}</span>
                        ))}
                    </div>
                )}
                <h3 id={`destination-title-${id}`}>{title}</h3>
                <p className="card-description">{snippet}</p>
                <div className="card-footer">
                    <div>
                        <span className="price-label">Mulai dari</span>
                        <p className="card-price">{formattedPrice} <span>/org</span></p>
                    </div>
                    <div className="card-actions">
                        <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); onViewDetail(destination); }}>Detail</button>
                        <button className="btn btn-primary" onClick={handleBookClick}>Pesan</button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export const DestinationCard = React.memo(DestinationCardComponent, (prevProps, nextProps) => {
    // Shallow compare destination id and references for handlers; this keeps re-renders minimal
    return prevProps.destination.id === nextProps.destination.id
        && prevProps.onViewDetail === nextProps.onViewDetail
        && prevProps.onBookNow === nextProps.onBookNow
        && prevProps.showCategories === nextProps.showCategories;
});