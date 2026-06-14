import React, { useState, useEffect } from 'react';
import { Map as MapIcon, ExternalLink, BookOpen, Download, Loader, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useDashboard } from '../context/DashboardContext';
import reportService from '../services/reportService';

const LearningRoadmap = () => {
    const { skillGap, fetchSkillGap } = useDashboard();
    const [roadmap, setRoadmap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchRoadmap();
        if (!skillGap) {
            fetchSkillGap();
        }
    }, []);

    const fetchRoadmap = async () => {
        try {
            setLoading(true);
            const data = await reportService.getLatestLearningRoadmap();
            if (!data) {
                setRoadmap(null);
                setError('No learning roadmap found yet. Generate one to get started!');
            } else {
                setRoadmap(data);
                setError(null);
            }
        } catch (err) {
            setRoadmap(null);
            setError(err.response?.data?.message || 'Failed to fetch roadmap');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateRoadmap = async () => {
        console.log('[FRONTEND: LEARNING ROADMAP] Generate button clicked!');
        const activeSkillGap = skillGap || await fetchSkillGap(true);

        if (!activeSkillGap?._id) {
            console.error('[FRONTEND: LEARNING ROADMAP] No Skill Gap ID found, cannot generate.');
            setError('Please generate a Skill Gap Forecast first');
            return;
        }

        try {
            console.log(`[FRONTEND: LEARNING ROADMAP] Sending request to generate roadmap for Skill Gap ID: ${activeSkillGap._id}...`);
            setGenerating(true);
            setError(null);
            const data = await reportService.generateLearningRoadmap(activeSkillGap._id);
            console.log('[FRONTEND: LEARNING ROADMAP] ✅ Successfully received generated roadmap from backend:', data);
            setRoadmap(data.roadmap);
        } catch (err) {
            console.error('[FRONTEND: LEARNING ROADMAP] ❌ Error generating roadmap:', err.response?.data || err);
            setError(err.response?.data?.error || 'Failed to generate roadmap');
        } finally {
            setGenerating(false);
            console.log('[FRONTEND: LEARNING ROADMAP] Generation process finished.');
        }
    };

    const downloadRoadmap = async () => {
        if (!roadmap || downloading) return;
        setDownloading(true);
        try {
            const element = document.getElementById('roadmap-content');
            if (!element) return;
            
            // Adjust styles for capturing
            const originalBorder = element.style.border;
            element.style.border = 'none';
            element.style.padding = '30px';
            element.style.background = '#ffffff'; // ensure white background for PDF
            
            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 1000 // force desktop width capture
            });
            
            // Restore styles
            element.style.border = originalBorder;
            element.style.padding = '';
            element.style.background = '';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Handle multiple pages
            if (pdfHeight > pageHeight) {
                let heightLeft = pdfHeight;
                while (heightLeft > 0) {
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                    heightLeft -= pageHeight;
                    if (heightLeft > 0) {
                        pdf.addPage();
                        position -= pageHeight;
                    }
                }
            } else {
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }

            pdf.save(`Learning-Roadmap-${roadmap.targetRole.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
        } catch (err) {
            console.error('PDF generation failed:', err);
            setError('Failed to generate PDF document');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
                <MapIcon size={40} style={{ marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
                <p>Loading your learning roadmap...</p>
            </div>
        );
    }

    if (!roadmap) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Learning Roadmap</h1>
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff9800' }}>
                        <MapIcon size={20} /> {error || 'No learning roadmap found yet. Generate one to get started!'}
                    </p>
                </div>
                <button 
                    onClick={handleGenerateRoadmap}
                    disabled={generating}
                    style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: generating ? 'not-allowed' : 'pointer',
                        opacity: generating ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '15px',
                        fontWeight: '600'
                    }}
                >
                    {generating ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    {generating ? 'Generating...' : 'Generate Learning Roadmap'}
                </button>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1 className="text-gradient">Learning Roadmap</h1>
                <button 
                    onClick={downloadRoadmap}
                    disabled={downloading}
                    style={{
                        padding: '12px 22px',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        cursor: downloading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '15px',
                        fontWeight: '700',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                        transition: 'all 0.3s ease',
                        opacity: downloading ? 0.7 : 1,
                        letterSpacing: '0.5px'
                    }}
                    onMouseOver={(e) => {
                        if (!downloading) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)';
                        }
                    }}
                    onMouseOut={(e) => {
                        if (!downloading) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
                        }
                    }}
                >
                    {downloading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={18} />}
                    {downloading ? 'Capturing PDF...' : 'Download as PDF'}
                </button>
            </div>

            <div id="roadmap-content">
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <p><strong>Target Role:</strong> {roadmap.targetRole}</p>
                <p><strong>Total Duration:</strong> {roadmap.totalDuration}</p>
                <p><strong>Difficulty:</strong> {roadmap.difficulty_level}</p>
                <p>Follow this personalized roadmap to bridge your skill gaps and reach your career goal.</p>
            </div>

            <div className="animate-fade-in-up">
                {roadmap.steps && roadmap.steps.map((step, index) => (
                    <div key={index} className="glass-card" style={{ marginBottom: '1rem', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{ background: 'var(--primary)', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {step.step_number}
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--text)' }}>{step.title}</h3>
                                <small style={{ color: '#999' }}>Duration: {step.duration_weeks} weeks • Difficulty: {step.difficulty}</small>
                            </div>
                        </div>

                        <p className="text-muted" style={{ marginLeft: '3rem', marginBottom: '1rem' }}>
                            {step.description}
                        </p>

                        {step.skills && step.skills.length > 0 && (
                            <p style={{ marginLeft: '3rem', color: '#666' }}>
                                <strong>Skills to Learn:</strong> {step.skills.join(', ')}
                            </p>
                        )}

                        {step.resources && step.resources.length > 0 && (
                            <div style={{ marginLeft: '3rem', padding: '1rem', background: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginTop: '1rem' }}>
                                <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', marginTop: 0 }}>
                                    <BookOpen size={16} /> Recommended Resources
                                </h5>
                                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                                    {step.resources.map((resource, i) => (
                                        <li key={i} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                            <span style={{ background: '#7C3AED', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', marginRight: '8px' }}>
                                                {resource.type}
                                            </span>
                                            <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                {resource.title}
                                                <ExternalLink size={12} />
                                            </a>
                                            <small style={{ color: '#999', marginLeft: '8px' }}>({resource.duration})</small>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {step.milestones && step.milestones.length > 0 && (
                            <div style={{ marginLeft: '3rem', marginTop: '1rem', padding: '0.75rem', background: '#f0e6ff', borderRadius: 'var(--radius-md)' }}>
                                <strong>Milestones:</strong>
                                <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>{step.milestones.join(' → ')}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            </div>
        </div>
    );
};

export default LearningRoadmap;
