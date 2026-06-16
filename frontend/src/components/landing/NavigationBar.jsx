import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './NavigationBar.css';
import logoImg from '../../assets/logo.jpeg';

const THEME_STORAGE_KEY = 'gap2grow-theme';

const NavigationBar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  });
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleThemeToggle = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <nav className={`navbar-container ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="navbar-content">
        
        {/* Brand */}
        <div className="nav-brand" onClick={() => handleNavClick('#home')}>
          <img src={logoImg} alt="Gap2Grow Logo" className="nav-logo-icon" style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px' }} />
          <span className="nav-brand-text">Gap2Grow</span>
        </div>

        {/* Desktop Links */}
        <div className="nav-links">
          {navLinks.map((link) => (
            <button key={link.name} className="nav-link-btn" onClick={() => handleNavClick(link.href)}>
              <span className="nav-link-text">{link.name}</span>
              <span className="nav-link-underline"></span>
            </button>
          ))}
        </div>

        {/* Action Button */}
        <div className="nav-actions">
          <button className="nav-theme-toggle" onClick={handleThemeToggle} type="button" aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="nav-signin-btn" onClick={() => navigate('/login')}>
            Sign In
          </button>
          
          <button className="nav-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} className="icon-spin-out" /> : <Menu size={24} className="icon-spin-in" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-links">
          {navLinks.map((link) => (
            <button key={link.name} className="mobile-link-btn" onClick={() => handleNavClick(link.href)}>
              {link.name}
            </button>
          ))}
          <button className="mobile-link-btn" onClick={handleThemeToggle} type="button">
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          <button className="mobile-signin-btn" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
