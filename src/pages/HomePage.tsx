import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Destination, BlogPost, Page, HeroSlide, AppSettings } from '../types';
import { DestinationCard } from '../components/DestinationCard';
import { BlogCard } from '../components/BlogCard';
import DestinationSkeleton from '../components/DestinationSkeleton';
import BlogSkeleton from '../components/BlogSkeleton';
import { SearchIcon } from '../components/Icons';

interface HomePageProps {
    onSearch: (query: string) => void;
    onViewDetail: (destination: Destination) => void;
    onBookNow: (destination: Destination) => void;
    onCreateOrder?: (orderData: { customerName: string; customerPhone: string; participants: number; destination: Destination; departureDate?: string; totalPrice: number; }) => void;
    onViewBlogDetail: (post: BlogPost) => void;
    setPage: (page: Page) => void;
    destinations: Destination[];
    blogPosts: BlogPost[];
    appSettings: AppSettings;
    isLoading?: boolean;
    reviews?: any[];
}
import ReviewCard from '../components/ReviewCard';
import ReviewSkeleton from '../components/ReviewSkeleton';

// Typing placeholder hook: cycles through phrases and types them into the input's placeholder
function useTypingPlaceholder(inputRef: React.RefObject<HTMLInputElement>, phrases: string[], typeSpeed = 80, pause = 2000) {
    const idxRef = React.useRef(0);
    const charRef = React.useRef(0);
    const timerRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        if (!phrases || phrases.length === 0) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const el = inputRef.current;
        if (!el) return;

        // bail out for data-saver / slow connections
        const nav = (navigator as any);
        const connection = nav && nav.connection;
        if (connection) {
            const saveData = !!connection.saveData;
            const slowTypes = ['slow-2g', '2g', '3g'];
            const effective = connection.effectiveType;
            if (saveData || (effective && slowTypes.includes(effective))) return;
        }

        // helper checks
        const isFocused = () => document.activeElement === el;
        const isHidden = () => document.hidden;

        // use IntersectionObserver to ensure hero is visible (avoid typing when offscreen)
        let heroVisible = true;
        const heroEl = el.closest && (el.closest('.hero') as HTMLElement | null);
        let io: IntersectionObserver | null = null;
        if (heroEl && 'IntersectionObserver' in window) {
            heroVisible = false;
            io = new IntersectionObserver((entries) => {
                heroVisible = entries.some(en => en.isIntersecting && en.intersectionRatio > 0);
            }, { threshold: 0.1 });
            io.observe(heroEl);
        }

        const loop = () => {
            if (!el) return;
            if (isHidden() || !heroVisible) {
                // defer while page hidden or hero not visible
                timerRef.current = window.setTimeout(loop, 1000);
                return;
            }
            if (isFocused() || (el as HTMLInputElement).value) {
                // pause typing while user is interacting with input
                timerRef.current = window.setTimeout(loop, 500);
                return;
            }

            const phrase = phrases[idxRef.current % phrases.length];
            if (charRef.current <= phrase.length) {
                el.placeholder = phrase.slice(0, charRef.current);
                charRef.current++;
                timerRef.current = window.setTimeout(loop, typeSpeed);
            } else {
                // finished typing one phrase, wait then clear and next
                timerRef.current = window.setTimeout(() => {
                    charRef.current = 0;
                    idxRef.current++;
                    // small delay before typing next
                    timerRef.current = window.setTimeout(loop, 200);
                }, pause);
            }
        };

        loop();

        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
            if (io && heroEl) io.unobserve(heroEl);
            if (el) el.placeholder = '';
        };
    }, [inputRef, phrases, typeSpeed, pause]);
}

const Hero = ({ onSearch, slides, categories }: { onSearch: (query: string) => void; slides: HeroSlide[]; categories?: string[] }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isFading, setIsFading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    
    const activeSlides = slides && slides.length > 0 ? slides : [{id: 0, title: 'Selamat Datang', subtitle: 'Atur hero section dari dashboard admin.', imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop' }];

    // derive phrases from categories (unique, non-empty)
    const phrases = useMemo(() => {
        if (!categories || categories.length === 0) return ['Cari destinasi, misal: Bali'];
        const unique = Array.from(new Set(categories.map(s => (s || '').trim()).filter(Boolean)));
        if (unique.length === 0) return ['Cari destinasi, misal: Bali'];
        // limit to reasonable number to avoid long cycles
        return unique.slice(0, 12);
    }, [categories]);

    // attach typing placeholder to input
    useTypingPlaceholder(inputRef, phrases, 70, 2200);


    useEffect(() => {
        if (activeSlides.length <= 1) return;
        const timer = setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentSlide((prevSlide) => (prevSlide + 1) % activeSlides.length);
                setIsFading(false);
            }, 500); // Corresponds to CSS transition duration
        }, 5000); // Time between slide changes

        return () => clearTimeout(timer);
    }, [currentSlide, activeSlides.length]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm.trim());
        }
    };

    return (
        <section className="hero">
            {activeSlides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${slide.imageUrl})` }}
                    aria-hidden={index !== currentSlide}
                ></div>
            ))}
            <div className="hero-overlay"></div>
            <div className="container hero-content">
                <div className={`hero-text-content ${isFading ? 'fade' : ''}`}>
                    <h1>{activeSlides[currentSlide].title}</h1>
                    <p>{activeSlides[currentSlide].subtitle}</p>
                </div>
                <form className="search-bar" onSubmit={handleSearchSubmit}>
                    <input 
                        ref={inputRef}
                        type="text" 
                        aria-label="Cari destinasi"
                        placeholder="" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => {
                            // clear placeholder immediately on focus to avoid distraction
                            if (inputRef.current) inputRef.current.placeholder = '';
                        }}
                        onBlur={() => {
                            // no-op: typing hook will resume and re-populate placeholder when appropriate
                        }}
                    />
                    <button type="submit" aria-label="Cari">
                        <SearchIcon />
                    </button>
                </form>
            </div>
        </section>
    );
};

const PopularDestinations = ({ destinations, onViewDetail, onBookNow, isLoading }: { destinations: Destination[]; onViewDetail: (d: Destination) => void; onBookNow: (d: Destination) => void; isLoading?: boolean }) => (
    <section className="destinations-section">
        <div className="container">
            <div className="section-header">
                <h2>Destinasi Populer</h2>
                <p>Paket wisata yang paling banyak diminati oleh para petualang seperti Anda.</p>
            </div>
            <div className="destinations-grid homepage-grid">
                {isLoading ? Array.from({ length: 4 }).map((_, i) => <DestinationSkeleton key={i} />) : destinations.slice(0, 4).map(dest => <DestinationCard key={dest.id} destination={dest} onViewDetail={onViewDetail} onBookNow={onBookNow} showCategories={false} />)}
            </div>
        </div>
    </section>
);

const AllDestinationsSection = ({ destinations, onViewDetail, onBookNow, setPage }: { destinations: Destination[]; onViewDetail: (d: Destination) => void; onBookNow: (d: Destination) => void; setPage: (page: Page) => void; }) => {
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const navigate = useNavigate();

    const categories = useMemo(() => {
        const allCats = destinations.flatMap(d => d.categories || []);
        const uniqueCats = ['Semua', ...Array.from(new Set(allCats)).sort()];
        return uniqueCats;
    }, [destinations]);

    const filteredDestinations = useMemo(() => {
        if (selectedCategory === 'Semua') {
            return destinations;
        }
        return destinations.filter(d => d.categories?.includes(selectedCategory));
    }, [destinations, selectedCategory]);

    return (
        <section className="destinations-section" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="container">
                <div className="section-header">
                    <h2>Jelajahi Semua Destinasi</h2>
                    <p>Dari pegunungan hingga lautan, temukan petualangan yang menanti Anda.</p>
                </div>

                {categories.length > 1 && (
                    <div className="category-filter-list">
                        {categories.map(cat => (
                            <button 
                                key={cat}
                                className={`category-filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
                
                {filteredDestinations.length > 0 ? (
                    <div className="destinations-grid homepage-grid">
                        {filteredDestinations.slice(0, 6).map(dest => <DestinationCard key={dest.id} destination={dest} onViewDetail={onViewDetail} onBookNow={onBookNow} showCategories={false} />)}
                    </div>
                ) : (
                    <div className="no-results" style={{ padding: '1rem 0' }}>
                        <p>Tidak ada destinasi yang cocok dengan kategori "{selectedCategory}".</p>
                    </div>
                )}
                
                {destinations.length > 6 && (
                    <div className="section-footer">
                        <button className="btn btn-primary" onClick={() => { navigate('/destinations'); try { setPage && setPage('destinations'); } catch {} }}>Lihat Semua Destinasi</button>
                    </div>
                )}
            </div>
        </section>
    );
};


const BlogSection = ({ blogPosts, setPage, onViewDetail, isLoading }: { blogPosts: BlogPost[], setPage: (page: Page) => void, onViewDetail: (post: BlogPost) => void, isLoading?: boolean }) => {
    const navigate = useNavigate();
    return (
    <section className="blog-section">
        <div className="container">
            <div className="section-header">
                <h2>Blog & Berita Terbaru</h2>
                <p>Dapatkan inspirasi, tips, dan berita terbaru dari dunia traveling.</p>
            </div>
            <div className="blog-grid homepage-blog-grid">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <BlogSkeleton key={i} />)
                ) : (blogPosts && blogPosts.length > 0 ? (
                    blogPosts.slice(0, 4).map(post => <BlogCard key={post.id} post={post} onViewDetail={onViewDetail} />)
                ) : (
                    <div className="no-results" style={{ padding: '1rem 0' }}>
                        <p>Belum ada artikel. Tambahkan artikel dari dashboard admin.</p>
                    </div>
                ))}
            </div>
            <div className="section-footer">
                <button className="btn btn-primary" onClick={() => { navigate('/blog'); try { setPage && setPage('blog'); } catch {} }}>Lihat Semua Artikel</button>
            </div>
        </div>
    </section>
    );
}

export const HomePage: React.FC<HomePageProps> = ({ onSearch, onViewDetail, onBookNow, onCreateOrder, onViewBlogDetail, setPage, destinations, blogPosts, appSettings, isLoading = false, reviews = [] }) => {
    // derive categories from destinations to feed the hero typing placeholder
    const categories = React.useMemo(() => {
        if (!destinations) return [] as string[];
        return Array.from(new Set(destinations.flatMap(d => d.categories || [])));
    }, [destinations]);

    const [activeBookingDest, setActiveBookingDest] = useState<Destination | null>(null);
    const navigate = useNavigate();

    const openBookingFromCard = (dest: Destination) => {
        navigate('/order', { state: { destination: dest } });
    };

    return (
        <>
            <Hero onSearch={onSearch} slides={appSettings.heroSlides} categories={categories} />
            <PopularDestinations destinations={destinations} onViewDetail={onViewDetail} onBookNow={openBookingFromCard} isLoading={isLoading} />
            <AllDestinationsSection 
                destinations={destinations} 
                onViewDetail={onViewDetail} 
                onBookNow={openBookingFromCard}
                setPage={setPage}
            />
            <BlogSection blogPosts={blogPosts} setPage={setPage} onViewDetail={onViewBlogDetail} isLoading={isLoading} />
            {reviews && reviews.length > 0 && (
                <section className="reviews-section" style={{ padding: '60px 0' }}>
                    <div className="container">
                        <div className="section-header">
                            <h2>Ulasan Pengunjung</h2>
                            <p>Apa kata mereka tentang pengalaman wisata.</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
                                            {isLoading ? (
                                                Array.from({ length: 3 }).map((_, i) => <ReviewSkeleton key={i} />)
                                            ) : (
                                                (reviews || []).slice(0, 8).map(r => <ReviewCard key={r.id} name={r.name} initials={r.initials} content={r.content} created_at={r.created_at} rating={r.rating} />)
                                            )}
                        </div>
                    </div>
                </section>
            )}
            {/* Booking is now handled by /order page */}
        </>
    );
};

// Render booking modal when a card requests booking
// (Placed after component to keep render logic minimal)
// NOTE: This is intentionally inside the component's return fragment via activeBookingDest

// ...existing code...
