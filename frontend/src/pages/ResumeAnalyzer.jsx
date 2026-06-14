import { useState, useRef } from 'react';
import {
    UploadCloud, CheckCircle, AlertTriangle, Mail, Phone,
    Linkedin, Github, BookOpen, Briefcase, GraduationCap,
    Tag, Clock, Layers, ArrowRight, Loader2, X, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import resumeService from '../services/resumeService';
import './ResumeAnalyzer.css';

const API = import.meta.env.VITE_PYTHON_BACKEND_URL;

/* ── Category accent colours ──────────────────────────────── */
const CAT_COLORS = {
    'Programming Languages': '#6366f1',
    'Web & Frontend': '#ec4899',
    'Backend & APIs': '#8b5cf6',
    'Databases & Storage': '#06b6d4',
    'Cloud & DevOps': '#f59e0b',
    'Data Science & ML': '#10b981',
    'Mobile': '#3b82f6',
    'Security': '#ef4444',
    'Tools & Platforms': '#64748b',
    'Methodologies': '#a855f7',
    'Soft Skills': '#f97316',
    'Business & PM': '#14b8a6',
};

function categoryColor(cat) {
    return CAT_COLORS[cat] || '#6366f1';
}

/* ── Drag-and-drop zone component ────────────────────────── */
function DropZone({ file, onFile, onClear }) {
    const inputRef = useRef();
    const [dragging, setDragging] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f && ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type)) onFile(f);
    };

    return (
        <div
            className={`ra-dropzone ${dragging ? 'ra-dropzone--active' : ''} ${file ? 'ra-dropzone--filled' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current.click()}
        >
                <input
                ref={inputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: 'none' }}
                onChange={e => onFile(e.target.files[0])}
            />
            {file ? (
                <div className="ra-dz-filled">
                    <FileText size={32} color="#6366f1" />
                    <div>
                        <p className="ra-dz-filename">{file.name}</p>
                        <p className="ra-dz-size">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button className="ra-dz-clear" onClick={(e) => { e.stopPropagation(); onClear(); }}>
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div className="ra-dz-empty">
                    <UploadCloud size={40} color="#6366f1" />
                    <p className="ra-dz-title">Drop your résumé (PDF/DOCX) here</p>
                    <p className="ra-dz-hint">or click to browse · PDF / DOC / DOCX · max 10 MB</p>
                </div>
            )}
        </div>
    );
}

/* ── Skill badge ─────────────────────────────────────────── */
function SkillBadge({ skill, color }) {
    return (
        <span
            className="ra-skill-badge"
            style={{ background: color + '15', color, border: `1px solid ${color}25` }}
        >
            {skill}
        </span>
    );
}

/* ── Contact row ─────────────────────────────────────────── */
function ContactRow({ icon, value, href }) {
    if (!value) return null;
    return (
        <a
            className="ra-contact-row"
            href={href || '#'}
            target={href ? '_blank' : undefined}
            rel="noopener noreferrer"
        >
            <span className="ra-contact-icon">{icon}</span>
            <span className="ra-contact-val">{value}</span>
        </a>
    );
}

/* ── Main page ───────────────────────────────────────────── */
export default function ResumeAnalyzer() {
    const navigate = useNavigate();
    const { setCurrentResume } = useDashboard();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleFile = (f) => {
        setFile(f);
        setError('');
        setResult(null);
    };

    const handleAnalyze = async () => {
        if (!file) { setError('Please select a PDF résumé first.'); return; }
        setLoading(true);
        setError('');
        setResult(null);

            try {
                // Use service that validates with Python parser first
                const resp = await resumeService.uploadResume(file);
                const data = resp.parsed || resp; // parsed data from Python
                setResult(data);

                // Persist flat skills list so Skill Gap Forecast page can use them
                localStorage.setItem('gap2grow_extracted_skills', JSON.stringify(data.all_skills));
                localStorage.setItem('gap2grow_resume_id', data.resume_id || resp.resume?.resume_id || resp.resume?._id);
                const currentResume = {
                    resume_id: data.resume_id || resp.resume?.resume_id || resp.resume?._id,
                    filename: data.filename || file.name,
                    contact: data.contact,
                    categorized_skills: data.categorized_skills,
                    all_skills: data.all_skills,
                    education: data.education,
                    experience: data.experience,
                    total_exp_years: data.total_exp_years,
                    sections_found: data.sections_found,
                    text_preview: data.text_preview,
                    skill_count: data.skill_count
                };
                localStorage.setItem('gap2grow_current_resume', JSON.stringify(currentResume));
                setCurrentResume(currentResume);
        } catch (e) {
            // Try to recover structured error messages from API
            const raw = e?.detail || e?.error || e?.message || e;
            let msg = '';
            if (typeof raw === 'string') msg = raw;
            else if (raw && typeof raw === 'object') msg = raw.message || raw.detail || raw.error || JSON.stringify(raw);
            else msg = String(raw);
            setError(msg || 'Analysis failed. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const hasContact = result && (
        result.contact.email || result.contact.phone ||
        result.contact.linkedin || result.contact.github
    );

    return (
        <div className="ra-page">

            {/* ── Page title ─────────────────────────────────── */}
            <div className="ra-header">
                <div>
                    <h1>Resume <span className="text-gradient">Analyzer</span></h1>
                    <p className="ra-subtitle">
                        Upload your PDF résumé — our parser extracts skills, contact info,
                        education, and work experience automatically.
                    </p>
                </div>
            </div>

            {/* ── Upload card ─────────────────────────────────── */}
            <div className="glass-card ra-upload-card">
                <DropZone file={file} onFile={handleFile} onClear={() => { setFile(null); setResult(null); }} />

                {error && (
                    <div className="ra-error">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                <button
                    className="btn btn-primary ra-submit-btn"
                    onClick={handleAnalyze}
                    disabled={!file || loading}
                >
                    {loading
                        ? <><Loader2 size={18} className="animate-spin" /> Parsing Résumé…</>
                        : <><CheckCircle size={18} /> Analyze Résumé</>}
                </button>
            </div>

            {/* ── Results ─────────────────────────────────────── */}
            {result && (
                <div className="ra-results animate-fade-in-up">

                    {/* ── Summary bar ─────────────────────────── */}
                    <div className="ra-summary-bar glass-card">
                        <div className="ra-summary-item">
                            <Tag size={18} color="#6366f1" />
                            <div>
                                <span className="ra-sum-val">{result.skill_count}</span>
                                <span className="ra-sum-label">Skills Found</span>
                            </div>
                        </div>
                        <div className="ra-summary-divider" />
                        <div className="ra-summary-item">
                            <Layers size={18} color="#8b5cf6" />
                            <div>
                                <span className="ra-sum-val">{Object.keys(result.categorized_skills).length}</span>
                                <span className="ra-sum-label">Categories</span>
                            </div>
                        </div>
                        <div className="ra-summary-divider" />
                        <div className="ra-summary-item">
                            <GraduationCap size={18} color="#059669" />
                            <div>
                                <span className="ra-sum-val">{result.education.length}</span>
                                <span className="ra-sum-label">Education</span>
                            </div>
                        </div>
                        <div className="ra-summary-divider" />
                        <div className="ra-summary-item">
                            <Clock size={18} color="#d97706" />
                            <div>
                                <span className="ra-sum-val">
                                    {result.total_exp_years != null ? `${result.total_exp_years}y` : result.experience.length || '—'}
                                </span>
                                <span className="ra-sum-label">
                                    {result.total_exp_years != null ? 'Experience' : 'Exp. Entries'}
                                </span>
                            </div>
                        </div>
                        <div className="ra-summary-divider" />
                        <div className="ra-summary-item">
                            <Briefcase size={18} color="#ec4899" />
                            <div>
                                <span className="ra-sum-val">{result.sections_found.length}</span>
                                <span className="ra-sum-label">Sections</span>
                            </div>
                        </div>
                    </div>

                    <div className="ra-two-col">

                        {/* ── LEFT COLUMN ──────────────────────── */}
                        <div className="ra-col">

                            {/* Contact Info */}
                            {hasContact && (
                                <div className="glass-card ra-section">
                                    <h3 className="ra-section-title">
                                        <Mail size={17} color="#6366f1" /> Contact Information
                                    </h3>
                                    <div className="ra-contact-list">
                                        <ContactRow
                                            icon={<Mail size={14} />}
                                            value={result.contact.email}
                                            href={`mailto:${result.contact.email}`}
                                        />
                                        <ContactRow
                                            icon={<Phone size={14} />}
                                            value={result.contact.phone}
                                        />
                                        <ContactRow
                                            icon={<Linkedin size={14} />}
                                            value={result.contact.linkedin}
                                            href={result.contact.linkedin?.startsWith('http')
                                                ? result.contact.linkedin
                                                : `https://${result.contact.linkedin}`}
                                        />
                                        <ContactRow
                                            icon={<Github size={14} />}
                                            value={result.contact.github}
                                            href={result.contact.github?.startsWith('http')
                                                ? result.contact.github
                                                : `https://${result.contact.github}`}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Education */}
                            {result.education.length > 0 && (
                                <div className="glass-card ra-section">
                                    <h3 className="ra-section-title">
                                        <GraduationCap size={17} color="#059669" /> Education
                                    </h3>
                                    <div className="ra-edu-list">
                                        {result.education.map((e, i) => (
                                            <div key={i} className="ra-edu-entry">
                                                {e.degree && (
                                                    <span className="ra-edu-degree badge success">{e.degree.toUpperCase()}</span>
                                                )}
                                                <p className="ra-edu-raw">{e.raw}</p>
                                                {e.years && <span className="ra-edu-years text-muted">{e.years}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Work Experience */}
                            {result.experience.length > 0 && (
                                <div className="glass-card ra-section">
                                    <h3 className="ra-section-title">
                                        <Briefcase size={17} color="#d97706" /> Work Experience
                                        {result.total_exp_years && (
                                            <span className="ra-exp-total badge">
                                                ~{result.total_exp_years} yrs total
                                            </span>
                                        )}
                                    </h3>
                                    <div className="ra-exp-list">
                                        {result.experience.slice(0, 8).map((e, i) => (
                                            <div key={i} className="ra-exp-entry">
                                                <div className="ra-exp-dot" />
                                                <div>
                                                    <p className="ra-exp-raw">{e.raw}</p>
                                                    {e.years && <span className="ra-exp-years text-muted">{e.years}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── RIGHT COLUMN — Skills by Category ── */}
                        <div className="ra-col">
                            <div className="glass-card ra-section">
                                <h3 className="ra-section-title">
                                    <BookOpen size={17} color="#6366f1" /> Skills by Category
                                    <span className="ra-skill-total badge primary">
                                        {result.skill_count} detected
                                    </span>
                                </h3>

                                {Object.keys(result.categorized_skills).length === 0 ? (
                                    <div className="ra-no-skills">
                                        <AlertTriangle size={20} color="#d97706" />
                                        <p>No skills detected. Make sure your PDF contains readable text.</p>
                                    </div>
                                ) : (
                                    <div className="ra-cat-list">
                                        {Object.entries(result.categorized_skills)
                                            .sort((a, b) => b[1].length - a[1].length)
                                            .map(([cat, skills]) => (
                                                <div key={cat} className="ra-cat-block">
                                                    <div
                                                        className="ra-cat-header"
                                                        style={{ color: categoryColor(cat) }}
                                                    >
                                                        <span className="ra-cat-dot" style={{ background: categoryColor(cat) }} />
                                                        {cat}
                                                        <span className="ra-cat-count">{skills.length}</span>
                                                    </div>
                                                    <div className="ra-skill-badges">
                                                        {skills.map(s => (
                                                            <SkillBadge key={s} skill={s} color={categoryColor(cat)} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Go to Skill Gap Forecast CTA ─────────── */}
                    <div className="ra-cta-card glass-card">
                        <div>
                            <h3>Ready to see your Skill Gap?</h3>
                            <p className="text-muted">
                                Your {result.skill_count} detected skills have been saved.
                                Head to Skill Gap Forecast to compare them against a target role.
                            </p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/skill-gap')}
                        >
                            Go to Skill Gap Forecast <ArrowRight size={18} />
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
