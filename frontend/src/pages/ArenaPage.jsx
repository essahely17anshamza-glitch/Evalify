import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { arenaService } from '../services/api';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Timer, Zap, Shield, Trophy, Plus, X, Loader, AlertTriangle } from 'lucide-react';

const DIFFICULTY_COLORS = {
  BEGINNER: 'var(--accent-mint)',
  INTERMEDIATE: 'var(--warning)',
  ADVANCED: 'var(--danger)',
};

const DURATION_LABELS = {
  QUICK: '2 hours',
  STANDARD: '48 hours',
  ROYALE: '1 week',
};

const STATUS_CONFIG = {
  PENDING:  { color: 'var(--warning)',      label: 'Pending' },
  ACTIVE:   { color: 'var(--accent-mint)',  label: 'Active' },
  JUDGING:  { color: 'var(--accent-lavender)', label: 'Judging' },
  COMPLETE: { color: 'var(--text-secondary)', label: 'Complete' },
};

// ── Create Challenge Modal ──────────────────────────────────────────────────
const CreateChallengeModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({ title: '', prompt: '', language: 'any', difficulty: 'INTERMEDIATE', duration: 'STANDARD' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.prompt.trim()) return setError('Title and prompt are required.');
    setLoading(true); setError('');
    try {
      await arenaService.createChallenge(form);
      onCreated();
      onClose();
      setForm({ title: '', prompt: '', language: 'any', difficulty: 'INTERMEDIATE', duration: 'STANDARD' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create challenge.');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '540px', borderRadius: 'var(--radius-xl)', padding: '2rem', zIndex: 1 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}><X size={20} /></button>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={20} color="var(--accent-lavender)" /> Create Challenge</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Challenge Title</label>
            <input id="challenge-title" className="input-field" placeholder="e.g. Build a REST API in 2 hours" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Challenge Prompt</label>
            <textarea id="challenge-prompt" className="input-field" placeholder="Describe the challenge in detail..." rows={4} value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Language</label>
              <select id="challenge-language" className="input-field" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                {['any','JavaScript','Python','TypeScript','Java','C++','Go','Rust'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Difficulty</label>
              <select id="challenge-difficulty" className="input-field" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                {['BEGINNER','INTERMEDIATE','ADVANCED'].map(d => <option key={d} value={d}>{d[0] + d.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Duration</label>
              <select id="challenge-duration" className="input-field" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
                {Object.entries(DURATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
          <button id="create-challenge-submit" type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            {loading ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating...</> : '+ Create Challenge'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ── Challenge a Player Modal ────────────────────────────────────────────────
const ChallengeModal = ({ challenge, onClose, onSuccess, setLogoStatus }) => {
  const [opponentId, setOpponentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!opponentId.trim()) return setError('Enter an opponent user ID.');
    setLoading(true); setError('');
    setLogoStatus?.('analyzing');
    try {
      await arenaService.initiateBattle({ challengeId: challenge.id, opponentId });
      onSuccess();
      setLogoStatus?.('battle');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate battle.');
      setLogoStatus?.('error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '400px', borderRadius: 'var(--radius-xl)', padding: '2rem', zIndex: 1 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}><X size={20} /></button>
        <h3 style={{ marginBottom: '0.5rem' }}>⚔ Challenge a Player</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Challenge: <strong style={{ color: 'var(--text-primary)' }}>{challenge.title}</strong>
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Opponent User ID</label>
            <input id="opponent-id-input" className="input-field" placeholder="Enter opponent's user ID..." value={opponentId} onChange={e => setOpponentId(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
          <button id="initiate-battle-btn" type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {loading ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Initiating...</> : <><Swords size={15} /> Initiate Battle</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ── Main Arena Page ─────────────────────────────────────────────────────────
const ArenaPage = ({ setLogoStatus }) => {
  const { user } = useAuth();
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
            <Swords size={28} color="var(--accent-warm)" /> Code <span className="text-gradient">Arena</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Head-to-head coding battles judged by AI. Win fights, climb the ranks.</p>
        </div>
        {user && (
          <button id="create-challenge-btn" className="btn-primary" onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <Plus size={16} /> Create Challenge
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)', marginBottom: '1.75rem' }}>
        {[{ key: 'battles', label: `Active Battles (${battles.filter(b => b.status !== 'COMPLETE').length})` },
          { key: 'challenges', label: `Challenges (${challenges.length})` }].map(tab => (
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
          <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : activeTab === 'battles' ? (
        <div>
          {battles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <Swords size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No battles yet</h3>
              <p>Challenge someone from the Challenges tab to start a battle.</p>
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
                                {String(battle.winnerId) === String(battle.playerAId) ? '🏆 Winner' : 'Defeated'}
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
                                {String(battle.winnerId) === String(battle.playerBId) ? '🏆 Winner' : 'Defeated'}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusCfg.color, boxShadow: battle.status === 'ACTIVE' ? `0 0 6px ${statusCfg.color}` : 'none' }} />
                          <span style={{ color: statusCfg.color, fontWeight: 600 }}>{statusCfg.label}</span>
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
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No challenges yet</h3>
              {user ? <p>Be the first — create a challenge!</p> : <p>Sign in to create a challenge.</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
              {challenges.map((c, i) => {
                const diffColor = DIFFICULTY_COLORS[c.difficulty] || 'var(--text-secondary)';
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, flex: 1, marginRight: '0.5rem' }}>{c.title}</h3>
                      <span style={{ background: `${diffColor}20`, color: diffColor, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${diffColor}40`, flexShrink: 0 }}>
                        {c.difficulty?.[0] + c.difficulty?.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1.25rem' }}>
                      {c.prompt}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Timer size={12} /> {DURATION_LABELS[c.duration]}</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{c.language}</span>
                      </div>
                      {user && (
                        <button id={`challenge-btn-${c.id}`} className="btn-primary"
                          onClick={() => setSelectedChallenge(c)}
                          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Swords size={13} /> Battle
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
        {showCreateModal && <CreateChallengeModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={fetchData} />}
        {selectedChallenge && <ChallengeModal challenge={selectedChallenge} onClose={() => setSelectedChallenge(null)} onSuccess={fetchData} setLogoStatus={setLogoStatus} />}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ArenaPage;
