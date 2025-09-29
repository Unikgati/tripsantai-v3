import React from 'react';
import { Destination, Page } from '../types';
import { DestinationCard } from '../components/DestinationCard';

interface SearchResultsPageProps {
    query: string;
    setPage: (page: Page) => void;
    onViewDetail: (d: Destination) => void;
    onBookNow: (d: Destination) => void;
    allDestinations: Destination[];
}

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ query, setPage, onViewDetail, onBookNow, allDestinations }) => {
    const results = allDestinations.filter(dest => 
        dest.title.toLowerCase().includes(query.toLowerCase()) ||
        dest.longDescription.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="page-container">
            <div className="container">
                <div className="page-header">
                    <h1>Hasil Pencarian untuk: "{query}"</h1>
                    <p>Ditemukan {results.length} destinasi yang cocok.</p>
                </div>
                {results.length > 0 ? (
                    <div className="destinations-grid homepage-grid">
                        {results.map(dest => <DestinationCard key={dest.id} destination={dest} onViewDetail={onViewDetail} onBookNow={onBookNow} showCategories={false} />)}
                    </div>
                ) : (
                    <div className="wishlist-empty-state">
                        <h2>Tidak ada hasil pencarian</h2>
                        <p>Maaf, tidak ada destinasi yang cocok dengan kata kunci Anda.</p>
                        <p>Coba gunakan kata kunci lain atau jelajahi semua destinasi.</p>
                        <button className="btn btn-primary" onClick={() => { try { setPage && setPage('destinations'); } catch {} ; try { (window as any).location && (window as any).location.assign && (window as any).location.assign('/destinations'); } catch {} }}>Jelajahi Destinasi</button>
                    </div>
                )}
            </div>
        </div>
    );
};