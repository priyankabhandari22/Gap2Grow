import React, { useState, useEffect } from 'react';
import { Briefcase, BarChart2, Star, Zap } from 'lucide-react';
import userService from '../services/userService';
import jobMarketService from '../services/jobMarketService';

function formatOpenings(value) {
    const total = Number(value || 0);
    return new Intl.NumberFormat('en-IN').format(total);
}

function getDemandLabel(globalOpenings, growthRate) {
    const openings = Number(globalOpenings || 0);
    const growth = Number(growthRate || 0);

    if (openings > 60000 || growth >= 25) return 'Very High';
    if (openings > 25000 || growth >= 15) return 'High';
    if (openings > 10000 || growth >= 8) return 'Moderate';
    return 'Emerging';
}

const MarketIntelligence = () => {
    const [marketData, setMarketData] = useState([]);
    const [personalInsight, setPersonalInsight] = useState(null);
    const [marketTrends, setMarketTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);

    const loadMarketData = async () => {
        const response = await jobMarketService.searchJobMarket('', undefined);
        const results = response?.results || [];

        if (results.length) {
            setMarketData(results);
            return;
        }

        await jobMarketService.syncJobMarketData({
            country: 'in',
            pages: 2,
            pageSize: 50
        });

        const refetchResponse = await jobMarketService.searchJobMarket('', undefined);
        setMarketData(refetchResponse?.results || []);
    };

    const handleSyncNow = async () => {
        try {
            setSyncing(true);
            setError(null);
            await jobMarketService.syncJobMarketData({
                country: 'in',
                pages: 2,
                pageSize: 50
            });
            await loadMarketData();
        } catch (err) {
            setError(err?.error || err?.message || 'Failed to refresh market data');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [marketResult, dashboardResult] = await Promise.allSettled([
                    loadMarketData(),
                    userService.getDashboardSummary()
                ]);

                if (marketResult.status === 'fulfilled') {
                    // market data already set inside loadMarketData
                }

                if (dashboardResult.status === 'fulfilled') {
                    setPersonalInsight(dashboardResult.value.aiInsight || null);
                    setMarketTrends(dashboardResult.value.marketTrends || []);
                }

                if (marketResult.status === 'rejected' && dashboardResult.status === 'rejected') {
                    throw marketResult.reason || dashboardResult.reason;
                }
            } catch (err) {
                setError(err.message || 'Failed to load market intelligence');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Market Intelligence</h1>
                <div className="glass-card">Loading market data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Market Intelligence</h1>
                <div className="glass-card text-danger">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Market Intelligence</h1>
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <p>Explore real-time data on job market demands and required skills for trending AI and Tech roles.</p>
                <div style={{ marginTop: '0.9rem' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleSyncNow}
                        disabled={syncing}
                    >
                        {syncing ? 'Refreshing market feed...' : 'Refresh Live Market Data'}
                    </button>
                </div>
            </div>

            <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Zap size={18} color="var(--primary)" /> AI Insight
                        </h3>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99,102,241,0.12)', padding: '0.25rem 0.55rem', borderRadius: '999px' }}>Personalized</span>
                    </div>
                    {personalInsight ? (
                        <>
                            <p style={{ margin: 0, color: 'var(--text)', lineHeight: 1.55 }}>{personalInsight.message}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
                                <span className="badge">{personalInsight.readyPercent}% ready</span>
                                <span className="badge">+{personalInsight.upliftPercent}% uplift</span>
                            </div>
                        </>
                    ) : (
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Run a resume analysis to get a personalized AI insight.</p>
                    )}
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart2 size={18} color="var(--primary)" /> Recommended Trends
                        </h3>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99,102,241,0.12)', padding: '0.25rem 0.55rem', borderRadius: '999px' }}>Why it fits</span>
                    </div>
                    {marketTrends.length === 0 ? (
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>No personalized trend matches yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {marketTrends.slice(0, 4).map((skill) => (
                                <div key={skill.skillName} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.8rem', borderRadius: '12px', background: skill.isRecommended ? 'rgba(99,102,241,0.06)' : 'var(--surface-inset)', border: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{skill.skillName}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{skill.reason}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontWeight: 800, color: 'var(--success)' }}>{skill.demandPercent}%</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Demand</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {marketData.map((entry) => (
                    <div key={entry._id || entry.role} className="glass-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                            <Briefcase size={24} />
                            <h3 style={{ margin: 0, color: 'var(--text)' }}>{entry.role}</h3>
                        </div>

                        <div style={{ marginBottom: '1rem', background: 'var(--surface-inset)', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}><BarChart2 size={16} /> Demand:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                                {getDemandLabel(entry.jobOpenings?.global, entry.growthRate)}
                            </span>
                        </div>

                        <div style={{ marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Open roles: <strong style={{ color: 'var(--text)' }}>{formatOpenings(entry.jobOpenings?.global)}</strong>
                            <span style={{ margin: '0 0.45rem', color: 'var(--border)' }}>•</span>
                            Growth: <strong style={{ color: 'var(--text)' }}>{Number(entry.growthRate || 0)}%</strong>
                        </div>

                        <div>
                            <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>
                                <Star size={16} /> Top Required Skills
                            </h5>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {(entry.requiredSkills || []).slice(0, 10).map((skill, idx) => (
                                    <span key={`${entry.role}-${skill.skillName}-${idx}`} className="badge">{skill.skillName}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarketIntelligence;
