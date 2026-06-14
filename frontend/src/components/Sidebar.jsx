import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    Target,
    Briefcase,
    Map as MapIcon,
    TrendingUp,
    Settings,
    ChevronLeft,
    ChevronRight,
    Menu,
    BrainCircuit,
    Sun,
    Moon
} from 'lucide-react';
import './Sidebar.css';

const THEME_STORAGE_KEY = 'gap2grow-theme';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [theme, setTheme] = useState(() => {
        return window.localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    });

    // Handle window resize for responsive behavior
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsCollapsed(false); // Mobile sidebar is always expanded when open
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme;
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        window.dispatchEvent(new CustomEvent('gap2grow-theme-change', { detail: { theme } }));
    }, [theme]);

    useEffect(() => {
        const handleThemeSync = (event) => {
            const nextTheme = event?.detail?.theme;
            if (nextTheme === 'light' || nextTheme === 'dark') {
                setTheme(nextTheme);
            }
        };

        window.addEventListener('gap2grow-theme-change', handleThemeSync);
        return () => window.removeEventListener('gap2grow-theme-change', handleThemeSync);
    }, []);

    const menuItems = [
        { name: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Resume Analyzer', path: '/resume-analyzer', icon: <FileText size={20} /> },
        { name: 'Skill Gap Forecast', path: '/skill-gap', icon: <Target size={20} /> },
        { name: 'Market Intelligence', path: '/market-intelligence', icon: <Briefcase size={20} /> },
        { name: 'Learning Roadmap', path: '/roadmap', icon: <MapIcon size={20} /> },
        { name: 'AI Career Report', path: '/career-report', icon: <TrendingUp size={20} /> },
    ];

    const handleToggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const handleMobileToggle = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    const handleThemeToggle = () => {
        setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
    };

    const closeMobileSidebar = () => {
        if (isMobile) {
            setIsMobileOpen(false);
        }
    };

    return (
        <>
            {/* Mobile Toggle Button (Visible only on small screens) */}
            {isMobile && !isMobileOpen && (
                <button className="mobile-toggle" onClick={handleMobileToggle}>
                    <Menu size={24} />
                </button>
            )}

            {/* Mobile Overlay */}
            {isMobile && (
                <div
                    className={`mobile-overlay ${isMobileOpen ? 'active' : ''}`}
                    onClick={closeMobileSidebar}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`sidebar-container 
          ${isCollapsed && !isMobile ? 'collapsed' : 'expanded'} 
          ${isMobile && !isMobileOpen ? 'mobile-closed' : ''}`
                }
            >
                <div className="sidebar-header">
                    <div className="logo-container">
                        <div className="logo-icon" style={{ background: 'transparent', padding: 0, display: 'flex', alignItems: 'center' }}>
                            <img src="/logo.jpeg" alt="Gap2Grow Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                        </div>
                        <span className="logo-text text-gradient">Gap2Grow</span>
                    </div>

                    {/* Desktop Collapse Toggle */}
                    {!isMobile && (
                        <button className="toggle-btn" onClick={handleToggleCollapse}>
                            <ChevronLeft size={20} />
                        </button>
                    )}

                    {/* Desktop Expand Toggle (when collapsed) */}
                    {!isMobile && isCollapsed && (
                        <div style={{ position: 'absolute', right: '-12px', top: '28px', zIndex: 60 }}>
                            <button
                                className="toggle-btn"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', padding: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                onClick={handleToggleCollapse}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item, index) => (
                        <NavLink
                            key={index}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            title={isCollapsed && !isMobile ? item.name : ''}
                            onClick={closeMobileSidebar}
                        >
                            <div className="nav-icon">{item.icon}</div>
                            <span className="nav-label">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="theme-toggle-btn" onClick={handleThemeToggle} type="button">
                        <div className="nav-icon">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</div>
                        <span className="nav-label">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>

                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={isCollapsed && !isMobile ? 'Settings' : ''}
                        onClick={closeMobileSidebar}
                    >
                        <div className="nav-icon"><Settings size={20} /></div>
                        <span className="nav-label">Settings</span>
                    </NavLink>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
