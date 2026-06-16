import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Map, Target, ExternalLink } from 'lucide-react';

export default function Results() {
    const location = useLocation();
    const navigate = useNavigate();
    const data = location.state?.data;

    if (!data) {
        return (
            <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
                <h2>No analysis data found</h2>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const { analysis, roadmap } = data;
    const { gap_score, job_role, user_skills, missing_skills } = analysis;

    const scoreColor = gap_score > 75 ? 'var(--success)' : gap_score > 40 ? 'var(--warning)' : 'var(--danger)';

    return (
        <div className="container" style={{ padding: '4rem 1.5rem', minHeight: '100vh' }}>

            {/* Header */}
            <div className="animate-fade-in-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
                <div>
                    <button className="btn btn-secondary" style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }} onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 style={{ fontSize: '2.5rem' }}>Your Analysis for <span className="text-gradient">{job_role}</span></h1>
                </div>

                {/* Score Ring */}
                <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%' }} className="flex-center glass">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--border)" strokeWidth="8" />
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke={scoreColor} strokeWidth="8"
                            strokeDasharray={`${(gap_score / 100) * 314} 314`} strokeLinecap="round" transform="rotate(-90 60 60)"
                        />
                    </svg>
                    <div style={{ position: 'absolute', textAlign: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '1.75rem', color: scoreColor }}>{gap_score}%</h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Match</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>

                {/* Found Skills */}
                <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <CheckCircle color="var(--success)" /> Skills You Have
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {user_skills.map((skill, idx) => (
                            <span key={idx} className="badge success">{skill.toUpperCase()}</span>
                        ))}
                        {user_skills.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No relevant skills found.</span>}
                    </div>
                </div>

                {/* Missing Skills */}
                <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <XCircle color="var(--danger)" /> Skills You Need
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {missing_skills.map((skill, idx) => (
                            <span key={idx} className="badge danger">{skill.toUpperCase()}</span>
                        ))}
                        {missing_skills.length === 0 && <span style={{ color: 'var(--text-muted)' }}>You have all the required basic skills!</span>}
                    </div>
                </div>
            </div>

            {/* Roadmap Series */}
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }} className="animate-fade-in-up">
                <Map color="var(--primary)" /> Upskilling Roadmap
            </h2>

            <div style={{ position: 'relative', paddingLeft: '2rem' }} className="animate-fade-in-up">
                {/* Vertical Timeline Line */}
                <div style={{ position: 'absolute', left: '11px', top: '0', bottom: '0', width: '2px', background: 'var(--border)' }}></div>

                {roadmap.steps.map((step, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: '2.5rem' }}>
                        {/* Timeline Dot */}
                        <div style={{ position: 'absolute', left: '-2.5rem', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', border: '4px solid var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Target size={12} color="white" />
                        </div>

                        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                            <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
                                Step {step.step_number}: {step.title}
                            </h4>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                                {step.description}
                            </p>

                            {step.resources && step.resources.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {step.resources.map((link, i) => (
                                        <a
                                            key={i}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="badge primary"
                                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                        >
                                            Resource {i + 1} <ExternalLink size={10} />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
