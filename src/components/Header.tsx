import React, { useState } from 'react';
import { useWishlist } from '../contexts/WishlistContext';
import { Page, AppSettings } from '../types';
import { SunIcon, MoonIcon, HeartIcon, MenuIcon, XIcon } from './Icons';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  setPage: (page: Page) => void;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ setPage, appSettings, setAppSettings, isAuthenticated = false }) => {
  const { wishlist } = useWishlist();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const navigate = useNavigate();
  const handleNavClick = (page: Page, to: string) => {
      // Keep legacy state in sync if setPage exists
      try { setPage && setPage(page); } catch (e) {}
      // Navigate immediately
      navigate(to);
      // Delay closing mobile menu slightly so touch/click :active feedback is visible
      if (isMobileMenuOpen) {
        setTimeout(() => setIsMobileMenuOpen(false), 120);
      }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleTheme = () => {
    // Only update runtime theme to avoid mutating persisted appSettings and triggering re-renders for heavy components
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  const logoUrl = theme === 'dark'
    ? appSettings.logoDarkUrl || appSettings.logoLightUrl
    : appSettings.logoLightUrl || appSettings.logoDarkUrl;

  // Prefetch both logo variants so switching theme only re-requests the small logo images
  React.useEffect(() => {
    const urls = [appSettings.logoLightUrl, appSettings.logoDarkUrl].filter(Boolean) as string[];
    const images: HTMLImageElement[] = [];
    urls.forEach(u => {
      try {
        const img = new Image();
        img.src = u;
        images.push(img);
      } catch (e) {}
    });
    return () => {
      // dereference to allow GC
      images.forEach(i => { try { i.src = ''; } catch {} });
    };
  }, [appSettings.logoLightUrl, appSettings.logoDarkUrl]);
    
  const navItems: { page: Page; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'destinations', label: 'Destinasi' },
    { page: 'blog', label: 'Blog' },
    // Admin link should only be shown for authenticated users
    ...(isAuthenticated ? [{ page: 'admin' as Page, label: 'Admin' }] : []),
  ];

  return (
    <>
      <header className="header">
        <div className="container header-nav">
          <Link to="/" className="logo" onClick={() => handleNavClick('home', '/') }>
            {logoUrl ? <img src={logoUrl} alt={`${appSettings.brandName} Logo`} /> : appSettings.brandName}
          </Link>
          <nav>
              <ul className="nav-links">
              {navItems.map(item => (
                <li key={item.page}><NavLink to={item.page === 'home' ? '/' : `/${item.page}`} onClick={() => handleNavClick(item.page, item.page === 'home' ? '/' : `/${item.page}`)} className={({isActive}) => isActive ? 'active' : ''}>{item.label}</NavLink></li>
              ))}
            </ul>
          </nav>
          <div className="header-actions">
             <button className="wishlist-indicator" onClick={() => { try { setPage && setPage('wishlist'); } catch {} ; navigate('/wishlist'); }} aria-label={`Wishlist, ${wishlist.length} items`}>
                <HeartIcon />
                {wishlist.length > 0 && <span className="wishlist-count">{wishlist.length}</span>}
              </button>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
             <button className="hamburger" aria-label="Open menu" onClick={toggleMobileMenu}>
                <MenuIcon />
              </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-nav-overlay ${isMobileMenuOpen ? 'visible' : ''}`} onClick={toggleMobileMenu}></div>
      <nav className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`} aria-hidden={!isMobileMenuOpen}>
        <div className="mobile-nav-header">
      <Link to="/" className="logo" onClick={() => handleNavClick('home', '/') }>
        {logoUrl ? <img src={logoUrl} alt={`${appSettings.brandName} Logo`} /> : appSettings.brandName}
      </Link>
            <button className="mobile-nav-close" onClick={toggleMobileMenu} aria-label="Close menu">
                <XIcon />
            </button>
        </div>
        <ul className="mobile-nav-links">
            {navItems.map(item => (
              <li key={item.page}><NavLink to={item.page === 'home' ? '/' : `/${item.page}`} onClick={() => handleNavClick(item.page, item.page === 'home' ? '/' : `/${item.page}`)} className={({isActive}) => isActive ? 'active' : ''}>{item.label}</NavLink></li>
            ))}
        </ul>
      </nav>
    </>
  );
};