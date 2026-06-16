import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart2, Target, FileText, TrendingUp,
    Clock, ArrowRight, AlertTriangle, CheckCircle,
    Loader2, Zap, BookOpen, Upload, ArrowUpRight,
    ArrowDownRight, Minus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import './Dashboard.css';

/* ─── tiny helpers ─────────────────────────────────────────── */
function scoreColor(s) {
    if (s >= 80) return 'var(--success)';
    if (s >= 50) return 'var(--warning)';
    return 'var(--danger)';
}
function scoreBg(s) {
    if (s >= 80) return 'rgba(5,150,105,0.10)';
    if (s >= 50) return 'rgba(217,119,6,0.10)';
    return 'rgba(220,38,38,0.10)';
}
function scoreLabel(s) {
    if (s >= 80) return 'Excellent';
    if (s >= 50) return 'Promising';
    return 'Building';
}
function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}
function fmtDateTime(iso) {
    if (!iso) return 'No analyses yet';
    return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
    });
}
function fmtAxisDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short'
    });
}
function trendMeta(delta) {
    if (delta > 0) return { label: `+${delta}`, className: 'is-up', icon: <ArrowUpRight size={13} /> };
    if (delta < 0) return { label: `${delta}`, className: 'is-down', icon: <ArrowDownRight size={13} /> };
    return { label: '0', className: 'is-flat', icon: <Minus size={13} /> };
}
function buildSmoothPath(points) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let idx = 1; idx < points.length; idx += 1) {
        const prev = points[idx - 1];
        const curr = points[idx];
        const midX = (prev.x + curr.x) / 2;
        path += ` C ${midX.toFixed(2)} ${prev.y.toFixed(2)}, ${midX.toFixed(2)} ${curr.y.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
    }

    return path;
}

/* ─── Stat card ─────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, accent, trend }) {
    return (
        <div className="ov-stat-card glass-card">
            <div className="ov-stat-icon" style={{ background: accent + '18', color: accent }}>
                {icon}
            </div>
            <div>
                <div className="ov-stat-value" style={{ color: accent }}>{value}</div>
                <div className="ov-stat-label">{label}</div>
                {trend && (
                    <div className={`ov-stat-trend ${trend.className}`}>
                        {trend.icon} {trend.label}
                    </div>
                )}
                {sub && <div className="ov-stat-sub">{sub}</div>}
            </div>
        </div>
    );
}

/* ─── Skeleton loader ────────────────────────────────────────── */
function Skeleton({ h = 20, w = '100%', r = 8, mb = 0 }) {
    return (
        <div
            className="ov-skeleton"
            style={{ height: h, width: w, borderRadius: r, marginBottom: mb }}
        />
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [overview, setOverview] = useState(null);
    const [recent, setRecent] = useState([]);
    const [profile, setProfile] = useState(null);
    const [progressOverTime, setProgressOverTime] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [ctaLoading, setCtaLoading] = useState('');
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const profileMenuRef = useRef(null);

    const handleCtaNavigate = (ctaKey, path) => {
        setCtaLoading(ctaKey);
        navigate(path);
    };

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const dashboardData = await userService.getDashboardSummary();
                if (!cancelled) {
                    setOverview(dashboardData.overview || null);
                    setRecent(dashboardData.recentAnalyses || []);
                    setProfile(dashboardData.user || null);
                    setProgressOverTime(dashboardData.progressOverTime || []);
                    setLastUpdated(new Date().toISOString());
                }
            } catch (e) {
                if (!cancelled) {
                    // Try to surface server-provided message when available
                    const raw = e?.error || e?.message || e?.detail || e;
                    let msg = '';
                    if (typeof raw === 'string') msg = raw;
                    else if (raw && typeof raw === 'object') msg = raw.message || raw.error || raw.detail || JSON.stringify(raw);
                    else msg = String(raw);
                    console.error('[Dashboard] failed to load:', e);
                    setError(msg || 'Could not load your personalized dashboard right now.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!isProfileMenuOpen) return;

        const handleOutsideClick = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isProfileMenuOpen]);

    const defaultOverview = {
        total_analyses: 0,
        total_resumes: 0,
        average_gap_score: 0,
        latest_gap_score: 0,
        role_distribution: {},
        top_missing_skills: [],
        readiness_summary: { excellent: 0, promising: 0, building: 0 }
    };

    const {
        total_analyses, total_resumes, average_gap_score,
        latest_gap_score, role_distribution, top_missing_skills, readiness_summary
    } = overview || defaultOverview;

    const topMissingMax = top_missing_skills[0]?.count || 1;
    const totalReady = readiness_summary.excellent + readiness_summary.promising + readiness_summary.building || 1;
    const firstName = profile?.firstName || user?.firstName || 'there';
    const lastName = profile?.lastName || user?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const avatarLetter = (firstName[0] || 'U').toUpperCase();
    const shouldPrioritizeRoadmap = latest_gap_score < 50;
    const githubLanguages = profile?.githubTopLanguages || [];
    const userEmail = profile?.email || user?.email || 'No email available';

    const timelineData = useMemo(
        () => [...progressOverTime].map((point) => ({
            ...point,
            ts: new Date(point.date).getTime()
        })).sort((a, b) => a.ts - b.ts),
        [progressOverTime]
    );

    const gapScoreDelta = useMemo(() => {
        if (timelineData.length < 2) return 0;
        const prev = Number(timelineData[timelineData.length - 2].gap_score || 0);
        const curr = Number(timelineData[timelineData.length - 1].gap_score || 0);
        return curr - prev;
    }, [timelineData]);

    const analysisCountDelta = useMemo(() => {
        if (timelineData.length === 0) return 0;
        const latestTs = timelineData[timelineData.length - 1].ts;
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const currStart = latestTs - weekMs;
        const prevStart = latestTs - (2 * weekMs);

        let currentWindow = 0;
        let previousWindow = 0;

        timelineData.forEach((point) => {
            if (point.ts >= currStart) currentWindow += 1;
            else if (point.ts >= prevStart) previousWindow += 1;
        });

        return currentWindow - previousWindow;
    }, [timelineData]);

    const gapTrend = trendMeta(gapScoreDelta);
    const analysisTrend = trendMeta(analysisCountDelta);

    const chartMeta = useMemo(() => {
        const width = 760;
        const height = 250;
        const plot = {
            top: 14,
            right: 20,
            bottom: 58,
            left: 56
        };
        const innerW = width - plot.left - plot.right;
        const innerH = height - plot.top - plot.bottom;
        const yTickValues = [0, 20, 40, 60, 80, 100];

        if (timelineData.length === 0) {
            return { width, height, plot, path: '', points: [], yTicks: [], xTicks: [] };
        }

        const stepX = timelineData.length > 1 ? innerW / (timelineData.length - 1) : 0;

        const points = timelineData.map((point, idx) => {
            const score = Math.max(0, Math.min(100, Number(point.gap_score || 0)));
            const x = plot.left + (stepX * idx);
            const y = plot.top + (innerH - ((score / 100) * innerH));
            return { x, y, label: point.label, score, date: point.date };
        });

        const yTicks = yTickValues.map((value) => ({
            value,
            y: plot.top + (innerH - ((value / 100) * innerH))
        }));

        const maxXTicks = 6;
        const tickStep = Math.max(1, Math.ceil(points.length / maxXTicks));
        const xTicks = points
            .map((point, idx) => ({
                x: point.x,
                idx,
                label: fmtAxisDate(point.date)
            }))
            .filter((tick) => tick.idx % tickStep === 0 || tick.idx === points.length - 1);

        const path = buildSmoothPath(points);

        return { width, height, plot, path, points, yTicks, xTicks };
    }, [timelineData]);

    const handleChartHover = (event) => {
        if (!chartMeta.points.length) return;
        const svgRect = event.currentTarget.getBoundingClientRect();
        const mouseX = ((event.clientX - svgRect.left) / svgRect.width) * chartMeta.width;

        let nearest = chartMeta.points[0];
        let nearestIdx = 0;
        let minDist = Math.abs(mouseX - nearest.x);

        chartMeta.points.forEach((point, idx) => {
            const dist = Math.abs(mouseX - point.x);
            if (dist < minDist) {
                minDist = dist;
                nearest = point;
                nearestIdx = idx;
            }
        });

        setHoveredPoint({
            ...nearest,
            date: timelineData[nearestIdx]?.date || null
        });
    };

    const handleLogout = () => {
        setIsProfileMenuOpen(false);
        logout();
        navigate('/login');
    };

    /* ── Error banner ─────────────────────────────────────────── */
    if (error) return (
        <div className="ov-page">
            <div className="ov-error glass-card">
                <AlertTriangle size={24} /> {error}
            </div>
        </div>
    );

    /* ── Loading skeleton ─────────────────────────────────────── */
    if (loading) return (
        <div className="ov-page">
            <Skeleton h={36} w={260} mb={8} />
            <Skeleton h={18} w={380} mb={40} />
            <div className="ov-stats-grid">
                {[1, 2, 3, 4].map(i => <div key={i} className="glass-card"><Skeleton h={80} /></div>)}
            </div>
            <div className="ov-two-col" style={{ marginTop: '2rem' }}>
                <div className="glass-card"><Skeleton h={220} /></div>
                <div className="glass-card"><Skeleton h={220} /></div>
            </div>
        </div>
    );

    return (
        <div className="ov-page animate-fade-in-up">

            {/* ── Page header ──────────────────────────────────── */}
            <div className="ov-header">
                <div>
                    <h1>Overview <span className="text-gradient">Dashboard</span></h1>
                    <p className="ov-subtitle">
                        Your personalized analysis activity, readiness, and trend snapshots.
                    </p>
                    <p className="ov-subtitle ov-updated-line">Last Updated: {fmtDateTime(lastUpdated)}</p>
                </div>
                <div className="ov-header-actions">
                    <div className="ov-profile-menu" ref={profileMenuRef}>
                        <button
                            type="button"
                            className="ov-avatar-btn"
                            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                            aria-label="Open profile menu"
                            aria-expanded={isProfileMenuOpen}
                        >
                            {profile?.profileImage ? (
                                <img src={profile.profileImage} alt={fullName} className="ov-avatar-img" />
                            ) : (
                                <span className="ov-avatar-fallback">{avatarLetter}</span>
                            )}
                            <span className="ov-online-dot" aria-hidden="true" />
                        </button>

                        <div className={`ov-profile-dropdown ${isProfileMenuOpen ? 'is-open' : ''}`}>
                            <div className="ov-profile-dropdown-head">
                                <strong>{fullName}</strong>
                                <span>{userEmail}</span>
                            </div>
                            <button
                                type="button"
                                className="ov-profile-dropdown-item"
                                onClick={() => {
                                    setIsProfileMenuOpen(false);
                                    navigate('/profile');
                                }}
                            >
                                Profile
                            </button>
                            <button
                                type="button"
                                className="ov-profile-dropdown-item"
                                onClick={() => {
                                    setIsProfileMenuOpen(false);
                                    navigate('/settings');
                                }}
                            >
                                Settings
                            </button>
                            <button
                                type="button"
                                className="ov-profile-dropdown-item is-danger"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                    <p className="ov-header-welcome">Welcome, {firstName}</p>
                </div>
            </div>

            {/* ── 4 stat cards ─────────────────────────────────── */}
            <div className="ov-stats-grid">
                <StatCard
                    icon={<BarChart2 size={22} />}
                    label="Total Analyses"
                    value={total_analyses}
                    sub={`${total_resumes} résumés parsed`}
                    accent="#6366f1"
                    trend={analysisTrend}
                />
                <StatCard
                    icon={<Target size={22} />}
                    label="Latest Gap Score"
                    value={`${latest_gap_score}%`}
                    sub={`Avg ${average_gap_score}% · ${scoreLabel(latest_gap_score)} readiness`}
                    accent={scoreColor(latest_gap_score)}
                    trend={gapTrend}
                />
                <StatCard
                    icon={<CheckCircle size={22} />}
                    label="Excellent Matches"
                    value={readiness_summary.excellent}
                    sub="Score ≥ 80%"
                    accent="#059669"
                />
                <StatCard
                    icon={<TrendingUp size={22} />}
                    label="Roles Tracked"
                    value={Object.keys(role_distribution).length}
                    sub="Distinct target roles"
                    accent="#8b5cf6"
                />
            </div>

            {/* ── Progress Over Time ───────────────────────────── */}
            <div className="glass-card ov-trend" style={{ marginBottom: '2rem' }}>
                <div className="ov-section-header">
                    <h3 className="ov-section-title">
                        <TrendingUp size={18} color="#6366f1" /> Progress Over Time
                    </h3>
                    <button
                        className={`ov-inline-cta ${shouldPrioritizeRoadmap ? 'is-primary' : ''}`}
                        disabled={ctaLoading === 'roadmap'}
                        onClick={() => handleCtaNavigate('roadmap', '/roadmap')}
                    >
                        {ctaLoading === 'roadmap' ? (
                            <><Loader2 size={14} className="ov-inline-spin" /> Loading...</>
                        ) : (
                            <>Start Learning Plan <ArrowRight size={14} /></>
                        )}
                    </button>
                </div>
                {timelineData.length === 0 ? (
                    <p className="text-muted ov-empty">Not enough analysis history to show a trend yet.</p>
                ) : (
                    <div className="ov-trend-chart-wrap">
                        <svg
                            className="ov-line-chart"
                            viewBox={`0 0 ${chartMeta.width} ${chartMeta.height}`}
                            role="img"
                            aria-label="Gap score trend over time"
                            onMouseMove={handleChartHover}
                            onMouseLeave={() => setHoveredPoint(null)}
                        >
                            <defs>
                                <linearGradient id="ovLineGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity="1" />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.75" />
                                </linearGradient>
                            </defs>

                            {chartMeta.yTicks.map((tick) => (
                                <g key={`y-${tick.value}`}>
                                    <line
                                        x1={chartMeta.plot.left}
                                        y1={tick.y}
                                        x2={chartMeta.width - chartMeta.plot.right}
                                        y2={tick.y}
                                        className="ov-line-grid"
                                    />
                                    <text
                                        x={chartMeta.plot.left - 10}
                                        y={tick.y + 3}
                                        textAnchor="end"
                                        className="ov-axis-tick"
                                    >
                                        {tick.value}
                                    </text>
                                </g>
                            ))}

                            {chartMeta.xTicks.map((tick) => (
                                <g key={`x-${tick.idx}`}>
                                    <line
                                        x1={tick.x}
                                        y1={chartMeta.plot.top}
                                        x2={tick.x}
                                        y2={chartMeta.height - chartMeta.plot.bottom}
                                        className="ov-line-grid is-x"
                                    />
                                    <text
                                        x={tick.x}
                                        y={chartMeta.height - chartMeta.plot.bottom + 18}
                                        transform={`rotate(-30 ${tick.x} ${chartMeta.height - chartMeta.plot.bottom + 18})`}
                                        textAnchor="end"
                                        className="ov-axis-tick"
                                    >
                                        {tick.label}
                                    </text>
                                </g>
                            ))}

                            <line
                                x1={chartMeta.plot.left}
                                y1={chartMeta.plot.top}
                                x2={chartMeta.plot.left}
                                y2={chartMeta.height - chartMeta.plot.bottom}
                                className="ov-line-axis"
                            />
                            <line
                                x1={chartMeta.plot.left}
                                y1={chartMeta.height - chartMeta.plot.bottom}
                                x2={chartMeta.width - chartMeta.plot.right}
                                y2={chartMeta.height - chartMeta.plot.bottom}
                                className="ov-line-axis"
                            />

                            <text
                                x="16"
                                y={chartMeta.height / 2}
                                transform={`rotate(-90 16 ${chartMeta.height / 2})`}
                                textAnchor="middle"
                                className="ov-axis-label"
                            >
                                Gap Score (%)
                            </text>

                            <text
                                x={(chartMeta.plot.left + (chartMeta.width - chartMeta.plot.right)) / 2}
                                y={chartMeta.height - 8}
                                textAnchor="middle"
                                className="ov-axis-label"
                            >
                                Analysis Date
                            </text>

                            <path d={chartMeta.path} className="ov-line-path" />
                            {hoveredPoint && (
                                <line
                                    x1={hoveredPoint.x}
                                    y1={chartMeta.plot.top}
                                    x2={hoveredPoint.x}
                                    y2={chartMeta.height - chartMeta.plot.bottom}
                                    className="ov-line-guide"
                                />
                            )}
                            {chartMeta.points.map((point, idx) => (
                                <g key={`${point.label}-${idx}`}>
                                    <circle cx={point.x} cy={point.y} r="3.6" className="ov-line-dot" />
                                    <title>{`${point.label}: ${point.score}%`}</title>
                                </g>
                            ))}
                        </svg>
                        {hoveredPoint && (
                            <div
                                className="ov-line-tooltip"
                                style={{
                                    left: `${Math.max(8, Math.min(92, (hoveredPoint.x / chartMeta.width) * 100))}%`
                                }}
                            >
                                <strong>{fmtDate(hoveredPoint.date)}</strong>
                                <span>Gap Score: {hoveredPoint.score}%</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── GitHub Snapshot ─────────────────────────────── */}
            <div className="glass-card ov-github-card" style={{ marginBottom: '2rem' }}>
                <div className="ov-section-header">
                    <h3 className="ov-section-title">
                        <BarChart2 size={18} color="#6366f1" /> GitHub Snapshot
                    </h3>
                    {profile?.githubUsername ? (
                        <a className="ov-link" href={profile.githubProfileUrl} target="_blank" rel="noreferrer">
                            @{profile.githubUsername}
                        </a>
                    ) : (
                        <span className="ov-user-meta">Connect in Settings</span>
                    )}
                </div>

                {profile?.githubUsername ? (
                    <div className="ov-github-grid">
                        <div className="ov-github-summary">
                            <div className="ov-github-avatar-wrap">
                                {profile.githubAvatarUrl ? (
                                    <img src={profile.githubAvatarUrl} alt={profile.githubUsername} className="ov-github-avatar" />
                                ) : (
                                    <div className="ov-github-avatar fallback">GH</div>
                                )}
                            </div>
                            <div>
                                <div className="ov-github-title">{profile.githubUsername}</div>
                                <div className="ov-github-subtitle">{profile.githubBio || 'Public GitHub profile connected.'}</div>
                                <div className="ov-github-meta">
                                    <span>{profile.githubRepoCount || 0} repositories</span>
                                    <span>{profile.githubSyncedAt ? `Synced ${fmtDateTime(profile.githubSyncedAt)}` : 'Not synced yet'}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="ov-github-label">Top Languages</div>
                            <div className="ov-language-list">
                                {githubLanguages.length > 0 ? githubLanguages.map((lang) => (
                                    <span key={lang.name} className="badge primary">
                                        {lang.name} · {lang.count}
                                    </span>
                                )) : (
                                    <span className="text-muted">No language data yet.</span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="ov-github-empty">
                        <p className="text-muted">Connect your GitHub account in Settings to surface repositories and top languages here.</p>
                        <button className="ov-inline-cta is-primary" onClick={() => navigate('/settings')}>
                            Connect GitHub <ArrowRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Readiness Distribution bar ────────────────────── */}
            <div className="glass-card ov-readiness" style={{ marginBottom: '2rem' }}>
                <h3 className="ov-section-title">
                    <Zap size={18} color="#6366f1" /> Readiness Distribution
                </h3>
                <div className="ov-readiness-bars">
                    {[
                        { key: 'excellent', label: 'Excellent (≥80%)', color: '#059669' },
                        { key: 'promising', label: 'Promising (50–79%)', color: '#d97706' },
                        { key: 'building', label: 'Building (<50%)', color: '#dc2626' },
                    ].map(({ key, label, color }) => {
                        const val = readiness_summary[key];
                        const pct = Math.round((val / totalReady) * 100);
                        return (
                            <div key={key} className="ov-bar-row">
                                <span className="ov-bar-label">{label}</span>
                                <div className="ov-bar-track">
                                    <div
                                        className="ov-bar-fill"
                                        style={{ width: `${pct}%`, background: color }}
                                    />
                                </div>
                                <span className="ov-bar-count" style={{ color }}>
                                    {val} <span className="ov-bar-pct">({pct}%)</span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Two-col: Top Missing Skills + Role Distribution ── */}
            <div className="ov-two-col" style={{ marginBottom: '2rem' }}>

                {/* Top Missing Skills */}
                <div className="glass-card">
                    <div className="ov-section-header">
                        <h3 className="ov-section-title">
                            <BookOpen size={18} color="#6366f1" /> Top Skills to Learn
                        </h3>
                        <button
                            className="ov-inline-cta"
                            disabled={ctaLoading === 'skill-gap'}
                            onClick={() => handleCtaNavigate('skill-gap', '/skill-gap')}
                        >
                            {ctaLoading === 'skill-gap' ? (
                                <><Loader2 size={14} className="ov-inline-spin" /> Loading...</>
                            ) : (
                                <>Improve Skill Gap <ArrowRight size={14} /></>
                            )}
                        </button>
                    </div>
                    {top_missing_skills.length === 0 ? (
                        <p className="text-muted ov-empty">No missing skill data yet.</p>
                    ) : (
                        <div className="ov-skill-list">
                            {top_missing_skills.map(({ skill, count }, idx) => (
                                <div key={skill} className="ov-skill-row">
                                    <span className="ov-skill-rank">#{idx + 1}</span>
                                    <span className="ov-skill-name">{skill}</span>
                                    <div className="ov-skill-track">
                                        <div
                                            className="ov-skill-bar"
                                            style={{
                                                width: `${Math.round((count / topMissingMax) * 100)}%`,
                                                background: `linear-gradient(90deg, #6366f1, #8b5cf6)`
                                            }}
                                        />
                                    </div>
                                    <span className="ov-skill-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Role Distribution */}
                <div className="glass-card">
                    <h3 className="ov-section-title">
                        <FileText size={18} color="#6366f1" /> Role Distribution
                    </h3>
                    {Object.keys(role_distribution).length === 0 ? (
                        <p className="text-muted ov-empty">No role data yet.</p>
                    ) : (
                        <div className="ov-role-list">
                            {Object.entries(role_distribution)
                                .sort((a, b) => b[1] - a[1])
                                .map(([role, count]) => {
                                    const pct = Math.round((count / total_analyses) * 100);
                                    return (
                                        <div key={role} className="ov-role-row">
                                            <div className="ov-role-top">
                                                <span className="ov-role-name">{role}</span>
                                                <span className="ov-role-count badge primary">
                                                    {count} {count === 1 ? 'analysis' : 'analyses'}
                                                </span>
                                            </div>
                                            <div className="ov-skill-track" style={{ marginTop: '0.4rem' }}>
                                                <div
                                                    className="ov-skill-bar"
                                                    style={{
                                                        width: `${pct}%`,
                                                        background: `linear-gradient(90deg, #6366f1, #ec4899)`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Recent Analyses ───────────────────────────────── */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <div className="ov-section-header">
                    <h3 className="ov-section-title">
                        <Clock size={18} color="#6366f1" /> Recent Analyses
                    </h3>
                    <button
                        className="ov-inline-cta"
                        disabled={ctaLoading === 'resume'}
                        onClick={() => handleCtaNavigate('resume', '/resume-analyzer')}
                    >
                        {ctaLoading === 'resume' ? (
                            <><Loader2 size={14} className="ov-inline-spin" /> Loading...</>
                        ) : (
                            <>Re-analyze Resume <ArrowRight size={14} /></>
                        )}
                    </button>
                </div>

                {recent.length === 0 ? (
                    <div className="ov-empty-state">
                        <Loader2 size={32} className="text-muted" />
                        <p className="text-muted">
                            No analyses yet. <span
                                className="ov-link"
                                onClick={() => navigate('/resume-analyzer')}
                            >Upload your resume</span> to get started.
                        </p>
                    </div>
                ) : (
                    <div className="ov-table-wrap">
                        <table className="ov-table">
                            <thead>
                                <tr>
                                    <th>Target Role</th>
                                    <th>Gap Score</th>
                                    <th>Readiness</th>
                                    <th>Missing Skills</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.map(item => (
                                    <tr key={item.id}>
                                        <td className="ov-td-role">{item.target_role}</td>
                                        <td>
                                            <span
                                                className="ov-score-chip"
                                                style={{
                                                    color: scoreColor(item.gap_score),
                                                    background: scoreBg(item.gap_score)
                                                }}
                                            >
                                                {item.gap_score}%
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ color: scoreColor(item.gap_score), fontWeight: 600, fontSize: '0.82rem' }}>
                                                {scoreLabel(item.gap_score)}
                                            </span>
                                        </td>
                                        <td className="text-muted">{item.missing_count} skills</td>
                                        <td className="text-muted ov-td-date">{fmtDateTime(item.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Quick Actions ───────────────────────────────────── */}
            <div className="ov-two-col">
                <div className="ov-action-card glass-card" onClick={() => navigate('/resume-analyzer')}>
                    <div className="ov-action-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>
                        <Upload size={24} color="#6366f1" />
                    </div>
                    <div>
                        <h4>Analyze a Resume</h4>
                        <p className="text-muted">Upload a PDF to extract skills</p>
                    </div>
                    <ArrowRight size={20} className="ov-action-arrow" />
                </div>
                <div className="ov-action-card glass-card" onClick={() => navigate('/market-intelligence')}>
                    <div className="ov-action-icon" style={{ background: 'rgba(139,92,246,0.12)' }}>
                        <BarChart2 size={24} color="#8b5cf6" />
                    </div>
                    <div>
                        <h4>Market Intelligence</h4>
                        <p className="text-muted">See top skills by role</p>
                    </div>
                    <ArrowRight size={20} className="ov-action-arrow" />
                </div>
            </div>

        </div>
    );
}
