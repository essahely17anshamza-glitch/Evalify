import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { arenaService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { UploadCloud, CheckCircle, ArrowLeft, Loader, Swords, Trophy, Clock, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  PENDING:  { color: 'var(--warning)',         label: 'Pending',  desc: 'Waiting for the battle to begin.' },
  ACTIVE:   { color: 'var(--accent-mint)',     label: 'Active',   desc: 'Both players can now submit their solutions.' },
  JUDGING:  { color: 'var(--accent-lavender)', label: 'Judging',  desc: 'AI is evaluating both submissions...' },
  COMPLETE: { color: 'var(--text-secondary)', label: 'Complete', desc: 'Battle concluded. See the results below.' },
};

const PlayerAvatar = ({ name, gradient, size = 56 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: gradient || 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.35 + 'px', color: '#fff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  }}>
    {name?.[0]?.toUpperCase()}
  </div>
);

const ScoreCircle = ({ score, size = 100 }) => {
  const color = score >= 80 ? 'var(--accent-mint)' : score >= 60 ? 'var(--warning)' : score > 0 ? 'var(--danger)' : 'var(--text-secondary)';
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={size/2 - 6} fill="none" stroke="var(--bg-hover)" strokeWidth="6" />
        {score > 0 && <circle cx={size/2} cy={size/2} r={size/2 - 6} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={2 * Math.PI * (size/2 - 6)}
          strokeDashoffset={2 * Math.PI * (size/2 - 6) * (1 - score / 100)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease' }} />}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: size * 0.24 + 'px', color }}>{score ?? '—'}</span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '1px' }}>/ 100</span>
      </div>
    </div>
  );
};

const BattleDetailPage = ({ setLogoStatus }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const fetchBattle = async () => {
    try {
      const res = await arenaService.getBattle(id);
      setBattle(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBattle(); }, [id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) { setUploadError('Please upload a .zip file.'); return; }

    setUploading(true); setUploadError('');
    setLogoStatus?.('analyzing');
    try {
      const formData = new FormData();
      formData.append('title', `Battle: ${battle.challenge.title}`);
      formData.append('description', 'Arena battle submission');
      formData.append('language', battle.challenge.language);
      formData.append('projectFile', file);
      await arenaService.submitBattle(id, formData);
      setUploadSuccess(true);
      fetchBattle();
      setLogoStatus?.('battle');
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
      setLogoStatus?.('error');
    } finally { setUploading(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '0.75rem', color: 'var(--text-secondary)' }}>
      <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading battle...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!battle) return (
    <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
      <AlertTriangle size={40} style={{ marginBottom: '1rem', color: 'var(--danger)' }} />
      <p>Battle not found.</p>
      <Link to="/arena" style={{ color: 'var(--accent-lavender)', marginTop: '1rem', display: 'inline-block' }}>← Back to Arena</Link>
    </div>
  );

  const isParticipant = user && battle && (String(user.id) === String(battle.playerAId) || String(user.id) === String(battle.playerBId));
  const hasSubmitted = battle.submissions?.some(s => String(s.userId) === String(user?.id));
  const statusCfg = STATUS_CONFIG[battle.status] || STATUS_CONFIG.PENDING;

  useEffect(() => {
    if (!battle) return;
    if (battle.status === 'ACTIVE' && isParticipant) {
      setLogoStatus?.('battle');
    } else if (battle.status === 'JUDGING') {
      setLogoStatus?.('analyzing');
    } else if (battle.status === 'COMPLETE' && isParticipant) {
      setLogoStatus?.(String(battle.winnerId) === String(user?.id) ? 'victory' : 'defeat');
    } else {
      setLogoStatus?.('idle');
    }
  }, [battle, isParticipant, user?.id, setLogoStatus]);

  const subA = battle.submissions?.find(s => String(s.userId) === String(battle.playerAId));
  const subB = battle.submissions?.find(s => String(s.userId) === String(battle.playerBId));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link to="/arena" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Back to Arena
      </Link>

      {/* Battle Header */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(124,111,247,0.08))', textAlign: 'center', padding: '2rem' }}>
        {/* Status badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', background: `${statusCfg.color}15`, border: `1px solid ${statusCfg.color}40`, borderRadius: '999px', padding: '0.3rem 0.9rem', fontSize: '0.8rem' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusCfg.color, boxShadow: battle.status === 'ACTIVE' ? `0 0 8px ${statusCfg.color}` : 'none' }} />
          <span style={{ color: statusCfg.color, fontWeight: 600 }}>{statusCfg.label}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>— {statusCfg.desc}</span>
        </div>

        {/* VS layout */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <PlayerAvatar name={battle.playerA?.name} gradient="linear-gradient(135deg, #7C6FF7, #FF6B35)" />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.6rem' }}>{battle.playerA?.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Player 1</div>
            {battle.status === 'COMPLETE' && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: String(battle.winnerId) === String(battle.playerAId) ? 'var(--accent-mint)' : 'var(--text-secondary)', fontWeight: 600 }}>
                {String(battle.winnerId) === String(battle.playerAId) ? '🏆 Winner' : ''}
              </div>
            )}
            {subA && <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--accent-mint)' }}>✓ Submitted</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <Swords size={28} color="var(--accent-warm)" />
            <span style={{ color: 'var(--accent-warm)', fontWeight: 900, fontSize: '1.4rem', fontStyle: 'italic' }}>VS</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <PlayerAvatar name={battle.playerB?.name} gradient="linear-gradient(135deg, #00C49A, #7C6FF7)" />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.6rem' }}>{battle.playerB?.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Player 2</div>
            {battle.status === 'COMPLETE' && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: String(battle.winnerId) === String(battle.playerBId) ? 'var(--accent-mint)' : 'var(--text-secondary)', fontWeight: 600 }}>
                {String(battle.winnerId) === String(battle.playerBId) ? '🏆 Winner' : ''}
              </div>
            )}
            {subB && <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--accent-mint)' }}>✓ Submitted</div>}
          </div>
        </div>
      </div>

      {/* Challenge Details */}
      <div className="terminal-window" style={{ marginBottom: '1.5rem' }}>
        <div className="terminal-header">
          <div className="terminal-dot" style={{ background: '#FF5F56' }} />
          <div className="terminal-dot" style={{ background: '#FFBD2E' }} />
          <div className="terminal-dot" style={{ background: '#27C93F' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>challenge.md</span>
        </div>
        <div className="terminal-body">
          <div style={{ color: 'var(--accent-lavender)', marginBottom: '0.5rem', fontWeight: 700 }}># {battle.challenge?.title}</div>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{battle.challenge?.prompt}</div>
        </div>
      </div>

      {/* Upload Area — only for participants who haven't submitted */}
      {isParticipant && battle.status === 'ACTIVE' && !hasSubmitted && !uploadSuccess && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card"
          style={{ textAlign: 'center', borderColor: 'rgba(124,111,247,0.4)', padding: '2.5rem', marginBottom: '1.5rem' }}>
          <input type="file" accept=".zip" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
          <UploadCloud size={36} style={{ color: 'var(--accent-lavender)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Submit Your Solution</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Upload a .zip of your project. Gemini AI will analyze and score it immediately.
          </p>
          {uploadError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <AlertTriangle size={14} /> {uploadError}
            </div>
          )}
          <button id="battle-upload-btn" className="btn-primary" onClick={() => fileInputRef.current.click()} disabled={uploading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 2rem', fontSize: '1rem' }}>
            {uploading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Uploading & Analyzing...</> : <><UploadCloud size={16} /> Upload .ZIP Solution</>}
          </button>
        </motion.div>
      )}

      {/* Submitted state */}
      {(hasSubmitted || uploadSuccess) && battle.status !== 'JUDGING' && battle.status !== 'COMPLETE' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card"
          style={{ textAlign: 'center', borderColor: 'rgba(0,196,154,0.4)', padding: '2rem', marginBottom: '1.5rem' }}>
          <CheckCircle size={40} style={{ color: 'var(--accent-mint)', margin: '0 auto 0.75rem' }} />
          <h3 style={{ marginBottom: '0.4rem' }}>Submission Received!</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Waiting for your opponent to submit their solution...</p>
        </motion.div>
      )}

      {/* Results (JUDGING or COMPLETE) */}
      {(battle.status === 'JUDGING' || battle.status === 'COMPLETE') && battle.submissions?.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.25rem', textAlign: 'center' }}>
            {battle.status === 'COMPLETE' ? '🏆 Battle Results' : '⏳ Judging in Progress'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {[
              { sub: subA, player: battle.playerA, playerId: battle.playerAId, gradient: 'linear-gradient(135deg, #7C6FF7, #FF6B35)' },
              { sub: subB, player: battle.playerB, playerId: battle.playerBId, gradient: 'linear-gradient(135deg, #00C49A, #7C6FF7)' },
            ].map(({ sub, player, playerId, gradient }) => (
              <div key={playerId} className="card" style={{ borderColor: battle.winnerId && String(battle.winnerId) === String(playerId) ? 'rgba(0,196,154,0.5)' : 'var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <PlayerAvatar name={player?.name} gradient={gradient} size={40} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{player?.name}</div>
                    {battle.winnerId && String(battle.winnerId) === String(playerId) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-mint)', fontWeight: 600 }}>🏆 Winner</div>
                    )}
                  </div>
                </div>
                {sub ? (
                  <>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <ScoreCircle score={sub.aiScore} size={90} />
                      <div style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>AI Score</div>
                    </div>
                    {sub.project?.aiFeedback && (
                      <div className="terminal-window">
                        <div className="terminal-header">
                          <div className="terminal-dot" style={{ background: '#FF5F56' }} />
                          <div className="terminal-dot" style={{ background: '#FFBD2E' }} />
                          <div className="terminal-dot" style={{ background: '#27C93F' }} />
                        </div>
                        <div className="terminal-body" style={{ maxHeight: '240px', overflowY: 'auto', fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>
                          {sub.project.aiFeedback}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <Clock size={24} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                    <p>No submission yet</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

export default BattleDetailPage;
