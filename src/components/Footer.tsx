import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Page, AppSettings } from '../types';
import { FacebookIcon, InstagramIcon, TwitterIcon } from './Icons';
import { Link } from 'react-router-dom';

interface FooterProps {
  setPage: (page: Page) => void;
  appSettings: AppSettings;
}

export const Footer: React.FC<FooterProps> = ({ setPage, appSettings }) => {
    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, page: Page) => {
        e.preventDefault();
        setPage(page);
    };

    const { theme } = useTheme();
    const logoUrl = theme === 'dark'
        ? appSettings.logoDarkUrl || appSettings.logoLightUrl
        : appSettings.logoLightUrl || appSettings.logoDarkUrl;

    const socialLinks = [
        { name: 'facebook', url: appSettings.facebookUrl, icon: <FacebookIcon /> },
        { name: 'instagram', url: appSettings.instagramUrl, icon: <InstagramIcon /> },
        { name: 'twitter', url: appSettings.twitterUrl, icon: <TwitterIcon /> },
    ].filter(link => link.url);

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-section">
                        <Link to="/" className="logo" onClick={() => { try { setPage && setPage('home'); } catch {} }}>
                            {logoUrl ? <img src={logoUrl} alt={`${appSettings.brandName} Logo`} /> : appSettings.brandName}
                        </Link>
                        <p>{appSettings.tagline}</p>
                    </div>
                     <div className="footer-section">
                        <h3>Alamat</h3>
                        <p>{appSettings.address}</p>
                    </div>
                    <div className="footer-section">
                        <h3>Kontak</h3>
                        <p>
                            Email: <a href={`mailto:${appSettings.email}`} style={{color: 'var(--text-secondary)'}}>{appSettings.email}</a>
                        </p>
                    </div>
                    {socialLinks.length > 0 && (
                        <div className="footer-section">
                            <h3>Sosial Media</h3>
                             <ul className="social-links">
                                {socialLinks.map(social => (
                                    <li key={social.name}>
                                        <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={`Kunjungi kami di ${social.name}`}>
                                            {social.icon}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                 <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} {appSettings.brandName}. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};