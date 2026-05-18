import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { arenaService, userService } from '../services/api';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Timer, Zap, Shield, Trophy, Plus, X, Loader, AlertTriangle, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const DIFFICULTY_COLORS = {
  BEGINNER: 'var(--accent-mint)',
  INTERMEDIATE: 'var(--warning)',
  ADVANCED: 'var(--danger)',
};

const DURATION_LABELS = {
  QUICK: 'quickDuration',
  STANDARD: 'standardDuration',
  ROYALE: 'royaleDuration',
};

const STATUS_CONFIG = {
  PENDING:  { color: 'var(--warning)', labelKey: 'statusPending' },
  ACTIVE:   { color: 'var(--accent-mint)', labelKey: 'statusActive' },
  JUDGING:  { color: 'var(--accent-lavender)', labelKey: 'statusJudging' },
  COMPLETE: { color: 'var(--text-secondary)', labelKey: 'statusComplete' },
};

const DIFFICULTY_LABELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

// ── Create Challenge Modal ──────────────────────────────────────────────────
const CreateChallengeModal = ({ isOpen, onClose, onCreated, user }) => {
  const { t } = useLanguage();
  const [form, setForm] = useState({ title: '', prompt: '', language: 'any', difficulty: 'INTERMEDIATE', duration: 'STANDARD', type: 'COMMUNITY' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.prompt.trim()) return setError(t('titlePromptRequired'));
    setLoading(true); setError('');
    try {
      await arenaService.createChallenge(form);
      onCreated();
      onClose();
      setForm({ title: '', prompt: '', language: 'any', difficulty: 'INTERMEDIATE', duration: 'STANDARD' });
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.response?.data?.error;
      setError(typeof errMsg === 'string' ? errMsg : t('failedCreateChallenge'));
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '540px', borderRadius: 'var(--radius-xl)', padding: '2rem', zIndex: 1 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}><X size={20} /></button>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={20} color="var(--accent-lavender)" /> {t('createChallenge')}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{t('challengeTitle')}</label>
            <input id="challenge-title" className="input-field" placeholder={t('challengeTitlePlaceholder')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{t('challengePrompt')}</label>
            <textarea id="challenge-prompt" className="input-field" placeholder={t('challengePromptPlaceholder')} rows={4} value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{t('challengeType')}</label>
              <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="COMMUNITY">{t('communityMatch')}</option>
                <option value="OFFICIAL">{t('officialGraded')}</option>
              </select>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{t('language')}</label>
              <select id="challenge-language" className="input-field" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                {['any','JavaScript','Python','TypeScript','Java','C++','Go','Rust'].map(l => <option key={l} value={l}>{l === 'any' ? t('anyLanguage') : l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{t('difficulty')}</label>
              <select id="challenge-difficulty" className="input-field" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                {['BEGINNER','INTERMEDIATE','ADVANCED'].map(d => <option key={d} value={d}>{t(DIFFICULTY_LABELS[d])}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{t('duration')}</label>
              <select id="challenge-duration" className="input-field" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
                {Object.entries(DURATION_LABELS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
              </select>
            </div>
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
          <button id="create-challenge-submit" type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            {loading ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('creating')}</> : `+ ${t('createChallenge')}`}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ── Challenge a Player Modal ────────────────────────────────────────────────
const ChallengeModal = ({ challenge, onClose, onSuccess, setLogoStatus }) => {
  const { t } = useLanguage();
  const [opponentId, setOpponentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await userService.searchUsers(searchQuery);
        setSearchResults(res.data || []);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setOpponentId(u.id);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!opponentId) return setError(t('selectOpponentError'));
    setLoading(true); setError('');
    setLogoStatus?.('analyzing');
    try {
      await arenaService.initiateBattle({ challengeId: challenge.id, opponentId });
      onSuccess();
      setLogoStatus?.('battle');
      onClose();
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.response?.data?.error;
      setError(typeof errMsg === 'string' ? errMsg : t('failedInitiateBattle'));
      setLogoStatus?.('error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '400px', borderRadius: 'var(--radius-xl)', padding: '2rem', zIndex: 1, overflow: 'visible' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}><X size={20} /></button>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Swords size={16} /> {t('challengePlayer')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          {t('challengeLabel')} <strong style={{ color: 'var(--text-primary)' }}>{challenge.title}</strong>
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{t('selectOpponent')}</label>
            
            {!selectedUser ? (
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  autoComplete="off"
                  id="opponent-search-input" className="input-field" placeholder={t('searchByName')} 
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.75rem', width: '100%' }}
                />
                {isSearching && <Loader size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', animation: 'spin 0.8s linear infinite', color: 'var(--accent-lavender)' }} />}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(124,111,247,0.1)', border: '1px solid var(--accent-lavender)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.8rem' }}>
                    {selectedUser.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedUser.name}</div>
                    {selectedUser.arenaRanking && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('tierLabel')} {selectedUser.arenaRanking.tier}</div>}
                  </div>
                </div>
                <button type="button" onClick={() => { setSelectedUser(null); setOpponentId(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Dropdown Results */}
            {searchResults.length > 0 && !selectedUser && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-modal)', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                {searchResults.map(u => (
                  <div key={u.id} onClick={() => handleSelectUser(u)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,111,247,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-mint), var(--accent-lavender))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.8rem' }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name}</div>
                      {u.arenaRanking && <div style={{ fontSize: '0.7rem', color: 'var(--accent-mint)' }}>{t('tierLabel')} {u.arenaRanking.tier}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
          <button id="initiate-battle-btn" type="submit" className="btn-primary" disabled={loading || !opponentId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: opponentId ? 1 : 0.5 }}>
            {loading ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('initiating')}</> : <><Swords size={15} /> {t('initiateBattle')}</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ── Main Arena Page ─────────────────────────────────────────────────────────
const ArenaPage = ({ setLogoStatus }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [challenges, setChallenges] = useState([]);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [activeTab, setActiveTab] = useState('battles');

  const fetchData = async () => {
    try {
      const [cRes, bRes] = await Promise.all([arenaService.getChallenges(), arenaService.getBattles()]);
      setChallenges(cRes.data || []);
      setBattles(bRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Swords size={28} color="var(--accent-warm)" /> <span className="text-gradient">{t('codeArena')}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('codingBattles')}</p>
        </div>
        {user && (
          <button id="create-challenge-btn" className="btn-primary" onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <Plus size={16} /> {t('createChallenge')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)', marginBottom: '1.75rem' }}>
        {[{ key: 'battles', label: `${t('activeChallenges')} (${battles.filter(b => b.status !== 'COMPLETE').length})` },
          { key: 'challenges', label: `${t('codingBattles')} (${challenges.length})` }].map(tab => (
          <button key={tab.key} id={`arena-tab-${tab.key}`} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent-lavender)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent-lavender)' : 'var(--text-secondary)', transition: 'all 150ms' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)', gap: '0.75rem' }}>
          <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('loading')}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : activeTab === 'battles' ? (
        <div>
          {battles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <Swords size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{t('noBattlesYet')}</h3>
              <p>{t('challengeSomeoneText')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {battles.map((battle, i) => {
                const statusCfg = STATUS_CONFIG[battle.status] || STATUS_CONFIG.PENDING;
                return (
                  <motion.div key={battle.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <Link to={`/arena/battles/${battle.id}`} style={{ textDecoration: 'none' }}>
                      <div className="card" style={{ borderColor: battle.status === 'ACTIVE' ? 'rgba(255,107,53,0.4)' : 'var(--border-color)', cursor: 'pointer' }}>
                        {/* Challenge title */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {battle.challenge?.title}
                        </div>
                        {/* Players VS */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, margin: '0 auto 0.4rem', fontSize: '1.1rem' }}>
                              {battle.playerA?.name?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{battle.playerA?.name}</div>
                            {battle.status === 'COMPLETE' && battle.winnerId && (
                              <div style={{ fontSize: '0.7rem', color: String(battle.winnerId) === String(battle.playerAId) ? 'var(--accent-mint)' : 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                {String(battle.winnerId) === String(battle.playerAId)
                                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-mint)' }}><Trophy size={11} /> {t('winner')}</span>
                                  : t('defeated')
                                }
                              </div>
                            )}
                          </div>
                          <div style={{ color: 'var(--accent-warm)', fontWeight: 900, fontSize: '1.2rem', fontStyle: 'italic' }}>VS</div>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-mint), var(--accent-lavender))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, margin: '0 auto 0.4rem', fontSize: '1.1rem' }}>
                              {battle.playerB?.name?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{battle.playerB?.name}</div>
                            {battle.status === 'COMPLETE' && battle.winnerId && (
                              <div style={{ fontSize: '0.7rem', color: String(battle.winnerId) === String(battle.playerBId) ? 'var(--accent-mint)' : 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                {String(battle.winnerId) === String(battle.playerBId)
                                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-mint)' }}><Trophy size={11} /> {t('winner')}</span>
                                  : t('defeated')
                                }
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusCfg.color, boxShadow: battle.status === 'ACTIVE' ? `0 0 6px ${statusCfg.color}` : 'none' }} />
                          <span style={{ color: statusCfg.color, fontWeight: 600 }}>{t(statusCfg.labelKey)}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Challenges Tab */
        <div>
          {challenges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <Zap size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{t('noChallengesYet')}</h3>
              {user ? <p>{t('firstCreateChallenge')}</p> : <p>{t('signInCreateChallenge')}</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {challenges.map((c, i) => {
                const diffColor = DIFFICULTY_COLORS[c.difficulty] || 'var(--text-secondary)';
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card" style={{ borderTop: c.type === 'OFFICIAL' ? '3px solid var(--accent-mint)' : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1, marginRight: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.2rem' }}>{c.title}</h3>
                        {c.type === 'OFFICIAL' && <span style={{ background: 'rgba(0,196,154,0.1)', color: 'var(--accent-mint)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{t('officialChallenge')}</span>}
                      </div>
                      <span style={{ background: `${diffColor}20`, color: diffColor, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${diffColor}40`, flexShrink: 0 }}>
                        {t(DIFFICULTY_LABELS[c.difficulty] || 'intermediate')}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1.25rem' }}>
                      {c.prompt}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Timer size={12} /> {t(DURATION_LABELS[c.duration] || 'standardDuration')}</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{c.language}</span>
                      </div>
                      {user && (
                        <button id={`challenge-btn-${c.id}`} className="btn-primary"
                          onClick={() => setSelectedChallenge(c)}
                          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Swords size={13} /> {t('battle')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && <CreateChallengeModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={fetchData} user={user} />}
        {selectedChallenge && <ChallengeModal challenge={selectedChallenge} onClose={() => setSelectedChallenge(null)} onSuccess={fetchData} setLogoStatus={setLogoStatus} />}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ArenaPage;
