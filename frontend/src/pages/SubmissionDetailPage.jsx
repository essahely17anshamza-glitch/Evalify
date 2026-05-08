import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { classService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, CheckCircle, Clock, AlertTriangle, 
  MessageSquare, Star, Loader, ShieldCheck, Zap, 
  TrendingUp, Code, Save, User
} from 'lucide-react';

const SubmissionDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState({ teacherScore: '', teacherComment: '' });
  const [error, setError] = useState('');

  const fetchSubmission = async () => {
    try {
      const res = await classService.getSubmissionDetails(id);
      setSubmission(res.data);
      setGrade({ 
        teacherScore: res.data.teacherScore ?? '', 
        teacherComment: res.data.teacherComment ?? '' 
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    setGrading(true);
    setError('');
    try {
      await classService.gradeSubmission(id, {
        teacherScore: parseFloat(grade.teacherScore),
        teacherComment: grade.teacherComment
      });
      await fetchSubmission();
      alert("Grade saved successfully!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save grade.");
    } finally {
      setGrading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '0.75rem', color: 'var(--text-secondary)' }}>
      <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading submission...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!submission) return (
    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
      <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
      <h2>Submission Not Found</h2>
      <Link to="/classroom" style={{ color: 'var(--accent-lavender)', marginTop: '1rem', display: 'inline-block' }}>← Back to Classroom</Link>
    </div>
  );

  const isTeacher = user?.id === submission.assignment?.class?.teacherId || user?.role === 'ADMIN';
  const ai = submission.aiAnalysisJson || {};
  const scores = ai.scores || {};

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', background: 'none', border: 'none', cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Hero Header */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(124,111,247,0.1), transparent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              {submission.student?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>{submission.student?.name}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Submitted for <strong style={{ color: 'var(--text-primary)' }}>{submission.assignment?.title}</strong></p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={14} /> {new Date(submission.submittedAt).toLocaleString()}</span>
                {submission.isLate && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>● LATE SUBMISSION</span>}
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-mint)', fontFamily: 'var(--font-mono)' }}>{submission.aiScore}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AI Score</div>
              </div>
              {submission.gradedAt && (
                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-warm)', fontFamily: 'var(--font-mono)' }}>{submission.teacherScore}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Teacher Grade</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Left: AI Feedback & Code Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: '#FF5F56' }} />
              <div className="terminal-dot" style={{ background: '#FFBD2E' }} />
              <div className="terminal-dot" style={{ background: '#27C93F' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>gemini-review.md</span>
            </div>
            <div className="terminal-body" style={{ maxHeight: '500px', overflowY: 'auto', whiteSpace: 'pre-wrap', color: '#C9D1D9', lineHeight: 1.6 }}>
              {submission.aiFeedback || 'AI Analysis pending...'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="card">
              <h4 style={{ color: 'var(--accent-mint)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={16} /> Strengths</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.25rem' }}>
                {ai.strengths?.map((s, i) => <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s}</li>)}
                {!ai.strengths?.length && <li style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', listStyle: 'none', marginLeft: '-1.25rem' }}>No specific strengths noted.</li>}
              </ul>
            </div>
            <div className="card">
              <h4 style={{ color: 'var(--danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16} /> Improvements</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.25rem' }}>
                {ai.improvements?.map((s, i) => <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s}</li>)}
                {!ai.improvements?.length && <li style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', listStyle: 'none', marginLeft: '-1.25rem' }}>No major improvements suggested.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Teacher Grading / Info Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '1.5rem' }}>
          {isTeacher ? (
            <div className="card" style={{ borderColor: submission.gradedAt ? 'var(--border-color)' : 'var(--accent-warm)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={18} color="var(--accent-warm)" /> Grading Dashboard
              </h3>
              <form onSubmit={handleGradeSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Teacher Score / {submission.assignment?.maxScore}</label>
                  <input 
                    type="number" className="input-field" step="0.1"
                    value={grade.teacherScore} onChange={e => setGrade({...grade, teacherScore: e.target.value})}
                    placeholder="Enter final grade..." required
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Feedback for Student</label>
                  <textarea 
                    className="input-field" rows={5}
                    value={grade.teacherComment} onChange={e => setGrade({...grade, teacherComment: e.target.value})}
                    placeholder="Write your comments and suggestions here..."
                  />
                </div>
                <button type="submit" className="btn-primary full-width" disabled={grading} style={{ background: 'var(--accent-warm)' }}>
                  {grading ? <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Publish Grade'}
                </button>
              </form>
            </div>
          ) : (
            submission.gradedAt && (
              <div className="card" style={{ borderColor: 'var(--accent-warm)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={18} color="var(--accent-warm)" /> Teacher Feedback
                </h3>
                <div style={{ background: 'rgba(255,107,53,0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,107,53,0.1)', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-warm)', marginBottom: '0.5rem' }}>{submission.teacherScore} / {submission.assignment?.maxScore}</div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{submission.teacherComment || 'No comment provided.'}"
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <User size={14} /> Graded by {submission.assignment?.class?.teacher?.name} on {new Date(submission.gradedAt).toLocaleDateString()}
                </div>
              </div>
            )
          )}

          <div className="card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Metrics Analysis</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Code Quality', score: scores.codeQuality, icon: <Code size={14} /> },
                { label: 'Security', score: scores.security, icon: <ShieldCheck size={14} /> },
                { label: 'Performance', score: scores.performance, icon: <Zap size={14} /> },
                { label: 'Scalability', score: scores.scalability, icon: <TrendingUp size={14} /> },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>{m.icon} {m.label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.score}/100</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--bg-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-lavender)', width: `${m.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

export default SubmissionDetailPage;
