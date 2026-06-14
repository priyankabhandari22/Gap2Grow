import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Target, CheckCircle, AlertCircle, TrendingUp,
    DollarSign, BarChart2, Star, Zap, BookOpen,
    ArrowRight, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import './SkillGapForecast.css';

const API = import.meta.env.VITE_PYTHON_BACKEND_URL;

/* ── helpers ─────────────────────────────────────────────── */
function scoreColor(s) { return s >= 80 ? '#059669' : s >= 60 ? '#d97706' : s >= 40 ? '#f97316' : '#dc2626'; }
function scoreBg(s) { return s >= 80 ? 'rgba(5,150,105,.10)' : s >= 60 ? 'rgba(217,119,6,.10)' : s >= 40 ? 'rgba(249,115,22,.10)' : 'rgba(220,38,38,.10)'; }
function readinessDot(r) {
    const map = { Excellent: '#059669', Promising: '#d97706', Building: '#f97316', 'Needs Work': '#dc2626' };
    return map[r] || '#6366f1';
}

/* ── Radial score ring (pure SVG, no canvas) ─────────────── */
function ScoreRing({ score }) {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;
    const col = scoreColor(score);
    return (
        <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
                cx="70" cy="70" r={r} fill="none"
                stroke={col} strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
            <text x="70" y="64" textAnchor="middle" fontSize="22" fontWeight="800" fontFamily="Outfit,sans-serif" fill={col}>
                {score}%
            </text>
            <text x="70" y="82" textAnchor="middle" fontSize="11" fill="#6b7280" fontFamily="Inter,sans-serif">
                Match Score
            </text>
        </svg>
    );
}

/* ── Skill bar row (for match_details chart) ─────────────── */
function SkillBar({ skill, matched, priority }) {
    const color = matched ? '#059669' : '#dc2626';
    return (
        <div className="sgf-bar-row">
            <div className="sgf-bar-label">
                {priority && <Star size={10} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 3, flexShrink: 0 }} />}
                <span className={matched ? 'sgf-matched-name' : 'sgf-missing-name'}>{skill}</span>
            </div>
            <div className="sgf-bar-track">
                <div className="sgf-bar-fill" style={{ width: matched ? '100%' : '0%', background: color }} />
            </div>
            <span className="sgf-bar-tag" style={{ color, background: color + '15' }}>
                {matched ? '✓' : '✗'}
            </span>
        </div>
    );
}

function formatIndianEstimateFromUSDThousands(value) {
    const thousands = Number(value);

    if (!Number.isFinite(thousands)) {
        return '';
    }

    const rupees = thousands * 1000 * 83;

    if (rupees >= 10000000) {
        return `₹${(rupees / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
    }

    return `₹${(rupees / 100000).toFixed(2).replace(/\.00$/, '')}L`;
}

function formatCompactThousands(value) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
        return '';
    }

    return Number.isInteger(numberValue)
        ? String(numberValue)
        : numberValue.toFixed(1).replace(/\.0$/, '');
}

function formatSalary(min, max, currency = 'USD') {
    if (currency === 'INR') {
        return `${formatIndianEstimateFromUSDThousands(min)} – ${formatIndianEstimateFromUSDThousands(max)} (India Estimate)`;
    }

    return `$${formatCompactThousands(min)}K – $${formatCompactThousands(max)}K USD`;
}

function formatSalaryDisplay(salaryRange, currency = 'USD') {
    if (!salaryRange) {
        return 'Salary not available';
    }

    if (typeof salaryRange === 'object' && salaryRange !== null) {
        const { min, max, currency: rangeCurrency = currency } = salaryRange;
        return formatSalary(min, max, rangeCurrency);
    }

    const rawValue = String(salaryRange)
        .replace(/â€“|â€”|–|—/g, ' - ')
        .replace(/\s+/g, ' ')
        .trim();

    const rangeMatch = rawValue.match(/\$?\s*([\d,.]+)\s*k?\s*-\s*\$?\s*([\d,.]+)\s*k?/i);

    if (rangeMatch) {
        return formatSalary(rangeMatch[1], rangeMatch[2], currency);
    }

    if (/USD/i.test(rawValue)) {
        return rawValue.replace(/\s*-\s*/g, ' – ').replace(/\bk\b/gi, 'K');
    }

    return `${rawValue.replace(/\s*-\s*/g, ' – ').replace(/\bk\b/gi, 'K')} USD`;
}

const SALARY_DISPLAY_CURRENCY = 'USD';

function SkillGapForecast() {
    const navigate = useNavigate();
    const [roles, setRoles] = useState([]);
    const [selectedRole, setRole] = useState('');
    const [customSkills, setCustomSkills] = useState('');
    const [useCustom, setUseCustom] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const { createSkillGap } = useDashboard();

    // Load roles + pre-fill saved skills tag
    useEffect(() => {
        fetch(`${API}/job-roles`)
            .then(r => r.json())
            .then(data => { setRoles(data); if (data.length) setRole(data[0]); })
            .catch(() => setError('Could not load job roles.'));
    }, []);

    const savedSkills = JSON.parse(localStorage.getItem('gap2grow_extracted_skills') || '[]');
    const skillsToUse = useCustom
        ? customSkills.split(',').map(s => s.trim()).filter(Boolean)
        : savedSkills;

    const handleAnalyze = async () => {
        if (!selectedRole) return;
        if (skillsToUse.length === 0) {
            setError(useCustom
                ? 'Please enter at least one skill.'
                : 'No saved skills found. Upload a résumé first or enter skills manually.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const res = await fetch(`${API}/skill-gap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_role: selectedRole, skills: skillsToUse }),
            });
            if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
            const data = await res.json();
            setResult(data);
            localStorage.setItem('gap2grow_analysis_result', JSON.stringify(data));
            
            // Sync with Node.js Backend so AI reports have a valid context ID
            try {
                await createSkillGap({
                    targetRole: data.target_role || selectedRole,
                    targetIndustry: 'Technology',
                    currentSkills: (data.user_skills || []).map(s => ({ skillName: s, proficiency: 'Intermediate' })),
                    requiredSkills: [
                        ...(data.matched_skills || []).map(s => ({ skillName: s, importance: 'Important'})),
                        ...(data.missing_skills || []).map(s => ({ skillName: s, importance: 'Important'}))
                    ]
                });
            } catch(syncErr) { 
                console.error("[SkillGapForecast] Failed to sync to Node backend:", syncErr); 
            }
            
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sgf-page">

            {/* ── Header ──────────────────────────────────────── */}
            <div className="sgf-header">
                <div>
                    <h1>Skill Gap <span className="text-gradient">Forecast</span></h1>
                    <p className="sgf-subtitle">
                        Compare your skills to any role's requirements and get a weighted readiness score.
                    </p>
                </div>
            </div>

            {/* ── Controls card ──────────────────────────────── */}
            <div className="glass-card sgf-controls">

                {/* Role selector */}
                <div className="sgf-form-row">
                    <label className="sgf-label">Target Role</label>
                    <select
                        className="input-field sgf-select"
                        value={selectedRole}
                        onChange={e => setRole(e.target.value)}
                    >
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                {/* Skill source toggle */}
                <div className="sgf-source-row">
                    <button
                        className={`sgf-toggle-btn ${!useCustom ? 'active' : ''}`}
                        onClick={() => setUseCustom(false)}
                    >
                        Use résumé skills {savedSkills.length > 0 && <span className="sgf-count">{savedSkills.length}</span>}
                    </button>
                    <button
                        className={`sgf-toggle-btn ${useCustom ? 'active' : ''}`}
                        onClick={() => setUseCustom(true)}
                    >
                        Enter manually
                    </button>
                </div>

                {!useCustom && savedSkills.length > 0 && (
                    <div className="sgf-saved-pills">
                        {savedSkills.slice(0, 12).map(s => (
                            <span key={s} className="badge primary sgf-pill">{s}</span>
                        ))}
                        {savedSkills.length > 12 && (
                            <span className="badge sgf-pill">+{savedSkills.length - 12} more</span>
                        )}
                    </div>
                )}

                {useCustom && (
                    <textarea
                        className="input-field sgf-textarea"
                        placeholder="Python, React, Docker, SQL, Git… (comma-separated)"
                        value={customSkills}
                        onChange={e => setCustomSkills(e.target.value)}
                        rows={3}
                    />
                )}

                {error && (
                    <div className="sgf-error">
                        <AlertTriangle size={15} /> {error}
                    </div>
                )}

                <button
                    className="btn btn-primary sgf-analyze-btn"
                    onClick={handleAnalyze}
                    disabled={loading || !selectedRole}
                >
                    {loading
                        ? <><Loader2 size={18} className="animate-spin" /> Forecasting…</>
                        : <><Target size={18} /> Run Forecast</>}
                </button>
            </div>

            {/* ── Results ─────────────────────────────────────── */}
            {result && (
                <div className="sgf-results animate-fade-in-up">

                    {/* ── Hero: score + market stats ───────────── */}
                    <div className="sgf-hero glass-card">
                        <div className="sgf-hero-left">
                            <ScoreRing score={result.gap_score} />
                            <div>
                                <div className="sgf-readiness" style={{ color: readinessDot(result.readiness) }}>
                                    ● {result.readiness}
                                </div>
                                <h2 className="sgf-role-name">{result.target_role}</h2>
                                <p className="sgf-role-desc text-muted">{result.role_description}</p>
                                <div className="sgf-tally">
                                    <span style={{ color: '#059669', fontWeight: 700 }}>
                                        ✓ {result.total_matched} matched
                                    </span>
                                    <span className="sgf-tally-sep">·</span>
                                    <span style={{ color: '#dc2626', fontWeight: 700 }}>
                                        ✗ {result.missing_skills.length} missing
                                    </span>
                                    <span className="sgf-tally-sep">·</span>
                                    <span className="text-muted">
                                        {result.total_required} required
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="sgf-market-stats">
                            <div className="sgf-market-item">
                                <DollarSign size={17} color="#059669" />
                                <div>
                                    <span className="sgf-mval">{formatSalaryDisplay(result.salary_range, SALARY_DISPLAY_CURRENCY)}</span>
                                    <span className="sgf-mlabel">Salary Range</span>
                                </div>
                            </div>
                            <div className="sgf-market-item">
                                <BarChart2 size={17} color="#6366f1" />
                                <div>
                                    <span className="sgf-mval">{result.demand}</span>
                                    <span className="sgf-mlabel">Market Demand</span>
                                </div>
                            </div>
                            <div className="sgf-market-item">
                                <TrendingUp size={17} color="#8b5cf6" />
                                <div>
                                    <span className="sgf-mval">+{result.growth_pct}%</span>
                                    <span className="sgf-mlabel">5-Year Growth</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Two-col: match bars + missing priority list ── */}
                    <div className="sgf-two-col">

                        {/* Skill Match Chart */}
                        <div className="glass-card sgf-section">
                            <h3 className="sgf-section-title">
                                <BarChart2 size={17} color="#6366f1" /> Skill Match Breakdown
                                <span className="sgf-legend">
                                    <Star size={10} color="#f59e0b" fill="#f59e0b" /> Priority skill
                                </span>
                            </h3>
                            <div className="sgf-bars">
                                {result.match_details.map(d => (
                                    <SkillBar key={d.skill} {...d} />
                                ))}
                            </div>
                        </div>

                        {/* Right column */}
                        <div className="sgf-col">

                            {/* Missing skills (priority-sorted) */}
                            {result.missing_skills.length > 0 && (
                                <div className="glass-card sgf-section">
                                    <h3 className="sgf-section-title">
                                        <AlertCircle size={17} color="#dc2626" /> Skills to Acquire
                                        <span className="badge danger" style={{ marginLeft: 'auto', fontSize: '0.72rem' }}>
                                            {result.missing_skills.length}
                                        </span>
                                    </h3>
                                    <div className="sgf-missing-grid">
                                        {result.missing_skills.map((s, i) => (
                                            <span key={i} className="sgf-missing-chip">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Matched skills */}
                            {result.matched_skills.length > 0 && (
                                <div className="glass-card sgf-section">
                                    <h3 className="sgf-section-title">
                                        <CheckCircle size={17} color="#059669" /> Matched Skills
                                        <span className="badge success" style={{ marginLeft: 'auto', fontSize: '0.72rem' }}>
                                            {result.matched_skills.length}
                                        </span>
                                    </h3>
                                    <div className="sgf-matched-grid">
                                        {result.matched_skills.map((s, i) => (
                                            <span key={i} className="sgf-matched-chip">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Bonus skills */}
                            {result.extra_skills?.length > 0 && (
                                <div className="glass-card sgf-section">
                                    <h3 className="sgf-section-title">
                                        <Zap size={17} color="#8b5cf6" /> Bonus Skills
                                    </h3>
                                    <p className="text-muted sgf-bonus-desc">
                                        You have these skills beyond what this role requires — great for standing out!
                                    </p>
                                    <div className="sgf-bonus-pills">
                                        {result.extra_skills.slice(0, 14).map((s, i) => (
                                            <span key={i} className="badge sgf-bonus-badge">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── CTAs ─────────────────────────────────── */}
                    <div className="sgf-cta-row">
                        <div className="sgf-cta-card glass-card" onClick={() => navigate('/roadmap')}>
                            <div className="sgf-cta-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                <BookOpen size={22} color="#6366f1" />
                            </div>
                            <div>
                                <h4>Learning Roadmap</h4>
                                <p className="text-muted">Get a step-by-step plan to fill your gaps</p>
                            </div>
                            <ArrowRight size={18} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                        </div>
                        <div className="sgf-cta-card glass-card" onClick={() => navigate('/career-report')}>
                            <div className="sgf-cta-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
                                <TrendingUp size={22} color="#8b5cf6" />
                            </div>
                            <div>
                                <h4>AI Career Report</h4>
                                <p className="text-muted">Get salary projections and market insights</p>
                            </div>
                            <ArrowRight size={18} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                        </div>
                        <div className="sgf-cta-card glass-card" onClick={() => { setResult(null); setRole(roles[0]); }}>
                            <div className="sgf-cta-icon" style={{ background: 'rgba(5,150,105,0.1)' }}>
                                <RefreshCw size={22} color="#059669" />
                            </div>
                            <div>
                                <h4>Try Another Role</h4>
                                <p className="text-muted">Compare your skills to a different role</p>
                            </div>
                            <ArrowRight size={18} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SkillGapForecast;
