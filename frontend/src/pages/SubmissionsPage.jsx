import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { classService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  ArrowLeft, Users, FileText, CheckCircle, Clock, 
  ChevronRight, Loader, AlertTriangle, Search
} from 'lucide-react';

const SubmissionsPage = () => {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const [submissions, setSubmissions] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        classService.getAssignmentDetails(id),
        classService.getSubmissionsForAssignment(id)
      ]);
      setAssignment(aRes.data);
      setSubmissions(sRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSubmissions = submissions.filter(s => 
    s.student?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '0.75rem', color: 'var(--text-secondary)' }}>
      <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('loadingSubmissions')}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!assignment) return (
    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
      <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
      <h2>{t('assignmentNotFound')}</h2>
      <Link to="/classroom" style={{ color: 'var(--accent-lavender)', marginTop: '1rem', display: 'inline-block' }}>← {t('back')}</Link>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link to={`/classroom/${assignment.classId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> {t('backToClass')}
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {t('submissionsTitle')} <span className="text-gradient">{assignment.title}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {submissions.length} {t('studentsSubmitted')}
        </p>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" className="input-field" placeholder={t('searchByStudent')} 
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>
      </div>

      {/* Submissions List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 100px', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
          <span>{t('student')}</span>
          <span>{t('submittedAt')}</span>
          <span>{t('aiScore')}</span>
          <span style={{ textAlign: 'right' }}>{t('actions')}</span>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FileText size={40} style={{ marginBottom: '1rem', opacity: 0.2, margin: '0 auto' }} />
            <p>{t('noMatchingSubmissions')}</p>
          </div>
        ) : (
          filteredSubmissions.map((sub, i) => (
            <motion.div 
              key={sub.id} 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 100px', padding: '1.25rem 1.5rem', borderBottom: i === filteredSubmissions.length - 1 ? 'none' : '1px solid var(--border-color)', alignItems: 'center', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                  {sub.student?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{sub.student?.name}</div>
                  {sub.isLate && <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>● {t('late')}</span>}
                </div>
              </div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={14} /> {new Date(sub.submittedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')}
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>{new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--accent-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-mint)', fontSize: '0.8rem', background: 'rgba(0,196,154,0.1)' }}>
                    {sub.aiScore}
                  </div>
                  {sub.gradedAt ? (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-warm)', fontWeight: 700 }}>{t('graded')}</span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('pending')}</span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Link to={`/submissions/${sub.id}`} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  {t('review')} <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default SubmissionsPage;
