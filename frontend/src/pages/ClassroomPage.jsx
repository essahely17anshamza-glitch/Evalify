import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { classService } from '../services/api';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BookOpen, Plus, Search, Shield, ArrowRight, X, Loader, Book } from 'lucide-react';

const ClassroomPage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [newClass, setNewClass] = useState({ name: '', description: '' });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('join'); // 'join' or 'create'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClasses = async () => {
    try {
      const res = await classService.getClasses();
      setClasses(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchClasses();
  }, [user]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await classService.joinClass(inviteCode);
      setInviteCode('');
      setShowModal(false);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await classService.createClass(newClass);
      setNewClass({ name: '', description: '' });
      setShowModal(false);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
    setError('');
  };

  if (!user) return (
    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
      <Shield size={48} color="var(--accent-lavender)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
      <h2>Authentication Required</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Please sign in to view your classrooms.</p>
    </div>
  );

  const isTeacher = user.role === 'TEACHER' || user.role === 'ADMIN';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={32} color="var(--accent-lavender)" /> My <span className="text-gradient">Classroom</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>
            {isTeacher 
              ? 'Manage your students, publish assignments, and use Gemini AI to assist in grading.' 
              : 'Access your courses, submit assignments for AI review, and track your progress.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isTeacher ? (
            <button className="btn-primary" onClick={() => openModal('create')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Create New Class
            </button>
          ) : (
            <button className="btn-primary" onClick={() => openModal('join')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} /> Join a Class
            </button>
          )}
        </div>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem', gap: '0.75rem', color: 'var(--text-secondary)' }}>
          <Loader size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
          Loading your classes...
        </div>
      ) : classes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(21, 21, 21, 0.3)', borderStyle: 'dashed' }}>
          <Book size={48} color="var(--border-color)" style={{ marginBottom: '1.5rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No Classes Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {isTeacher 
              ? "You haven't created any classes. Start by creating one to invite students." 
              : "You haven't joined any classes yet. Get an invite code from your teacher."}
          </p>
          <button className="btn-primary" onClick={() => openModal(isTeacher ? 'create' : 'join')}>
            {isTeacher ? 'Create Your First Class' : 'Join a Class'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {classes.map((cls, i) => (
            <motion.div key={cls.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Link to={`/classroom/${cls.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--accent-lavender)' }}>
                  <div>
                    <h3 style={{ marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{cls.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {cls.description || 'Learning and building together on Evalify.'}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Users size={14} /> {cls._count?.enrollments || 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <BookOpen size={14} /> {cls._count?.assignments || 0}
                      </span>
                    </div>
                    {isTeacher ? (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--bg-hover)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--accent-warm)', fontWeight: 700 }}>
                        {cls.inviteCode}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-lavender)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        View Class <ArrowRight size={14} />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal for Create/Join */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} />
            
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '450px', borderRadius: 'var(--radius-xl)', padding: '2.5rem', zIndex: 1 }}>
              
              <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}>
                <X size={20} />
              </button>

              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {modalType === 'create' ? <><Plus size={24} color="var(--accent-mint)" /> Create Class</> : <><Users size={24} color="var(--accent-lavender)" /> Join Class</>}
              </h2>

              <form onSubmit={modalType === 'create' ? handleCreate : handleJoin}>
                {modalType === 'create' ? (
                  <>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Class Name</label>
                      <input type="text" className="input-field" placeholder="e.g. Advanced React Architecture" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} required />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Description</label>
                      <textarea className="input-field" placeholder="What will students learn in this class?" rows={3} value={newClass.description} onChange={e => setNewClass({...newClass, description: e.target.value})} />
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Invite Code</label>
                    <input type="text" className="input-field" placeholder="6-digit code (e.g. ABC123)" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} maxLength={6} required style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center' }}>Ask your teacher for the 6-digit class code.</p>
                  </div>
                )}

                {error && <div style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

                <button type="submit" className="btn-primary full-width" disabled={submitting} style={{ height: '3rem', fontSize: '1rem' }}>
                  {submitting ? <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : (modalType === 'create' ? 'Create Class' : 'Join Class')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

export default ClassroomPage;
