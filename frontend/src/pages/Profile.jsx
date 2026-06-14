import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MoreVertical,
  PencilLine,
  Github,
  Sparkles,
  Circle,
  Clock3,
  BarChart3,
  Target,
  BadgeCheck,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import './Profile.css';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function sectionTitle(text, icon) {
  return (
    <div className="profile-section-title">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function StatsRow({ stats }) {
  const items = [
    { label: 'Total Analyses', value: stats.totalAnalyses, icon: <BarChart3 size={16} /> },
    { label: 'Avg Gap Score', value: `${stats.avgGapScore}%`, icon: <Target size={16} /> },
    { label: 'Best Role Match', value: stats.bestRoleMatch, icon: <BadgeCheck size={16} /> },
  ];

  return (
    <div className="profile-stats-grid">
      {items.map((item) => (
        <div key={item.label} className="glass-card profile-stat-card">
          <div className="profile-stat-icon">{item.icon}</div>
          <div>
            <div className="profile-stat-value">{item.value}</div>
            <div className="profile-stat-label">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillsSection({ skills }) {
  return (
    <div className="glass-card profile-panel">
      {sectionTitle('Skills Overview', <Sparkles size={16} />)}
      {skills.length === 0 ? (
        <p className="profile-muted">No skills added yet.</p>
      ) : (
        <div className="profile-skills-grid">
          {skills.map((skill) => (
            <div key={skill.id} className="profile-skill-chip">
              <div className="profile-skill-top">
                <span>{skill.name}</span>
                <span>{skill.level}</span>
              </div>
              <div className="profile-skill-track">
                <div className="profile-skill-fill" style={{ width: `${skill.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GitHubSection({ github }) {
  return (
    <div className="glass-card profile-panel">
      {sectionTitle('GitHub', <Github size={16} />)}
      {!github.connected ? (
        <p className="profile-muted">Connect GitHub in Settings to surface your repositories and top languages.</p>
      ) : (
        <div className="profile-github-grid">
          <div className="profile-github-summary">
            {github.avatarUrl ? (
              <img src={github.avatarUrl} alt={github.username} className="profile-github-avatar" />
            ) : (
              <div className="profile-github-avatar fallback">GH</div>
            )}
            <div>
              <div className="profile-github-name">@{github.username}</div>
              <div className="profile-github-bio">{github.bio || 'Public GitHub profile connected.'}</div>
              <a href={github.profileUrl} target="_blank" rel="noreferrer" className="profile-link-inline">
                View profile <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="profile-github-stats">
            <div>
              <span>Projects</span>
              <strong>{github.repoCount}</strong>
            </div>
            <div>
              <span>Top languages</span>
              <div className="profile-language-chips">
                {github.languages.length === 0 ? (
                  <em className="profile-muted">No language data yet.</em>
                ) : (
                  github.languages.map((lang) => (
                    <span key={lang.name} className="badge primary">{lang.name}</span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityTimeline({ items }) {
  return (
    <div className="glass-card profile-panel">
      {sectionTitle('Activity Timeline', <Clock3 size={16} />)}
      {items.length === 0 ? (
        <p className="profile-muted">No recent activity yet.</p>
      ) : (
        <div className="profile-timeline">
          {items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="profile-timeline-row">
              <div className="profile-timeline-marker">
                <Circle size={10} fill="currentColor" />
              </div>
              <div className="profile-timeline-content">
                <div className="profile-timeline-top">
                  <strong>{item.label}</strong>
                  <span>{fmtDate(item.date)}</span>
                </div>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [profileData, summaryData] = await Promise.all([
          userService.getProfile(),
          userService.getDashboardSummary()
        ]);

        if (!cancelled) {
          setProfile(profileData);
          setSummary(summaryData);
        }
      } catch (err) {
        if (!cancelled) setError(err.error || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const normalizedSkills = useMemo(() => {
    const items = profile?.skills || [];
    return items.slice(0, 8).map((skill, index) => ({
      id: skill._id || `${skill.skillName}-${index}`,
      name: skill.skillName || skill.name || 'Skill',
      level: skill.proficiencyLevel || skill.level || 'Beginner',
      progress: Math.max(20, Math.min(100, skill.relevanceScore || (skill.proficiencyLevel === 'Expert' ? 92 : skill.proficiencyLevel === 'Advanced' ? 75 : skill.proficiencyLevel === 'Intermediate' ? 55 : 35)))
    }));
  }, [profile]);

  const stats = useMemo(() => {
    const analyses = summary?.recentAnalyses || [];
    const bestMatch = analyses.length > 0
      ? analyses.slice().sort((a, b) => (b.gap_score || 0) - (a.gap_score || 0))[0]
      : null;

    return {
      totalAnalyses: summary?.overview?.total_analyses || 0,
      avgGapScore: summary?.overview?.average_gap_score || 0,
      bestRoleMatch: bestMatch?.target_role || profile?.targetRole || '—'
    };
  }, [summary, profile]);

  const github = useMemo(() => ({
    connected: Boolean(profile?.githubUsername),
    username: profile?.githubUsername || '',
    profileUrl: profile?.githubProfileUrl || '',
    avatarUrl: profile?.githubAvatarUrl || '',
    bio: profile?.githubBio || '',
    repoCount: profile?.githubRepoCount || 0,
    languages: profile?.githubTopLanguages || []
  }), [profile]);

  const timeline = useMemo(() => {
    const items = [];
    const recentAnalyses = summary?.recentAnalyses || [];

    recentAnalyses.slice(0, 4).forEach((item) => {
      items.push({
        date: item.created_at,
        label: `Analyzed resume for ${item.target_role}`,
        description: `Gap score ${item.gap_score}% with ${item.missing_count} skills still in progress.`
      });
    });

    if (profile?.githubSyncedAt) {
      items.push({
        date: profile.githubSyncedAt,
        label: 'Connected GitHub',
        description: `Synced ${github.repoCount} repositories and top language signals.`
      });
    }

    return items
      .filter(Boolean)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [summary, profile, github.repoCount]);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-shell glass-card">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-shell glass-card text-danger">{error}</div>
      </div>
    );
  }

  const name = `${profile?.firstName || user?.firstName || 'Your'} ${profile?.lastName || user?.lastName || 'Profile'}`.trim();
  const subtext = `${profile?.currentRole || 'Frontend Developer'} | Gap2Grow User`;
  const email = profile?.email || user?.email || '';
  const initial = (profile?.firstName || user?.firstName || 'U').charAt(0).toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <div className="profile-topbar">
          <button className="profile-back-btn" onClick={() => navigate('/dashboard')} title="Back to dashboard">
            <ArrowLeft size={16} />
          </button>
          <div className="profile-actions">
            <button className="profile-icon-btn" onClick={() => navigate('/settings')} title="Edit profile">
              <PencilLine size={15} />
            </button>
            <details className="profile-menu">
              <summary className="profile-icon-btn" title="More actions">
                <MoreVertical size={15} />
              </summary>
              <div className="profile-menu-panel glass-card">
                <button type="button" onClick={() => navigate('/settings')}>Edit account</button>
                <button type="button" onClick={() => navigate('/resume-analyzer')}>Re-analyze resume</button>
                <button type="button" onClick={() => navigate('/market-intelligence')}>Open market intelligence</button>
              </div>
            </details>
          </div>
        </div>

        <div className="glass-card profile-header">
          <div className="profile-header-main">
            {profile?.profileImage ? (
              <img src={profile.profileImage} alt={name} className="profile-avatar" />
            ) : (
              <div className="profile-avatar fallback">{initial}</div>
            )}
            <div>
              <h1>{name}</h1>
              <p>{email}</p>
              <span>{subtext}</span>
            </div>
          </div>
          <div className="profile-header-note">
            <div className="profile-note-dot" />
            <span>Last active {fmtDateTime(summary?.lastAnalysisTime || profile?.githubSyncedAt)}</span>
          </div>
        </div>

        <StatsRow stats={stats} />

        <div className="profile-grid-two">
          <SkillsSection skills={normalizedSkills} />
          <GitHubSection github={github} />
        </div>

        <ActivityTimeline items={timeline} />

        <div className="profile-footer-actions">
          <button className="profile-mini-action" onClick={() => navigate('/settings')} title="Edit profile">
            <PencilLine size={16} />
          </button>
          <button className="profile-mini-action" onClick={() => navigate('/market-intelligence')} title="Open market intelligence">
            <BarChart3 size={16} />
          </button>
          <button className="profile-mini-action" onClick={() => navigate('/resume-analyzer')} title="Re-analyze resume">
            <Sparkles size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}