import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { projectService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  Code, Swords, Trophy, Star, Calendar,
  AlertTriangle, ArrowLeft, ExternalLink, FolderGit
} from 'lucide-react';

const TIER_COLORS = {
  BRONZE: '#CD7F32', SILVER: '#A8A9AD', GOLD: '#FFD700',
  DIAMOND: '#B9F2FF', MASTER: '#FF6B35'
};

const ScoreBadge = ({ score }) => {
  const color = score >= 80 ? 'var(--accent-mint)' : score >= 60 ? 'var(--warning)' : score > 0 ? 'var(--danger)' : 'var(--text-secondary)';
  return (
    <span style={{
      background: `${color}20`, color, borderRadius: '999px',
      padding: '0.15rem 0.6rem', fontSize: '0.78rem',
      fontFamily: 'var(--font-mono)', fontWeight: 700,
      border: `1px solid ${color}40`
    }}>
      {score ? `${score}/100` : '—'}
    </span>
  );
};

const StatCard = ({ icon, label, value, accent }) => (
  <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
    <div style={{ color: accent || 'var(--accent-lavender)', marginBottom: '0.5rem' }}>{icon}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{value ?? '—'}</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{label}</div>
  </div>
);

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    projectService.getUserProfile(id)
      .then(res => { setProfile(res.data); setLoading(false); })
      .catch(() => { setError('User not found.'); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-lavender)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
      <AlertTriangle size={40} style={{ marginBottom: '1rem', color: 'var(--danger)' }} />
      <p>{error}</p>
      <Link to="/community" style={{ color: 'var(--accent-lavender)', marginTop: '1rem', display: 'inline-block' }}>← Back to Community</Link>
    </div>
  );

  const ranking = profile.arenaRanking;
  const tierColor = TIER_COLORS[ranking?.tier] || TIER_COLORS.BRONZE;
  const isOwnProfile = currentUser && String(currentUser.id) === String(profile.id);

  const avgScore = profile.projects?.length
    ? Math.round(profile.projects.filter(p => p.aiScore).reduce((acc, p) => acc + p.aiScore, 0) / (profile.projects.filter(p => p.aiScore).length || 1))
    : null;

  const TABS = [
    { key: 'projects', label: `Projects (${profile._count?.projects || 0})` },
    { key: 'arena', label: `Arena` },
    { key: 'badges', label: `Badges (${profile.badges?.length || 0})` },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link to="/community" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Back
      </Link>

      {/* Profile Header */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(124,111,247,0.1), transparent)' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 700, color: '#fff',
            boxShadow: '0 0 0 4px rgba(124,111,247,0.2)',
          }}>
            {profile.name?.[0]?.toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>{profile.name}</h1>
              <span style={{
                background: 'rgba(124,111,247,0.15)', color: 'var(--accent-lavender)',
                borderRadius: '999px', padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 600,
                border: '1px solid rgba(124,111,247,0.3)',
              }}>{profile.role}</span>
              {ranking && (
                <span style={{
                  background: `${tierColor}20`, color: tierColor,
                  borderRadius: '999px', padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 700,
                  border: `1px solid ${tierColor}40`,
                }}>⚔ {ranking.tier}</span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              {profile.bio || (isOwnProfile ? 'Add a bio in your settings.' : 'No bio yet.')}
            </p>
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={13} /> Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Code size={13} /> {profile._count?.projects || 0} projects
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Trophy size={13} /> {profile._count?.battlesWon || 0} battles won
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={<Code size={20} />} label="Projects" value={profile._count?.projects || 0} accent="var(--accent-lavender)" />
        <StatCard icon={<Star size={20} />} label="Avg AI Score" value={avgScore ? `${avgScore}` : '—'} accent="var(--accent-warm)" />
        <StatCard icon={<Trophy size={20} />} label="Battles Won" value={profile._count?.battlesWon || 0} accent="var(--accent-mint)" />
        {ranking && <StatCard icon={<Swords size={20} />} label="Win Rate" value={ranking.wins + ranking.losses > 0 ? `${Math.round(ranking.wins / (ranking.wins + ranking.losses) * 100)}%` : '—'} accent={tierColor} />}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        {TABS.map(tab => (
          <button key={tab.key} id={`profile-tab-${tab.key}`} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.75rem 1.25rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent-lavender)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent-lavender)' : 'var(--text-secondary)',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent-lavender)' : '2px solid transparent',
              transition: 'all 150ms',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Projects */}
      {activeTab === 'projects' && (
        <div>
          {profile.projects?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <Code size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>No projects submitted yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {profile.projects.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <Link to={`/projects/${p.id}`} style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</Link>
                      {p.language && <span style={{ background: 'rgba(124,111,247,0.12)', color: 'var(--accent-lavender)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.72rem' }}>{p.language}</span>}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      <span>{p._count?.comments || 0} comments</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ScoreBadge score={p.aiScore} />
                    <Link to={`/projects/${p.id}`} style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}><ExternalLink size={14} /></Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Arena */}
      {activeTab === 'arena' && (
        <div className="card" style={{ textAlign: 'center' }}>
          {ranking ? (
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚔️</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: tierColor, marginBottom: '0.25rem' }}>{ranking.tier}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>Season {ranking.season}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[
                  { label: 'Wins', value: ranking.wins, color: 'var(--accent-mint)' },
                  { label: 'Losses', value: ranking.losses, color: 'var(--danger)' },
                  { label: 'Win Streak', value: ranking.winStreak, color: 'var(--accent-warm)' },
                  { label: 'Reputation', value: ranking.reputation, color: 'var(--accent-lavender)' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.2rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
              <Swords size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>No arena ranking yet. Join a battle to get ranked!</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Badges */}
      {activeTab === 'badges' && (
        <div>
          {profile.badges?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <Trophy size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>No badges earned yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              {profile.badges.map(ub => (
                <div key={ub.id} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{ub.badge?.icon || '🏅'}</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{ub.badge?.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{ub.badge?.description}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '0.75rem' }}>
                    {new Date(ub.awardedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
