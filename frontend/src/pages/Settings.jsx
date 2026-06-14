import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    PencilLine,
    Github,
    Mail,
    Shield,
    LogOut,
    Sun,
    Moon,
    Bell,
    CheckCircle2,
    Unplug
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import './Settings.css';

const THEME_STORAGE_KEY = 'gap2grow-theme';

function Toast({ toast, onClose }) {
    if (!toast) return null;

    return (
        <div className={`settings-toast ${toast.type || 'success'}`} role="status" aria-live="polite">
            <CheckCircle2 size={15} />
            <span>{toast.message}</span>
            <button type="button" onClick={onClose} aria-label="Close notification">x</button>
        </div>
    );
}

function ConfirmModal({ isOpen, title, description, confirmText, onCancel, onConfirm, danger = false }) {
    if (!isOpen) return null;

    return (
        <div className="settings-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
            <div className="glass-card settings-modal">
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="settings-modal-actions">
                    <button type="button" className="settings-subtle-btn" onClick={onCancel}>Cancel</button>
                    <button
                        type="button"
                        className={`settings-subtle-btn ${danger ? 'danger' : 'primary'}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AccountCard({ profile, onEdit }) {
    const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'User';
    const avatarFallback = (profile?.firstName || 'U').charAt(0).toUpperCase();

    return (
        <section className="glass-card settings-card">
            <div className="settings-card-head">
                <div>
                    <h2>Account</h2>
                    <p className="text-muted">Basic profile details used across your workspace.</p>
                </div>
                <button type="button" className="settings-icon-btn" onClick={onEdit} title="Edit account">
                    <PencilLine size={14} />
                </button>
            </div>

            <div className="settings-account-row">
                {profile?.profileImage ? (
                    <img className="settings-avatar" src={profile.profileImage} alt={fullName} />
                ) : (
                    <div className="settings-avatar fallback">{avatarFallback}</div>
                )}
                <div className="settings-account-meta">
                    <div className="settings-account-name"><User size={14} /> {fullName}</div>
                    <div className="settings-account-email"><Mail size={14} /> {profile?.email || 'No email found'}</div>
                </div>
            </div>
        </section>
    );
}

function GitHubCard({
    profile,
    githubUsername,
    setGithubUsername,
    saving,
    onConnect,
    onDisconnect,
    onShowToast
}) {
    const isConnected = Boolean(profile?.githubUsername);

    return (
        <section className="glass-card settings-card">
            <div className="settings-card-head">
                <div>
                    <h2>Connected Accounts</h2>
                    <p className="text-muted">Manage third-party account connections.</p>
                </div>
            </div>

            <div className="settings-connection-row">
                <div className="settings-provider">
                    <div className="settings-provider-icon"><Github size={16} /></div>
                    <div>
                        <strong>GitHub</strong>
                        <p className="text-muted">
                            {isConnected ? `Connected as @${profile.githubUsername}` : 'Not connected'}
                        </p>
                    </div>
                </div>

                {isConnected ? (
                    <button
                        type="button"
                        className="settings-subtle-btn"
                        disabled={saving}
                        onClick={onDisconnect}
                    >
                        <Unplug size={14} />
                        {saving ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                ) : (
                    <form className="settings-inline-form" onSubmit={onConnect}>
                        <input
                            value={githubUsername}
                            onChange={(event) => setGithubUsername(event.target.value)}
                            placeholder="GitHub username"
                            className="input-field"
                            aria-label="GitHub username"
                        />
                        <button type="submit" className="settings-subtle-btn primary" disabled={saving || !githubUsername.trim()}>
                            {saving ? 'Connecting...' : 'Connect'}
                        </button>
                    </form>
                )}
            </div>

            <div className="settings-connection-row muted-only">
                <div className="settings-provider">
                    <div className="settings-provider-icon">G</div>
                    <div>
                        <strong>Google</strong>
                        <p className="text-muted">Connected (future sync controls coming soon)</p>
                    </div>
                </div>
                <button
                    type="button"
                    className="settings-subtle-btn"
                    onClick={() => onShowToast('Google account controls are coming soon.', 'info')}
                >
                    Manage
                </button>
            </div>
        </section>
    );
}

function Toggle({ checked, onChange, label, icon }) {
    return (
        <label className="settings-toggle-row">
            <div className="settings-toggle-label">
                {icon}
                <span>{label}</span>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                className={`settings-toggle ${checked ? 'active' : ''}`}
                onClick={onChange}
            >
                <span className="settings-toggle-thumb" />
            </button>
        </label>
    );
}

function PreferencesCard({ theme, notificationsEnabled, onThemeToggle, onNotificationsToggle }) {
    return (
        <section className="glass-card settings-card">
            <div className="settings-card-head">
                <div>
                    <h2>Preferences</h2>
                    <p className="text-muted">Keep your workspace comfortable and focused.</p>
                </div>
            </div>

            <div className="settings-toggle-list">
                <Toggle
                    checked={theme === 'dark'}
                    onChange={onThemeToggle}
                    icon={theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                    label={theme === 'dark' ? 'Dark mode' : 'Light mode'}
                />
                <Toggle
                    checked={notificationsEnabled}
                    onChange={onNotificationsToggle}
                    icon={<Bell size={15} />}
                    label="Notifications"
                />
            </div>
        </section>
    );
}

function SecurityCard({ onLogout }) {
    return (
        <section className="glass-card settings-card settings-security-card">
            <div className="settings-card-head">
                <div>
                    <h2>Security</h2>
                    <p className="text-muted">Session and access controls.</p>
                </div>
            </div>

            <button type="button" className="settings-subtle-btn danger" onClick={onLogout}>
                <LogOut size={14} />
                Logout
            </button>
        </section>
    );
}

function SettingsPage() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [githubUsername, setGithubUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [theme, setTheme] = useState(() => window.localStorage.getItem(THEME_STORAGE_KEY) || 'light');
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        const raw = window.localStorage.getItem('gap2grow-notifications');
        return raw ? raw === 'true' : true;
    });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(null), 2400);
        return () => window.clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await userService.getProfile();
                if (!cancelled) {
                    setProfile(data);
                    setGithubUsername(data.githubUsername || '');
                }
            } catch (err) {
                if (!cancelled) setError(err.error || 'Failed to load profile');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', resolvedTheme);
        document.documentElement.style.colorScheme = resolvedTheme;
        window.localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
        window.dispatchEvent(new CustomEvent('gap2grow-theme-change', { detail: { theme: resolvedTheme } }));
    }, [theme]);

    useEffect(() => {
        window.localStorage.setItem('gap2grow-notifications', notificationsEnabled ? 'true' : 'false');
    }, [notificationsEnabled]);

    const handleConnect = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await userService.connectGitHub(githubUsername);
            setProfile(response.user);
            setGithubUsername(response.user.githubUsername || githubUsername);
            showToast('GitHub connected successfully.');
        } catch (err) {
            setError(err.error || 'Failed to connect GitHub account');
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        setSaving(true);
        setError('');

        try {
            const response = await userService.disconnectGitHub();
            setProfile(response.user);
            setGithubUsername('');
            showToast('GitHub disconnected successfully.');
        } catch (err) {
            setError(err.error || 'Failed to disconnect GitHub account');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        setShowLogoutConfirm(false);
        showToast('Logged out successfully.');
        window.setTimeout(() => {
            logout();
            navigate('/login');
        }, 450);
    };

    const subtitle = useMemo(() => {
        if (!profile) return 'Manage your account and preferences.';
        return `Signed in as ${profile.email || 'user'}`;
    }, [profile]);

    if (loading) {
        return (
            <div className="settings-page">
                <div className="settings-shell glass-card">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-shell">
                <header className="settings-header">
                    <div>
                        <h1>Settings</h1>
                        <p className="text-muted">{subtitle}</p>
                    </div>
                    <div className="settings-header-pill">
                        <Shield size={14} />
                        <span>Secure Session</span>
                    </div>
                </header>

                {error && <p className="settings-error">{error}</p>}

                <div className="settings-grid">
                    <AccountCard profile={profile} onEdit={() => navigate('/profile')} />
                    <GitHubCard
                        profile={profile}
                        githubUsername={githubUsername}
                        setGithubUsername={setGithubUsername}
                        saving={saving}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        onShowToast={showToast}
                    />
                    <PreferencesCard
                        theme={theme}
                        notificationsEnabled={notificationsEnabled}
                        onThemeToggle={() => {
                            setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
                            showToast(theme === 'light' ? 'Dark mode enabled.' : 'Light mode enabled.');
                        }}
                        onNotificationsToggle={() => {
                            setNotificationsEnabled((value) => !value);
                            showToast(notificationsEnabled ? 'Notifications muted.' : 'Notifications enabled.');
                        }}
                    />
                    <SecurityCard onLogout={() => setShowLogoutConfirm(true)} />
                </div>
            </div>

            <ConfirmModal
                isOpen={showLogoutConfirm}
                title="Confirm logout"
                description="Are you sure you want to logout?"
                confirmText="Logout"
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                danger
            />

            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}

export default SettingsPage;
