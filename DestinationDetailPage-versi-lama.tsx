import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Destination, Page } from '../types';
import { ClockIcon, UsersIcon, CameraIcon, MapPinIcon, CheckCircleIcon } from '../components/Icons';
import { FacilitiesList } from '../components/FacilitiesList';
import { DestinationDetailSkeleton } from '../components/DetailSkeletons';

type Tab = 'about' | 'itinerary' | 'facilities';

interface DestinationDetailPageProps {
    destination: Destination;
    setPage: (page: Page) => void;
    onBookNow: (destination: Destination) => void;
}

export const DestinationDetailPage: React.FC<DestinationDetailPageProps> = ({ destination, setPage, onBookNow }) => {
    const [activeImage, setActiveImage] = useState(destination.imageUrl);
    const [activeTab, setActiveTab] = useState<Tab>('about');
    const [isLoading, setIsLoading] = useState(true);
    // refs for tracking touch/swipe gestures
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const touchEndRef = useRef<{ x: number; y: number } | null>(null);
    // separate refs for main image swipe (carousel/drag)
    const mainImageTouchStartRef = useRef<{ x: number; y: number } | null>(null);
    const mainImageTouchEndRef = useRef<{ x: number; y: number } | null>(null);
    const mainImageContainerRef = useRef<HTMLDivElement | null>(null);

    // carousel state: compute images array and current index
    const imgs = (destination.galleryImages && destination.galleryImages.length > 0)
        ? destination.galleryImages
        : [destination.imageUrl].filter(Boolean) as string[];
    const [currentIndex, setCurrentIndex] = useState<number>(() => {
        const idx = imgs.indexOf(destination.imageUrl || '');
        return idx >= 0 ? idx : 0;
    });

    // drag/animation state for carousel
    const [dragX, setDragX] = useState<number>(0); // live drag offset in px
    const dragXRef = useRef<number>(0);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);
    const animTimeoutRef = useRef<number | null>(null);
    const ANIM_DURATION = 300; // ms

    // keep activeImage in sync with currentIndex
    useEffect(() => {
        if (imgs[currentIndex]) setActiveImage(imgs[currentIndex]);
    }, [currentIndex]);
    
    const tiers = Array.isArray(destination.priceTiers) && destination.priceTiers.length > 0 ? destination.priceTiers : [{ price: 0 }];
    const startingPrice = Math.min(...tiers.map(t => t?.price ?? 0));
    const formattedPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(startingPrice);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // set document title for better UX / SEO when viewing a destination
    useEffect(() => {
        try {
            // If appSettings.brandName is available via global state, we'd include it; fallback to destination title only
            document.title = destination.title;
        } catch (e) {}
    }, [destination.title]);

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 350);
        return () => clearTimeout(t);
    }, []);

    if (isLoading) return <DestinationDetailSkeleton />;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'itinerary':
                return (
                    <section className="itinerary-section">
                        <div className="itinerary-timeline">
                            {(destination.itinerary ?? []).map(item => (
                                <div key={item.day} className="itinerary-item">
                                    <div className="itinerary-day-marker">Hari {item.day}</div>
                                        <div className="itinerary-content">
                                            <h4>{item.title}</h4>
                                            {/* Render rich text from editor: sanitize before injecting as HTML */}
                                            <div className="itinerary-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.description || '') }} />
                                        </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            case 'facilities':
                return (
                    <section className="facilities-section">
                        <FacilitiesList facilities={destination.facilities} />
                    </section>
                );
            case 'about':
            default:
                return <div className="blog-detail-content" dangerouslySetInnerHTML={{ __html: destination.longDescription }} />;
        }
    };

    return (
        <div className="page-container destination-detail-page">
            <div className="container">
                <div className="page-header-with-back">
                    <h1>{destination.title}</h1>
                </div>

                <section className="gallery-container">
                    <div
                        className="main-image"
                        ref={(el) => (mainImageContainerRef.current = el)}
                    >
                        <div
                            className="main-image-track"
                            onTouchStart={(e) => {
                                if (isAnimating) return;
                                const t = e.touches[0];
                                mainImageTouchStartRef.current = { x: t.clientX, y: t.clientY };
                                mainImageTouchEndRef.current = null;
                                if (animTimeoutRef.current) window.clearTimeout(animTimeoutRef.current);
                            }}
                            onTouchMove={(e) => {
                                if (isAnimating) return;
                                const start = mainImageTouchStartRef.current;
                                if (!start) return;
                                const t = e.touches[0];
                                const dx = t.clientX - start.x;
                                setDragX(dx);
                                dragXRef.current = dx;
                                mainImageTouchEndRef.current = { x: t.clientX, y: t.clientY };
                            }}
                            onTouchEnd={() => {
                                if (isAnimating) return;
                                const start = mainImageTouchStartRef.current;
                                const end = mainImageTouchEndRef.current;
                                if (!start) {
                                    setDragX(0);
                                    return;
                                }
                                const dx = (end ? end.x : start.x) - start.x;
                                const dy = end ? end.y - start.y : 0;
                                const absDx = Math.abs(dx);
                                const absDy = Math.abs(dy);
                                const SWIPE_THRESHOLD = 40; // px
                                if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
                                    // move to next/prev slide
                                    if (dx < 0) {
                                        setCurrentIndex(i => Math.min(imgs.length - 1, i + 1));
                                    } else {
                                        setCurrentIndex(i => Math.max(0, i - 1));
                                    }
                                }
                                // animate snap
                                setIsAnimating(true);
                                setDragX(0);
                                animTimeoutRef.current = window.setTimeout(() => {
                                    setIsAnimating(false);
                                    animTimeoutRef.current = null;
                                }, ANIM_DURATION);
                                mainImageTouchStartRef.current = null;
                                mainImageTouchEndRef.current = null;
                            }}
                            style={{
                                transform: `translateX(${ -currentIndex * 100 + (dragX / (mainImageContainerRef.current?.clientWidth || window.innerWidth)) * 100 }%)`,
                                transition: isAnimating ? `transform ${ANIM_DURATION}ms ease` : 'none',
                            }}
                        >
                            {imgs.map((src, idx) => (
                                <div
                                    key={idx}
                                    className={`main-image-slide ${idx === currentIndex ? 'active' : ''}`}
                                    style={{ backgroundImage: `url(${src})` }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="thumbnail-grid">

                        {imgs.map((img, index) => (
                            <button 
                                key={index} 
                                className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                                onClick={() => setCurrentIndex(index)}
                                aria-label={`Lihat gambar ${index + 1}`}
                            >
                                <img src={img} alt={`Thumbnail ${index + 1}`} loading="lazy" decoding="async" />
                            </button>
                        ))}
                    </div>
                </section>
                
                <div className="destination-content-layout">
                    <main className="destination-main-content">
                        <div className="destination-tabs">
                            <div className="tab-list" role="tablist" aria-label="Informasi Destinasi">
                                <button
                                    id="tab-about"
                                    className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('about')}
                                    role="tab"
                                    aria-selected={activeTab === 'about'}
                                    aria-controls="panel-about"
                                >
                                    <span className="tab-button-icon" aria-hidden>
                                        <CameraIcon />
                                    </span>
                                    <span className="tab-button-label">Tentang</span>
                                </button>
                                <button
                                    id="tab-itinerary"
                                    className={`tab-button ${activeTab === 'itinerary' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('itinerary')}
                                    role="tab"
                                    aria-selected={activeTab === 'itinerary'}
                                    aria-controls="panel-itinerary"
                                >
                                    <span className="tab-button-icon" aria-hidden>
                                        <MapPinIcon />
                                    </span>
                                    <span className="tab-button-label">Itinerary</span>
                                </button>
                                <button
                                    id="tab-facilities"
                                    className={`tab-button ${activeTab === 'facilities' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('facilities')}
                                    role="tab"
                                    aria-selected={activeTab === 'facilities'}
                                    aria-controls="panel-facilities"
                                >
                                    <span className="tab-button-icon" aria-hidden>
                                        <CheckCircleIcon />
                                    </span>
                                    <span className="tab-button-label">Fasilitas</span>
                                </button>
                            </div>
                        </div>
                        
                        <div
                            id={`panel-${activeTab}`}
                            className="tab-panel"
                            role="tabpanel"
                            aria-labelledby={`tab-${activeTab}`}
                            onTouchStart={(e) => {
                                const t = e.touches[0];
                                touchStartRef.current = { x: t.clientX, y: t.clientY };
                                touchEndRef.current = null;
                            }}
                            onTouchMove={(e) => {
                                const t = e.touches[0];
                                touchEndRef.current = { x: t.clientX, y: t.clientY };
                            }}
                            onTouchEnd={() => {
                                const start = touchStartRef.current;
                                const end = touchEndRef.current;
                                if (!start || !end) return;
                                const dx = end.x - start.x;
                                const dy = end.y - start.y;
                                const absDx = Math.abs(dx);
                                const absDy = Math.abs(dy);
                                const SWIPE_THRESHOLD = 50; // px
                                if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
                                    // horizontal swipe
                                    const tabs: Tab[] = ['about', 'itinerary', 'facilities'];
                                    const currentIndex = tabs.indexOf(activeTab);
                                    if (dx < 0) {
                                        // swipe left => next tab
                                        const nextIndex = Math.min(tabs.length - 1, currentIndex + 1);
                                        if (nextIndex !== currentIndex) setActiveTab(tabs[nextIndex]);
                                    } else {
                                        // swipe right => previous tab
                                        const prevIndex = Math.max(0, currentIndex - 1);
                                        if (prevIndex !== currentIndex) setActiveTab(tabs[prevIndex]);
                                    }
                                }
                                touchStartRef.current = null;
                                touchEndRef.current = null;
                            }}
                        >
                            {renderTabContent()}
                        </div>

                    </main>

                    <aside className="info-sidebar">
                        <h3>Informasi Paket</h3>
                        <div className="info-item">
                            <ClockIcon />
                            <div>
                                <span>Durasi</span>
                                <strong>{destination.duration} Hari</strong>
                            </div>
                        </div>
                        <div className="info-item">
                            <UsersIcon />
                            <div>
                                <span>Minimal Peserta</span>
                                <strong>{destination.minPeople} Orang</strong>
                            </div>
                        </div>
                    </aside>
                </div>

            </div>
            <div className="sticky-booking-bar">
                <div className="container booking-bar-content">
                    <div>
                        <span className="booking-price-label">Mulai dari</span>
                        <span className="booking-price">{formattedPrice} <span>/ org</span></span>
                    </div>
                    <button className="btn btn-primary btn-large" onClick={() => onBookNow(destination)}>Pesan</button>
                </div>
            </div>
        </div>
    );
};