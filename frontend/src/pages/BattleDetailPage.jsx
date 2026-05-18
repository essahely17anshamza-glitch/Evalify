import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { arenaService, codeService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { UploadCloud, CheckCircle, ArrowLeft, Loader, Swords, Trophy, Clock, AlertTriangle, Play, FileCode } from 'lucide-react';
import CodeEditor from '../components/CodeEditor';
import JSZip from 'jszip';
import { useLanguage } from '../context/LanguageContext';

const STATUS_CONFIG = {
  PENDING:  { color: 'var(--warning)', labelKey: 'statusPending', descKey: 'statusPendingDesc' },
  ACTIVE:   { color: 'var(--accent-mint)', labelKey: 'statusActive', descKey: 'statusActiveDesc' },
  JUDGING:  { color: 'var(--accent-lavender)', labelKey: 'statusJudging', descKey: 'statusJudgingDesc' },
  COMPLETE: { color: 'var(--text-secondary)', labelKey: 'statusComplete', descKey: 'statusCompleteDesc' },
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
  const { t } = useLanguage();
  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  const [submissionMode, setSubmissionMode] = useState('editor');
  const [codeFiles, setCodeFiles] = useState([]);
  const [executionOutput, setExecutionOutput] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const getExtension = (lang) => {
    switch (lang?.toLowerCase()) {
      case 'python': return 'py';
      case 'javascript': return 'js';
      case 'typescript': return 'ts';
      case 'java': return 'java';
      case 'c++': return 'cpp';
      case 'cpp': return 'cpp';
      case 'go': return 'go';
      case 'rust': return 'rs';
      default: return 'txt';
    }
  };

  const fetchBattle = useCallback(async () => {
    try {
      const res = await arenaService.getBattle(id);
      setBattle(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchBattle(); }, [fetchBattle]);

  // Initialize codeFiles when challenge language is known
  useEffect(() => {
    if (battle?.challenge?.language && codeFiles.length === 0) {
      setCodeFiles([{ name: `main.${getExtension(battle.challenge.language)}`, content: t('writeSolutionHere') }]);
    }
  }, [battle?.challenge?.language, codeFiles.length, t]);

  useEffect(() => {
    let intervalId;
    if (battle?.status === 'ACTIVE' || battle?.status === 'JUDGING') {
      intervalId = setInterval(() => {
        fetchBattle();
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [battle?.status, fetchBattle]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) { setUploadError(t('pleaseUploadZip')); return; }
    await submitProjectFile(file);
  };

  const handleEditorSubmit = async () => {
    if (codeFiles.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      const zip = new JSZip();
      codeFiles.forEach(f => zip.file(f.name, f.content));
      const blob = await zip.generateAsync({ type: 'blob' });
      const file = new File([blob], 'submission.zip', { type: 'application/zip' });
      await submitProjectFile(file);
    } catch (err) {
      setUploadError(t('failedGenerateZip'));
      setUploading(false);
    }
  };

  const submitProjectFile = async (file) => {
    setUploading(true); setUploadError('');
    setLogoStatus?.('analyzing');
    try {
      const formData = new FormData();
      formData.append('title', `Battle: ${battle.challenge.title}`);
      formData.append('description', t('arenaBattleSubmission'));
      formData.append('language', battle.challenge.language);
      formData.append('projectFile', file);
      await arenaService.submitBattle(id, formData);
      setUploadSuccess(true);
      fetchBattle();
      setLogoStatus?.('battle');
    } catch (err) {
      setUploadError(err.response?.data?.error || t('uploadFailedRetry'));
      setLogoStatus?.('error');
    } finally { setUploading(false); }
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setExecutionOutput(null);
    try {
      const res = await codeService.executeCode({
        language: battle.challenge.language,
        files: codeFiles,
        stdin: ''
      });
      setExecutionOutput(res.run);
    } catch (err) {
      setExecutionOutput({ stderr: err.response?.data?.error || t('executionFailed'), stdout: '' });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAcceptChallenge = async () => {
    try {
      await arenaService.acceptBattle(id);
      fetchBattle();
    } catch (err) {
      console.error(err);
      // Fallback: we could set an error state here, but console error is fine for now
    }
  };

  const isParticipant = user && battle && (String(user.id) === String(battle.playerAId) || String(user.id) === String(battle.playerBId));
  const hasSubmitted = battle?.submissions?.some(s => String(s.userId) === String(user?.id));
  const statusCfg = battle ? (STATUS_CONFIG[battle.status] || STATUS_CONFIG.PENDING) : STATUS_CONFIG.PENDING;

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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '0.75rem', color: 'var(--text-secondary)' }}>
      <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('loadingBattle')}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!battle) return (
    <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
      <AlertTriangle size={40} style={{ marginBottom: '1rem', color: 'var(--danger)' }} />
      <p>{t('battleNotFound')}</p>
      <Link to="/arena" style={{ color: 'var(--accent-lavender)', marginTop: '1rem', display: 'inline-block' }}>← {t('backToArena')}</Link>
    </div>
  );

  const subA = battle.submissions?.find(s => String(s.userId) === String(battle.playerAId));
  const subB = battle.submissions?.find(s => String(s.userId) === String(battle.playerBId));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link to="/arena" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> {t('backToArena')}
      </Link>

      {/* Battle Header */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(124,111,247,0.08))', textAlign: 'center', padding: '2rem' }}>
        {/* Status badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', background: `${statusCfg.color}15`, border: `1px solid ${statusCfg.color}40`, borderRadius: '999px', padding: '0.3rem 0.9rem', fontSize: '0.8rem' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusCfg.color, boxShadow: battle.status === 'ACTIVE' ? `0 0 8px ${statusCfg.color}` : 'none' }} />
          <span style={{ color: statusCfg.color, fontWeight: 600 }}>{t(statusCfg.labelKey)}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>- {t(statusCfg.descKey)}</span>
        </div>

        {/* VS layout */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <PlayerAvatar name={battle.playerA?.name} gradient="linear-gradient(135deg, #7C6FF7, #FF6B35)" />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.6rem' }}>{battle.playerA?.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('player1')}</div>
            {battle.status === 'COMPLETE' && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: String(battle.winnerId) === String(battle.playerAId) ? 'var(--accent-mint)' : 'var(--text-secondary)', fontWeight: 600 }}>
                {String(battle.winnerId) === String(battle.playerAId) ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Trophy size={12} /> {t('winner')}</span> : ''}
              </div>
            )}
            {subA && <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--accent-mint)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={11} /> {t('submitted')}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <Swords size={28} color="var(--accent-warm)" />
            <span style={{ color: 'var(--accent-warm)', fontWeight: 900, fontSize: '1.4rem', fontStyle: 'italic' }}>VS</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <PlayerAvatar name={battle.playerB?.name} gradient="linear-gradient(135deg, #00C49A, #7C6FF7)" />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.6rem' }}>{battle.playerB?.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('player2')}</div>
            {battle.status === 'COMPLETE' && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: String(battle.winnerId) === String(battle.playerBId) ? 'var(--accent-mint)' : 'var(--text-secondary)', fontWeight: 600 }}>
                {String(battle.winnerId) === String(battle.playerBId) ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Trophy size={12} /> {t('winner')}</span> : ''}
              </div>
            )}
            {subB && <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--accent-mint)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={11} /> {t('submitted')}</div>}
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

      {/* Pending state */}
      {battle.status === 'PENDING' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ textAlign: 'center', padding: '3rem', marginBottom: '1.5rem' }}>
          <Trophy size={48} style={{ color: 'var(--warning)', margin: '0 auto 1rem', opacity: 0.8 }} />
          <h2 style={{ marginBottom: '0.5rem' }}>{t('challengePending')}</h2>
          {String(user?.id) === String(battle.playerBId) ? (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {t('challengedText')}
              </p>
              <button className="btn-primary" onClick={handleAcceptChallenge} style={{ background: 'var(--accent-mint)', borderColor: 'var(--accent-mint)', color: '#111', fontWeight: 700, padding: '0.75rem 2rem' }}>
                {t('acceptChallenge')}
              </button>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>
              {t('waitingForAcceptance', { name: battle.playerB?.name })}
            </p>
          )}
        </motion.div>
      )}

      {/* Upload/Editor Area — only for participants who haven't submitted */}
      {isParticipant && battle.status === 'ACTIVE' && !hasSubmitted && !uploadSuccess && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <button className={`btn-primary ${submissionMode === 'editor' ? '' : 'btn-outline'}`} onClick={() => setSubmissionMode('editor')} style={{ padding: '0.5rem 1rem', background: submissionMode === 'editor' ? 'var(--accent-lavender)' : 'transparent', border: '1px solid var(--accent-lavender)', color: submissionMode === 'editor' ? '#fff' : 'var(--accent-lavender)' }}>
              <FileCode size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> {t('liveEditor')}
            </button>
            <button className={`btn-primary ${submissionMode === 'upload' ? '' : 'btn-outline'}`} onClick={() => setSubmissionMode('upload')} style={{ padding: '0.5rem 1rem', background: submissionMode === 'upload' ? 'var(--accent-lavender)' : 'transparent', border: '1px solid var(--accent-lavender)', color: submissionMode === 'upload' ? '#fff' : 'var(--accent-lavender)' }}>
              <UploadCloud size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> {t('uploadZip')}
            </button>
          </div>

          {submissionMode === 'upload' ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card"
              style={{ textAlign: 'center', borderColor: 'rgba(124,111,247,0.4)', padding: '2.5rem' }}>
              <input type="file" accept=".zip" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
              <UploadCloud size={36} style={{ color: 'var(--accent-lavender)', marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>{t('submitYourSolution')}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                {t('uploadZipText')}
              </p>
              {uploadError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <AlertTriangle size={14} /> {uploadError}
                </div>
              )}
              <button id="battle-upload-btn" className="btn-primary" onClick={() => fileInputRef.current.click()} disabled={uploading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 2rem', fontSize: '1rem' }}>
                {uploading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('uploadingAnalyzing')}</> : <><UploadCloud size={16} /> {t('uploadZipSolution')}</>}
              </button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ height: '500px' }}>
                <CodeEditor files={codeFiles} onChange={setCodeFiles} defaultLanguage={battle.challenge.language} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <button onClick={handleRunCode} disabled={isExecuting} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#27C93F', color: '#111', borderColor: '#27C93F', marginBottom: '0.5rem' }}>
                    {isExecuting ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={16} />}
                    {t('runCode')}
                  </button>
                  {executionOutput && (
                    <div className="terminal-window" style={{ marginTop: '0.5rem' }}>
                      <div className="terminal-header">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{t('executionOutput')}</span>
                      </div>
                      <div className="terminal-body" style={{ minHeight: '100px', maxHeight: '200px', overflowY: 'auto' }}>
                        {executionOutput.stdout && <pre style={{ color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>{executionOutput.stdout}</pre>}
                        {executionOutput.stderr && <pre style={{ color: 'var(--danger)', margin: 0, whiteSpace: 'pre-wrap' }}>{executionOutput.stderr}</pre>}
                        {executionOutput.signal && <pre style={{ color: 'var(--warning)', margin: 0 }}>{t('processSignal', { signal: executionOutput.signal })}</pre>}
                        {!executionOutput.stdout && !executionOutput.stderr && <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t('noOutput')}</span>}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {uploadError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.5rem' }}><AlertTriangle size={14} style={{ display: 'inline' }} /> {uploadError}</div>}
                  <button onClick={handleEditorSubmit} disabled={uploading} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
                    {uploading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('analyzing')}</> : <><CheckCircle size={16} /> {t('submitSolution')}</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Submitted state */}
      {(hasSubmitted || uploadSuccess) && battle.status !== 'JUDGING' && battle.status !== 'COMPLETE' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card"
          style={{ textAlign: 'center', borderColor: 'rgba(0,196,154,0.4)', padding: '2rem', marginBottom: '1.5rem' }}>
          <CheckCircle size={40} style={{ color: 'var(--accent-mint)', margin: '0 auto 0.75rem' }} />
          <h3 style={{ marginBottom: '0.4rem' }}>{t('submissionReceived')}</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{t('waitingOpponent')}</p>
        </motion.div>
      )}

      {/* Results (JUDGING or COMPLETE) */}
      {(battle.status === 'JUDGING' || battle.status === 'COMPLETE') && battle.submissions?.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.25rem', textAlign: 'center' }}>
            {battle.status === 'COMPLETE'
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Trophy size={16} /> {t('battleResults')}</span>
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={16} /> {t('judgingInProgress')}</span>
            }
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-mint)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Trophy size={12} /> {t('winner')}</div>
                    )}
                  </div>
                </div>
                {sub ? (
                  <>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <ScoreCircle score={sub.aiScore} size={90} />
                      <div style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{t('aiScore')}</div>
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
                    <p>{t('noSubmissionYet')}</p>
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
