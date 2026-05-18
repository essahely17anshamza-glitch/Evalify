import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { projectService, adminService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft, Star, MessageSquare, FolderGit, ExternalLink, Download,
  Code, ShieldCheck, Zap, TrendingUp, AlertTriangle, CheckCircle,
  Pencil, Trash2, Bot, X, Heart, Flag, ChevronDown, ChevronRight
} from 'lucide-react';
import ProjectPreview from '../components/ProjectPreview';
import AnalyzeButton from '../components/AnalyzeButton';
import { useLanguage } from '../context/LanguageContext';

const ScoreRing = ({ score, size = 80 }) => {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const pct = (score || 0) / 100;
  const color = score >= 80 ? 'var(--accent-mint)' : score >= 60 ? 'var(--warning)' : 'var(--danger)';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-color)" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fill: color, fontSize: size * 0.22 + 'px', fontWeight: 700, fontFamily: 'var(--font-mono)', transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}>
        {score ?? '—'}
      </text>
    </svg>
  );
};

const CategoryBar = ({ label, score, icon }) => {
  const color = score >= 80 ? 'var(--accent-mint)' : score >= 60 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>{icon} {label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>{score ?? '—'}/100</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '999px', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${score || 0}%` }} transition={{ duration: 0.8, delay: 0.2 }}
          style={{ height: '100%', background: color, borderRadius: '999px' }} />
      </div>
    </div>
  );
};

const StarRating = ({ initialRating = 0, onRate, disabled = false }) => {
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(initialRating);

  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => {
            setRating(star);
            onRate(star);
          }}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: disabled ? 'default' : 'pointer',
            color: (hover || rating) >= star ? 'var(--accent-warm)' : 'var(--border-color)',
            transition: 'color 0.2s ease',
          }}
        >
          <Star size={20} fill={(hover || rating) >= star ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t, lang } = useLanguage();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({ title: '', description: '', language: '', githubUrl: '', liveUrl: '' });
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [commentError, setCommentError] = useState(null);
  const [comments, setComments] = useState([]);
  const [replyTo, setReplyTo] = useState(null); // comment ID being replied to
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({}); // track which comments show replies
  const [reporting, setReporting] = useState(null); // comment ID being reported
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const editFieldStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
  };

  useEffect(() => {
    projectService.getProject(id)
      .then(project => {
        setProject(project);
        setEditData({
          title: project.title || '',
          description: project.description || '',
          language: project.language || '',
          githubUrl: project.githubUrl || '',
          liveUrl: project.liveUrl || ''
        });
        setLoading(false);
      })
      .catch(() => { setError(t('projectNotFound')); setLoading(false); });
  }, [id, t]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const updated = await projectService.updateProject(id, editData);
      setProject(updated);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(t('unableUpdateProject'));
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleRate = async (score) => {
    if (!currentUser) return;
    try {
      await projectService.rateProject(id, score);
      // Refresh project data to get updated stats
      const updatedProject = await projectService.getProject(id);
      setProject(updatedProject);
    } catch (err) {
      console.error('Failed to rate:', err);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;
    setSubmittingComment(true);
    setCommentError(null);

    try {
      await projectService.addComment(id, commentText);
      setCommentText('');
      // Reload comments
      loadComments();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || t('failedAddComment');
      setCommentError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const loadComments = async () => {
    try {
      const res = await projectService.getComments(id, { onlyTopLevel: true });
      setComments(res.data?.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleReply = async (commentId) => {
    if (!replyText.trim() || !currentUser) return;
    setSubmittingReply(true);
    try {
      await projectService.addComment(id, replyText, commentId);
      setReplyText('');
      setReplyTo(null);
      // Show replies for this comment
      setExpandedReplies(prev => ({ ...prev, [commentId]: true }));
      loadComments();
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleLike = async (comment) => {
    try {
      if (comment.likedByCurrentUser) {
        await projectService.unmarkCommentHelpful(comment.id);
      } else {
        await projectService.markCommentHelpful(comment.id);
      }
      loadComments();
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await projectService.reportComment(reporting, reportReason);
      setReporting(null);
      setReportReason('');
    } catch (err) {
      console.error('Failed to report:', err);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteComment = async (commentId, isOwnComment) => {
    if (!window.confirm(t('deleteCommentConfirm'))) return;
    try {
      if (!isOwnComment && currentUser?.role === 'ADMIN') {
        await adminService.deleteComment(commentId);
      } else {
        await projectService.deleteComment(commentId);
      }
      loadComments();
    } catch (err) {
      alert(t('failedDeleteComment'));
    }
  };

  // Load comments when project loads
  useEffect(() => {
    if (project) {
      loadComments();
    }
  }, [project?.id]);

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

  const ai = project.aiAnalysisJson || {};
  const scores = ai.scores || {};

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--overlay-bg)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', boxShadow: 'var(--shadow-modal)', position: 'relative' }}>
            <button type="button" onClick={() => setIsEditing(false)} style={{ position: 'absolute', right: '1rem', top: '1rem', width: '2rem', height: '2rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '50%', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
            <h2 style={{ marginBottom: '1rem' }}>{t('editProject')}</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t('title')}
                <input type="text" value={editData.title} onChange={e => handleFieldChange('title', e.target.value)} style={editFieldStyle} />
              </label>
              <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t('description')}
                <textarea value={editData.description} onChange={e => handleFieldChange('description', e.target.value)} rows={4} style={editFieldStyle} />
              </label>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {t('language')}
                  <input type="text" value={editData.language} onChange={e => handleFieldChange('language', e.target.value)} style={editFieldStyle} />
                </label>
                <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {t('githubUrl')}
                  <input type="text" value={editData.githubUrl} onChange={e => handleFieldChange('githubUrl', e.target.value)} style={editFieldStyle} />
                </label>
              </div>
              <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t('liveDemoUrl')}
                <input type="text" value={editData.liveUrl} onChange={e => handleFieldChange('liveUrl', e.target.value)} style={editFieldStyle} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>{t('cancel')}</button>
                <button type="button" onClick={handleUpdate} disabled={saving} style={{ padding: '0.8rem 1.25rem', borderRadius: '0.75rem', border: 'none', background: 'var(--accent-lavender)', color: 'white', cursor: 'pointer' }}>{saving ? t('saving') : t('saveChanges')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <Link to="/community" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> {t('backToCommunity')}
      </Link>

      {/* Header Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {project.language && <span style={{ background: 'rgba(124,111,247,0.15)', color: 'var(--accent-lavender)', borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.78rem', fontWeight: 600 }}>{project.language}</span>}
              {(project.tags || []).map(tag => (
                <span key={tag} style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', borderRadius: '999px', padding: '0.2rem 0.65rem', fontSize: '0.75rem' }}>#{tag}</span>
              ))}
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>{project.title}</h1>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{project.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <Link to={`/profile/${project.user?.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-lavender)' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(124,111,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                  {project.user?.name?.[0]?.toUpperCase()}
                </div>
                {project.user?.name}
              </Link>
              <span><MessageSquare size={13} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />{project._count?.comments || 0} {t('comments')}</span>
              <span><Star size={13} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />{project._count?.ratings || 0} {t('ratings')}</span>
              <span>{new Date(project.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              {project.repoStars !== undefined && project.repoStars !== null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--accent-warm)' }}><Star size={13} fill="currentColor" /> {project.repoStars} {t('githubStars')}</span>
              )}
            </div>
          </div>
          {/* Score Ring */}
          <div style={{ textAlign: 'center' }}>
            <ScoreRing score={project.aiScore} size={90} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{t('aiScore')}</div>
          </div>
        </div>
        {/* Links */}
        {(project.githubUrl || project.liveUrl || project.zipPath) && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.4rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}><FolderGit size={14} /> GitHub</a>}
            {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.4rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}><ExternalLink size={14} /> {t('liveDemo')}</a>}
            {project.zipPath && (
              <a href={`http://localhost:5000/api/projects/${project.id}/download`} download style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', background: 'var(--bg-hover)', fontSize: '0.85rem', padding: '0.4rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}>
                <Download size={14} /> {t('downloadSourceCode')}
              </a>
            )}
          </div>
        )}

        {(currentUser?.id === project.user?.id || currentUser?.role === 'ADMIN') && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            {currentUser?.id === project.user?.id && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <Pencil size={14} /> {t('edit')}
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(t('deleteProjectConfirm'))) return;
                try {
                  if (currentUser?.role === 'ADMIN' && currentUser?.id !== project.user?.id) {
                    await adminService.deleteProject(id);
                  } else {
                    await projectService.deleteProject(id);
                  }
                  navigate('/community');
                } catch (err) {
                  setError(t('unableDeleteProject'));
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'rgba(236, 72, 86, 0.08)', color: 'var(--danger)', cursor: 'pointer' }}>
              <Trash2 size={14} /> {t('delete')}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main Content (Preview + Feedback + Comments) */}
        <div>
          {/* Project Preview Sandbox */}
          <ProjectPreview project={project} onUpdate={setProject} />

          {/* AI Feedback Block */}
          {!project.aiFeedback ? (
            <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2.5rem' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Bot size={28} style={{ color: 'var(--accent-lavender)' }} />
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>{t('noAiAnalysisTitle')}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {t('noAiAnalysisText')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <AnalyzeButton
                  projectId={project.id}
                  hasExistingAnalysis={false}
                  onAnalysisComplete={(updated) => setProject(prev => ({ ...prev, ...updated }))}
                />
              </div>
            </div>
          ) : (
            <div className="terminal-window" style={{ marginBottom: '1.5rem' }}>
              <div className="terminal-header">
                <div className="terminal-dot" style={{ background: '#FF5F56' }} />
                <div className="terminal-dot" style={{ background: '#FFBD2E' }} />
                <div className="terminal-dot" style={{ background: '#27C93F' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>gemini-review.md</span>
                <div style={{ marginLeft: 'auto' }}>
                  <AnalyzeButton
                    projectId={project.id}
                    hasExistingAnalysis={true}
                    onAnalysisComplete={(updated) => setProject(prev => ({ ...prev, ...updated }))}
                  />
                </div>
              </div>
              <div className="terminal-body" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-secondary)', maxHeight: '480px', overflowY: 'auto' }}>
                {typeof project.aiFeedback === 'object' ? JSON.stringify(project.aiFeedback) : project.aiFeedback}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MessageSquare size={18} /> {t('discussions')} ({comments.length})
            </h3>

            {currentUser && currentUser.role !== 'ADMIN' ? (
              <>
                {commentError && (
                  <div
                    style={{
                      marginBottom: '1rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: 'var(--danger)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {commentError}
                  </div>
                )}
                <form onSubmit={handleSubmitComment} style={{ marginBottom: '2rem' }}>
                  <textarea
                    placeholder={t('shareThoughts')}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-hover)',
                      color: 'var(--text-primary)',
                      minHeight: '100px',
                      marginBottom: '0.75rem',
                      resize: 'vertical',
                      fontSize: '0.9rem',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submittingComment || !commentText.trim()}
                      style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}
                    >
                      {submittingComment ? t('posting') : t('postComment')}
                    </button>
                  </div>
                </form>
              </>
            ) : currentUser && currentUser.role === 'ADMIN' ? (
              <div
                style={{
                  padding: '1.5rem',
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  marginBottom: '2rem',
                  fontSize: '0.9rem',
                  color: 'var(--danger)',
                }}
              >
                {t('adminCannotComment')}
              </div>
            ) : (
              <div
                style={{
                  padding: '1.5rem',
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  marginBottom: '2rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                }}
              >
                {t('signInDiscussion')}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id}>
                    {/* Main Comment */}
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-lavender)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
                        {comment.user?.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{comment.user?.name}</span>
                          {comment.user?.role === "TEACHER" && (
                            <span style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700", borderRadius: "4px", padding: "0.1rem 0.35rem", fontSize: "0.65rem", fontWeight: 600, border: "1px solid rgba(255,215,0,0.3)" }}>
                              {t("teacherLabel")}
                            </span>
                          )}
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                            {new Date(comment.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}
                          </span>
                        </div>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "0.5rem" }}>{comment.content}</p>

                        {/* Action buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          {currentUser && currentUser.role !== "ADMIN" && (
                            <button onClick={() => handleToggleLike(comment)}
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", color: comment.likedByCurrentUser ? "var(--danger)" : "var(--text-secondary)", fontSize: "0.8rem", padding: "0.15rem 0" }}>
                              <Heart size={14} fill={comment.likedByCurrentUser ? "currentColor" : "none"} />
                              {comment._count?.helpfulVotes || 0}
                            </button>
                          )}
                          {currentUser && currentUser.role !== "ADMIN" && (
                            <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.8rem", padding: "0.15rem 0" }}>
                              {t("reply")}
                            </button>
                          )}
                          {currentUser && currentUser.role !== "ADMIN" && currentUser.id !== comment.userId && (
                            <button onClick={() => { setReporting(comment.id); setReportReason(""); }}
                              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", color: comment.isReported ? "var(--warning)" : "var(--text-secondary)", fontSize: "0.8rem", padding: "0.15rem 0" }}>
                              <Flag size={12} fill={comment.isReported ? "currentColor" : "none"} />
                              {comment.isReported ? t("reported") : t("report")}
                            </button>
                          )}
                          {(currentUser?.id === comment.userId || currentUser?.role === "ADMIN") && (
                            <button onClick={() => handleDeleteComment(comment.id, currentUser?.id === comment.userId)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "0.15rem 0" }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Reply form */}
                        {replyTo === comment.id && (
                          <div style={{ marginTop: "0.75rem" }}>
                            <textarea placeholder={t("shareThoughts")} value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              style={{ width: "100%", padding: "0.7rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", background: "var(--bg-hover)", color: "var(--text-primary)", minHeight: "70px", marginBottom: "0.5rem", resize: "vertical", fontSize: "0.85rem" }}
                            />
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                              <button onClick={() => { setReplyTo(null); setReplyText(""); }}
                                style={{ padding: "0.4rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.8rem" }}>
                                {t("cancel")}
                              </button>
                              <button onClick={() => handleReply(comment.id)} disabled={submittingReply || !replyText.trim()}
                                className="btn-primary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
                                {submittingReply ? t("replying") : t("postReply")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies?.length > 0 && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <button onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", color: "var(--accent-lavender)", fontSize: "0.8rem", padding: "0.2rem 0.5rem", marginLeft: "3rem" }}>
                          {expandedReplies[comment.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {expandedReplies[comment.id]
                            ? t("hideReplies")
                            : t("showReplies").replace("{count}", comment._count?.replies || comment.replies.length)
                          }
                        </button>
                        {expandedReplies[comment.id] && (
                          <div style={{ marginLeft: "3rem", marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem", paddingLeft: "1rem", borderLeft: "2px solid var(--border-color)" }}>
                            {comment.replies.map(reply => (
                              <div key={reply.id} style={{ display: "flex", gap: "0.75rem" }}>
                                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--accent-mint)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                                  {reply.user?.name?.[0]?.toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{reply.user?.name}</span>
                                    {reply.user?.role === "TEACHER" && (
                                      <span style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700", borderRadius: "4px", padding: "0.1rem 0.3rem", fontSize: "0.6rem", fontWeight: 600 }}>
                                        {t("teacherLabel")}
                                      </span>
                                    )}
                                    <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>
                                      {new Date(reply.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}
                                    </span>
                                  </div>
                                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "0.35rem" }}>{reply.content}</p>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    {currentUser && currentUser.role !== "ADMIN" && (
                                      <button onClick={() => handleToggleLike(reply)}
                                        style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "none", border: "none", cursor: "pointer", color: reply.likedByCurrentUser ? "var(--danger)" : "var(--text-secondary)", fontSize: "0.75rem", padding: "0.1rem 0" }}>
                                        <Heart size={12} fill={reply.likedByCurrentUser ? "currentColor" : "none"} />
                                        {reply._count?.helpfulVotes || 0}
                                      </button>
                                    )}
                                    {currentUser && currentUser.role !== "ADMIN" && currentUser.id !== reply.userId && (
                                      <button onClick={() => { setReporting(reply.id); setReportReason(""); }}
                                        style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "none", border: "none", cursor: "pointer", color: reply.isReported ? "var(--warning)" : "var(--text-secondary)", fontSize: "0.75rem", padding: "0.1rem 0" }}>
                                        <Flag size={10} fill={reply.isReported ? "currentColor" : "none"} />
                                        {reply.isReported ? t("reported") : t("report")}
                                      </button>
                                    )}
                                    {(currentUser?.id === reply.userId || currentUser?.role === "ADMIN") && (
                                      <button onClick={() => handleDeleteComment(reply.id, currentUser?.id === reply.userId)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "0.1rem 0" }}>
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {t("noCommentsYet")}
                </div>
              )}
            </div>
          </div>

          {/* Report Modal */}
          {reporting && (
            <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "var(--overlay-bg)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
              <div style={{ width: "100%", maxWidth: "440px", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-xl)", padding: "1.5rem", boxShadow: "var(--shadow-modal)" }}>
                <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Flag size={16} color="var(--warning)" /> {t("reportCommentTitle")}
                </h3>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {t("reportReason")}
                </label>
                <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)}
                  placeholder={t("reportReasonPlaceholder")}
                  style={{ width: "100%", padding: "0.8rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", background: "var(--bg-hover)", color: "var(--text-primary)", minHeight: "90px", marginBottom: "1rem", resize: "vertical", fontSize: "0.85rem" }}
                />
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button onClick={() => { setReporting(null); setReportReason(""); }}
                    style={{ padding: "0.6rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
                    {t("cancel")}
                  </button>
                  <button onClick={handleReport} disabled={submittingReport || !reportReason.trim()}
                    style={{ padding: "0.6rem 1.25rem", borderRadius: "var(--radius-md)", border: "none", background: "var(--danger)", color: "white", cursor: "pointer", fontSize: "0.85rem" }}>
                    {submittingReport ? t("posting") : t("submitReport")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Scores */}
        <div className="card" style={{ position: 'sticky', top: '1rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>{t('categoryScores')}</h3>
          <CategoryBar label={t('codeQuality')} score={scores.codeQuality} icon={<Code size={13} />} />
          <CategoryBar label={t('security')} score={scores.security} icon={<ShieldCheck size={13} />} />
          <CategoryBar label={t('performance')} score={scores.performance} icon={<Zap size={13} />} />
          <CategoryBar label={t('scalability')} score={scores.scalability} icon={<TrendingUp size={13} />} />

          {/* User Rating Section */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={14} /> {t('rateProject')}
            </h4>
            {currentUser && currentUser.role !== 'ADMIN' ? (
              currentUser.id === project.userId ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t('cannotRateOwnProject')}</p>
              ) : (
                <StarRating 
                  initialRating={project.ratings?.find(r => r.userId === currentUser.id)?.score || 0} 
                  onRate={handleRate} 
                />
              )
            ) : currentUser && currentUser.role === 'ADMIN' ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{t('adminCannotRate')}</p>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('signInToRate')}</p>
            )}
          </div>

          {ai.strengths?.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-mint)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle size={13} /> {t('strengths')}</h4>
              <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {ai.strengths.map((s, i) => <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s}</li>)}
              </ul>
            </div>
          )}

          {ai.improvements?.length > 0 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertTriangle size={13} /> {t('improvements')}</h4>
              <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {ai.improvements.map((s, i) => <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
