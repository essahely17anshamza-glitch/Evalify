import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { projectService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft, Star, MessageSquare, FolderGit, ExternalLink,
  Code, ShieldCheck, Zap, TrendingUp, AlertTriangle, CheckCircle,
  Pencil, Trash2
} from 'lucide-react';

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

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({ title: '', description: '', language: '', githubUrl: '', liveUrl: '' });

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
      .catch(() => { setError('Project not found.'); setLoading(false); });
  }, [id]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const updated = await projectService.updateProject(id, editData);
      setProject(updated);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('Unable to update project.');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

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

  const ai = project.aiAnalysisJson || {};
  const scores = ai.scores || {};

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {isEditing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg)', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', position: 'relative' }}>
            <button type="button" onClick={() => setIsEditing(false)} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            <h2 style={{ marginBottom: '1rem' }}>Edit Project</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Title
                <input type="text" value={editData.title} onChange={e => handleFieldChange('title', e.target.value)} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
              </label>
              <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Description
                <textarea value={editData.description} onChange={e => handleFieldChange('description', e.target.value)} rows={4} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
              </label>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Language
                  <input type="text" value={editData.language} onChange={e => handleFieldChange('language', e.target.value)} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
                </label>
                <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  GitHub URL
                  <input type="text" value={editData.githubUrl} onChange={e => handleFieldChange('githubUrl', e.target.value)} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
                </label>
              </div>
              <label style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Live Demo URL
                <input type="text" value={editData.liveUrl} onChange={e => handleFieldChange('liveUrl', e.target.value)} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)' }} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '0.8rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                <button type="button" onClick={handleUpdate} disabled={saving} style={{ padding: '0.8rem 1.25rem', borderRadius: '0.75rem', border: 'none', background: 'var(--accent-lavender)', color: 'white', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <Link to="/community" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Back to Community
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
              <span><MessageSquare size={13} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />{project._count?.comments || 0} comments</span>
              <span><Star size={13} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />{project._count?.ratings || 0} ratings</span>
              <span>{new Date(project.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
          {/* Score Ring */}
          <div style={{ textAlign: 'center' }}>
            <ScoreRing score={project.aiScore} size={90} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>AI Score</div>
          </div>
        </div>
        {/* Links */}
        {(project.githubUrl || project.liveUrl) && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.4rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}><FolderGit size={14} /> GitHub</a>}
            {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.4rem 0.9rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}><ExternalLink size={14} /> Live Demo</a>}
          </div>
        )}

        {currentUser?.id === project.user?.id && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Delete this project? This action cannot be undone.')) return;
                try {
                  await projectService.deleteProject(id);
                  navigate('/community');
                } catch (err) {
                  setError('Unable to delete project.');
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', background: 'rgba(236, 72, 86, 0.08)', color: 'var(--danger)', cursor: 'pointer' }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* AI Feedback */}
        <div>
          <div className="terminal-window" style={{ marginBottom: '1.5rem' }}>
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: '#FF5F56' }} />
              <div className="terminal-dot" style={{ background: '#FFBD2E' }} />
              <div className="terminal-dot" style={{ background: '#27C93F' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>gemini-review.md</span>
            </div>
            <div className="terminal-body" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-secondary)', maxHeight: '480px', overflowY: 'auto' }}>
              {project.aiFeedback || 'No AI feedback available for this project.'}
            </div>
          </div>

          {/* Comments */}
          {project.comments?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={16} /> Comments ({project.comments.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {project.comments.map(comment => (
                  <div key={comment.id} style={{ padding: '0.9rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent-lavender)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(124,111,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>{comment.user?.name?.[0]?.toUpperCase()}</div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{comment.user?.name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Scores */}
        <div className="card" style={{ position: 'sticky', top: '1rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: 600 }}>Category Scores</h3>
          <CategoryBar label="Code Quality" score={scores.codeQuality} icon={<Code size={13} />} />
          <CategoryBar label="Security" score={scores.security} icon={<ShieldCheck size={13} />} />
          <CategoryBar label="Performance" score={scores.performance} icon={<Zap size={13} />} />
          <CategoryBar label="Scalability" score={scores.scalability} icon={<TrendingUp size={13} />} />

          {ai.strengths?.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent-mint)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle size={13} /> Strengths</h4>
              <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {ai.strengths.map((s, i) => <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s}</li>)}
              </ul>
            </div>
          )}

          {ai.improvements?.length > 0 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertTriangle size={13} /> Improvements</h4>
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
