import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userService, authService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import {
  Code, Swords, Trophy, Star, Calendar,
  AlertTriangle, ArrowLeft, ExternalLink, FolderGit, Award, Shield, X, Loader, GraduationCap
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
      {score ? `${score}/100` : '-'}
    </span>
  );
};

const TierRing = ({ ranking }) => {
  const tiers = [
    { name: 'BRONZE', min: 0, max: 4 },
    { name: 'SILVER', min: 5, max: 9 },
    { name: 'GOLD', min: 10, max: 24 },
    { name: 'DIAMOND', min: 25, max: 49 },
    { name: 'MASTER', min: 50, max: null }
  ];
  
  const currentTier = ranking?.tier || 'BRONZE';
  const wins = ranking?.wins || 0;
  const tierIndex = tiers.findIndex(t => t.name === currentTier);
  const current = tiers[tierIndex];
  
  const { t } = useLanguage();
  
  let progress = 100;
  let nextTier = null;
  if (current.max !== null) {
    nextTier = tiers[tierIndex + 1];
    progress = Math.min(100, Math.max(0, ((wins - current.min) / (current.max - current.min + 1)) * 100));
  }

  const color = TIER_COLORS[currentTier] || TIER_COLORS.BRONZE;
  const size = 160;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--bg-hover)" strokeWidth={strokeWidth} />
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', marginBottom: '0.2rem' }}><Swords size={22} style={{ color: 'var(--accent-lavender)' }} /></div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{currentTier}</div>
        </div>
      </div>
      {nextTier ? (
        <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <strong>{current.max + 1 - wins}</strong> {t('winsToNextTier')} {nextTier.name}
        </div>
      ) : (
        <div style={{ marginTop: '1rem', color: 'var(--accent-mint)', fontSize: '0.85rem', fontWeight: 600 }}>
          {t('maxTierReached')}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, accent }) => (
  <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
    <div style={{ color: accent || 'var(--accent-lavender)', marginBottom: '0.5rem' }}>{icon}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{value ?? '-'}</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{label}</div>
  </div>
);

export default function ProfilePage() {
  const { t, lang } = useLanguage();
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');

  // Request Teacher Role
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [proof, setProof] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  const handleRequestTeacher = async (e) => {
    e.preventDefault();
    if (!proof.trim()) {
      setRequestError(t('proofRequired'));
      return;
    }
    setSubmittingRequest(true);
    setRequestError('');
    try {
      await userService.requestTeacherRole(proof);
      setRequestSuccess(true);
      setTimeout(() => setShowRequestModal(false), 2000);
    } catch (err) {
      const serverError = err.response?.data?.error;
      setRequestError(typeof serverError === 'string' ? serverError : (serverError?.message || err.message || t('requestSubmitFailed')));
    } finally {
      setSubmittingRequest(false);
    }
  };

  useEffect(() => {
    userService.getUserProfile(id)
      .then(res => { setProfile(res.data); setLoading(false); })
      .catch(() => { setError(t('userNotFound')); setLoading(false); });
  }, [id, t]);

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
      <Link to="/community" style={{ color: 'var(--accent-lavender)', marginTop: '1rem', display: 'inline-block' }}>← {t('backToCommunity')}</Link>
    </div>
  );

  if (profile.role === 'ADMIN') {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Link to="/community" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          <ArrowLeft size={16} /> {t('back')}
        </Link>
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Shield size={64} style={{ color: 'var(--danger)', marginBottom: '1rem', opacity: 0.8 }} />
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{profile.name}</h1>
          <div style={{ color: 'var(--danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239,68,68,0.1)', padding: '0.4rem 1rem', borderRadius: '999px' }}>
            <Shield size={14} /> Administrateur — compte de gestion
          </div>
        </div>
      </motion.div>
    );
  }

  const ranking = profile.arenaRanking;
  const tierColor = TIER_COLORS[ranking?.tier] || TIER_COLORS.BRONZE;
  const isOwnProfile = currentUser && String(currentUser.id) === String(profile.id);

  const avgScore = profile.projects?.length
    ? Math.round(profile.projects.filter(p => p.aiScore).reduce((acc, p) => acc + p.aiScore, 0) / (profile.projects.filter(p => p.aiScore).length || 1))
    : null;

  const TABS = [
    { key: 'projects', label: `${t('projects')} (${profile._count?.projects || 0})` },
    { key: 'arena', label: t('arena') },
    { key: 'badges', label: `${t('badges')} (${profile.badges?.length || 0})` },
  ];

  const isTeacherProfile = profile.role === 'TEACHER';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link to="/community" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> {t('back')}
      </Link>

      {/* Profile Header */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(124,111,247,0.1), transparent)' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
            background: isTeacherProfile ? 'linear-gradient(135deg, #FFB347, #FF7B54)' : 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 700, color: '#fff',
            boxShadow: isTeacherProfile ? '0 0 0 4px rgba(255,179,71,0.3)' : '0 0 0 4px rgba(124,111,247,0.2)',
          }}>
            {profile.name?.[0]?.toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: isTeacherProfile ? 800 : 700, color: isTeacherProfile ? '#FFF' : 'var(--text-primary)' }}>
                {profile.name}
              </h1>
              
              <span style={{
                background: isTeacherProfile ? 'rgba(255,215,0,0.15)' : 'rgba(124,111,247,0.15)',
                color: isTeacherProfile ? '#FFD700' : 'var(--accent-lavender)',
                borderRadius: '999px', padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 600,
                border: isTeacherProfile ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(124,111,247,0.3)',
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
              }}>
                {isTeacherProfile ? <><GraduationCap size={12} /> {t('teacherLabel')}</> : t('studentLabel')}
              </span>

              {ranking && !isTeacherProfile && (
                <span style={{
                  background: `${tierColor}20`, color: tierColor,
                  borderRadius: '999px', padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 700,
                  border: `1px solid ${tierColor}40`,
                }}>{ranking.tier}</span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              {profile.bio || (isOwnProfile ? t('addBio') : t('noBioYet'))}
            </p>
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={13} /> {t('joinedIn')} {new Date(profile.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { year: 'numeric', month: 'long' })}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Code size={13} /> {profile._count?.projects || 0} {t('projectsCount')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Trophy size={13} /> {profile._count?.battlesWon || 0} {t('battlesWon')}
              </span>
            </div>
            
            {isOwnProfile && profile.role === 'STUDENT' && (
              <button 
                onClick={() => setShowRequestModal(true)}
                style={{
                  marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', background: 'rgba(0,196,154,0.1)', color: 'var(--accent-mint)',
                  border: '1px solid rgba(0,196,154,0.3)', borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                <Shield size={16} /> {t('verifyAsTeacher')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {isTeacherProfile && (
          <>
            <StatCard icon={<FolderGit size={20} />} label={t('classesTaught')} value={profile._count?.taughtClasses || 0} accent="#FFD700" />
            <StatCard icon={<Code size={20} />} label={t('officialChallenges')} value={profile._count?.createdChallenges || 0} accent="#FFD700" />
          </>
        )}
        <StatCard icon={<Code size={20} />} label={t('projects')} value={profile._count?.projects || 0} accent="var(--accent-lavender)" />
        <StatCard icon={<Star size={20} />} label={t('avgAiScore')} value={avgScore ? `${avgScore}` : '-'} accent="var(--accent-warm)" />
        <StatCard icon={<Trophy size={20} />} label={t('battlesWon')} value={profile._count?.battlesWon || 0} accent="var(--accent-mint)" />
        {ranking && <StatCard icon={<Swords size={20} />} label={t('winRate')} value={ranking.wins + ranking.losses > 0 ? `${Math.round(ranking.wins / (ranking.wins + ranking.losses) * 100)}%` : '-'} accent={tierColor} />}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        {TABS.map(tab => (
          <button key={tab.key} id={`profile-tab-${tab.key}`} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.75rem 1.25rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
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
              <p>{t('noProjects')}</p>
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
                      <span>{new Date(p.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')}</span>
                      <span>{p._count?.comments || 0} {t('comments')}</span>
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
              <TierRing ranking={ranking} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>{t('season')} {ranking.season}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[
                  { label: t('wins'), value: ranking.wins, color: 'var(--accent-mint)' },
                  { label: t('losses'), value: ranking.losses, color: 'var(--danger)' },
                  { label: t('winStreak'), value: ranking.winStreak, color: 'var(--accent-warm)' },
                  { label: t('reputation'), value: ranking.reputation, color: 'var(--accent-lavender)' },
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
              <p>{t('noArena')}</p>
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
              <p>{t('noBadges')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              {profile.badges.map(ub => (
                <div key={ub.id} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', marginBottom: '0.75rem' }}><Award size={20} style={{ color: 'var(--accent-lavender)' }} /></div>
                  <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{ub.badge?.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{ub.badge?.description}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '0.75rem' }}>
                    {new Date(ub.awardedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Request Teacher Modal */}
      {showRequestModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !submittingRequest && setShowRequestModal(false)}
            style={{ position: 'absolute', inset: 0, background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} />
          
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '450px', borderRadius: 'var(--radius-xl)', padding: '2.5rem', zIndex: 1 }}>
            
            <button onClick={() => setShowRequestModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}>
              <X size={20} />
            </button>

            {requestSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <Shield size={48} color="var(--accent-mint)" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ marginBottom: '0.5rem' }}>{t('requestSent')}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{t('requestReview')}</p>
              </div>
            ) : (
              <>
                <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Shield size={24} color="var(--accent-mint)" /> {t('verifyAsTeacher')}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {t('verifyTeacherHelp')}
                </p>

                <form onSubmit={handleRequestTeacher}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('proofInviteCode')}</label>
                    <textarea 
                      className="input-field" 
                      rows={3} 
                      value={proof} 
                      onChange={(e) => setProof(e.target.value)}
                      placeholder={t('verificationPlaceholder')}
                      disabled={submittingRequest}
                    />
                  </div>

                  {requestError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertTriangle size={14} /> {requestError}
                    </div>
                  )}

                  <button type="submit" className="btn-primary full-width" disabled={submittingRequest}>
                    {submittingRequest ? <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : t('submitRequest')}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
