import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Trophy, Star, Code, Swords, Loader, AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const TIER_COLORS = {
  BRONZE: '#CD7F32', SILVER: '#A8A9AD', GOLD: '#FFD700',
  DIAMOND: '#B9F2FF', MASTER: '#FF6B35'
};

const LeaderboardPage = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('projects');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('all');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'projects') {
        const res = await api.get(`/leaderboard?period=${period}`);
        setData(res.data.data);
      } else if (activeTab === 'arena') {
        const res = await api.get(`/leaderboard/arena`);
        setData(res.data.data);
      }
    } catch (err) {
      setError(t('failedLeaderboard'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, period, t]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const TABS = [
    { id: 'projects', label: t('topProjects'), icon: <Star size={16} /> },
    { id: 'arena', label: t('arenaRankings'), icon: <Swords size={16} /> }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <Trophy size={40} color="var(--accent-mint)" /> {t('globalLeaderboard')}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('discoverTopDevs')}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn-primary ${activeTab !== tab.id ? 'btn-outline' : ''}`}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: activeTab === tab.id ? 'var(--accent-lavender)' : 'transparent',
              borderColor: activeTab === tab.id ? 'var(--accent-lavender)' : 'var(--border-color)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <select className="input-field" style={{ width: 'auto', padding: '0.4rem 1rem' }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">{t('allTime')}</option>
            <option value="month">{t('thisMonth')}</option>
            <option value="week">{t('thisWeek')}</option>
          </select>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--danger)' }}>
          <AlertTriangle size={32} style={{ margin: '0 auto 1rem' }} />
          <p>{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <p>{t('noData')}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '1rem', width: '80px', textAlign: 'center' }}>{t('rank')}</th>
                <th style={{ padding: '1rem' }}>{t('userProject')}</th>
                {activeTab === 'projects' ? (
                  <>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>{t('rating')}</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>{t('aiScore')}</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>{t('tier')}</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>{t('winRate')}</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>{t('wins')}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 150ms' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {/* Rank */}
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, fontSize: '1.2rem', color: index === 0 ? 'var(--accent-mint)' : index === 1 ? 'var(--warning)' : index === 2 ? '#CD7F32' : 'var(--text-secondary)' }}>
                    #{item.rank}
                  </td>
                  
                  {/* User / Project Info */}
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Link to={`/profile/${activeTab === 'projects' ? item.user?.id : item.user?.id}`}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                          {item.user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      </Link>
                      <div>
                        {activeTab === 'projects' ? (
                          <>
                            <Link to={`/projects/${item.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1.05rem', display: 'block', marginBottom: '0.2rem' }}>
                              {item.title}
                            </Link>
                            <Link to={`/profile/${item.user?.id}`} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                              {t('by')} {item.user?.name}
                            </Link>
                          </>
                        ) : (
                          <Link to={`/profile/${item.user?.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1.05rem' }}>
                            {item.user?.name}
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Metrics */}
                  {activeTab === 'projects' ? (
                    <>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: 'var(--accent-mint)', fontWeight: 700 }}>
                          <Star size={16} fill="var(--accent-mint)" /> {item.averageRating || '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.ratingCount} {t('votes')}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--accent-lavender)' }}>
                        {item.aiScore ? `${item.aiScore}/100` : '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                          background: `${TIER_COLORS[item.tier] || TIER_COLORS.BRONZE}20`,
                          color: TIER_COLORS[item.tier] || TIER_COLORS.BRONZE,
                          padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
                          border: `1px solid ${TIER_COLORS[item.tier] || TIER_COLORS.BRONZE}40`
                        }}>
                          {item.tier}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--accent-mint)' }}>
                        {item.winRate}%
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.wins}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default LeaderboardPage;
