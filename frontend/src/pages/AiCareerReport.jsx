import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Briefcase, Download, Loader, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useDashboard } from '../context/DashboardContext';
import reportService from '../services/reportService';

const AiCareerReport = () => {
    const { skillGap, fetchSkillGap } = useDashboard();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchCareerReport();
        if (!skillGap) {
            fetchSkillGap();
        }
    }, []);

    const fetchCareerReport = async () => {
        try {
            setLoading(true);
            const data = await reportService.getLatestCareerReport();
            if (!data) {
                setReport(null);
                setError('No career report found yet. Generate one to get started!');
            } else {
                setReport(data);
                setError(null);
            }
        } catch (err) {
            setReport(null);
            setError(err.response?.data?.message || 'Failed to fetch report');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        console.log('[FRONTEND: CAREER REPORT] Generate button clicked!');
        const activeSkillGap = skillGap || await fetchSkillGap(true);

        if (!activeSkillGap?._id) {
            console.error('[FRONTEND: CAREER REPORT] No Skill Gap ID found, cannot generate.');
            setError('Please generate a Skill Gap Forecast first');
            return;
        }

        try {
            console.log(`[FRONTEND: CAREER REPORT] Sending request to generate report for Skill Gap ID: ${activeSkillGap._id}...`);
            setGenerating(true);
            setError(null);
            const data = await reportService.generateCareerReport(activeSkillGap._id);
            console.log('[FRONTEND: CAREER REPORT] ✅ Successfully received generated report from backend:', data);
            setReport(data.report);
        } catch (err) {
            console.error('[FRONTEND: CAREER REPORT] ❌ Error generating report:', err.response?.data || err);
            setError(err.response?.data?.error || 'Failed to generate report');
        } finally {
            setGenerating(false);
            console.log('[FRONTEND: CAREER REPORT] Generation process finished.');
        }
    };

    const downloadReport = async () => {
        if (!report || downloading) return;
        setDownloading(true);
        try {
            const element = document.getElementById('report-content');
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

            pdf.save(`AI-Career-Report-${report.targetRole.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
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
                <Loader size={40} style={{ marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
                <p>Loading your career report...</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>AI Career Report</h1>
                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff9800' }}>
                        <TrendingUp size={20} /> {error || 'No career report found yet. Generate one to get started!'}
                    </p>
                </div>
                <button 
                    onClick={handleGenerateReport}
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
                    {generating ? 'Generating...' : 'Generate Career Report'}
                </button>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="text-gradient">AI Career Report</h1>
                <button 
                    onClick={downloadReport}
                    disabled={downloading}
                    style={{
                        padding: '12px 22px',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        cursor: downloading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '15px',
                        fontWeight: '700',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                        transition: 'all 0.3s ease',
                        opacity: downloading ? 0.7 : 1,
                        letterSpacing: '0.5px'
                    }}
                    onMouseOver={(e) => {
                        if (!downloading) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.6)';
                        }
                    }}
                    onMouseOut={(e) => {
                        if (!downloading) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
                        }
                    }}
                >
                    {downloading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={18} />}
                    {downloading ? 'Capturing PDF...' : 'Download as PDF'}
                </button>
            </div>

            <div id="report-content" className="glass-card animate-fade-in-up" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(124, 58, 237, 0.15)', borderRadius: 'var(--radius-lg)' }}>
                        <TrendingUp size={32} color="var(--primary)" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0 }}>Career Trajectory: {report.trajectory}</h2>
                        <p className="text-muted" style={{ margin: '0.5rem 0 0 0' }}>Target Role: <strong>{report.targetRole}</strong></p>
                    </div>
                </div>

                <p style={{ fontSize: '1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
                    {report.careerPath}
                </p>

                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📈 Expected Growth</h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
                    {report.expectedGrowth}
                </p>

                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>💰 Salary Progression</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#4caf50' }}>
                            <Briefcase size={20} />
                            <h4 style={{ margin: 0 }}>Current Level</h4>
                        </div>
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: 'var(--text)' }}>{report.salaryProgression.currentLevel.role}</p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>{report.salaryProgression.currentLevel.salary}</p>
                    </div>

                    <div style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                            <TrendingUp size={20} />
                            <h4 style={{ margin: 0 }}>Target Level</h4>
                        </div>
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: 'var(--text)' }}>{report.salaryProgression.targetLevel.role}</p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>{report.salaryProgression.targetLevel.salary}</p>
                    </div>
                </div>

                <div style={{ background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#d97706' }}>
                        <DollarSign size={20} />
                        <h4 style={{ margin: 0 }}>Timeline to Reach Target</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>{report.salaryProgression.timeline}</p>
                </div>

                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🎯 Key Milestones</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '2rem' }}>
                    {report.keyMilestones.map((milestone, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface-inset)', borderRadius: 'var(--radius-md)' }}>
                            <CheckCircle size={18} style={{ color: '#4caf50', marginTop: '2px', flexShrink: 0 }} />
                            <span>{milestone}</span>
                        </div>
                    ))}
                </div>

                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>💡 Recommendations</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '2rem' }}>
                    {report.recommendations.map((rec, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                                {i + 1}
                            </span>
                            <span>{rec}</span>
                        </div>
                    ))}
                </div>

                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>⚠️ Risk Factors</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '2rem' }}>
                    {report.riskFactors.map((risk, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255, 107, 107, 0.1)', borderRadius: 'var(--radius-md)' }}>
                            <AlertCircle size={18} style={{ color: '#ff6b6b', marginTop: '2px', flexShrink: 0 }} />
                            <span>{risk}</span>
                        </div>
                    ))}
                </div>

                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>⭐ Opportunities</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                    {report.opportunities.map((opp, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255, 165, 0, 0.1)', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ color: '#ffa500', fontSize: '18px' }}>★</span>
                            <span>{opp}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AiCareerReport;
