import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { classService, arenaService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, Users, BookOpen, Clock, ChevronRight, X, 
  Loader, UploadCloud, CheckCircle, AlertTriangle, FileText, 
  MessageSquare, Star, ArrowLeft
} from 'lucide-react';

const ClassDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', maxScore: 20, deadline: '' });
  
  // For submission
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const fetchClassDetails = async () => {
    try {
      const res = await classService.getClass(id);
      setClassData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [id]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      await classService.createAssignment(id, newAssignment);
      setShowCreateModal(false);
      setNewAssignment({ title: '', description: '', maxScore: 20, deadline: '' });
      fetchClassDetails();
    } catch (error) {
      console.error("Failed to create", error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) { setUploadError('Please upload a .zip file.'); return; }

    setUploading(true); setUploadError('');
    try {
      const formData = new FormData();
      formData.append('notes', 'Assignment submission');
      formData.append('projectFile', file);
      
      await classService.submitAssignment(selectedAssignment.id, formData);
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setSelectedAssignment(null);
        fetchClassDetails();
      }, 2000);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '0.75rem', color: 'var(--text-secondary)' }}>
      <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading class details...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!classData) return (
    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
      <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
      <h2>Class Not Found</h2>
      <Link to="/classroom" style={{ color: 'var(--accent-lavender)', marginTop: '1rem', display: 'inline-block' }}>← Back to Classroom</Link>
    </div>
  );

  const isTeacher = user?.id === classData.teacherId || user?.role === 'ADMIN';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link to="/classroom" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> Back to My Classes
      </Link>

      {/* Class Hero Header */}
      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(124,111,247,0.1), transparent)', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{classData.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', lineHeight: 1.6 }}>{classData.description || 'Welcome to this learning space on Evalify.'}</p>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={16} /> {classData.enrollments?.length || 0} Students</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BookOpen size={16} /> {classData.assignments?.length || 0} Assignments</span>
            </div>
          </div>
          {isTeacher && (
            <div style={{ textAlign: 'right', background: 'rgba(255,107,53,0.1)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,107,53,0.2)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Invite Code</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-warm)', fontFamily: 'var(--font-mono)' }}>{classData.inviteCode}</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '0.4rem' }}>Share this with your students</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        {/* Main Content: Assignments */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Assignments</h2>
            {isTeacher && (
              <button className="btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} /> New Assignment
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {classData.assignments?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                <BookOpen size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>No assignments published yet.</p>
              </div>
            ) : (
              classData.assignments.map((assignment, i) => (
                <motion.div key={assignment.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{assignment.title}</h3>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {assignment.deadline ? `Due ${new Date(assignment.deadline).toLocaleDateString()}` : 'No deadline'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-mint)' }}>{assignment.maxScore} Points</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>{assignment.description}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    {isTeacher ? (
                      <Link to={`/assignments/${assignment.id}/submissions`} className="btn-primary" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        View Submissions
                      </Link>
                    ) : assignment.submissions?.[0] ? (
                      <Link to={`/submissions/${assignment.submissions[0].id}`} className="btn-primary" style={{ background: 'var(--bg-hover)', color: 'var(--accent-mint)', border: '1px solid rgba(0,196,154,0.3)', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle size={14} /> View Feedback
                      </Link>
                    ) : (
                      <button className="btn-primary" onClick={() => setSelectedAssignment(assignment)} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                        Submit Work
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar: Students */}
        <div className="card" style={{ position: 'sticky', top: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--accent-lavender)" /> Students ({classData.enrollments?.length || 0})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {classData.enrollments?.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No students joined yet.</p>
            ) : (
              classData.enrollments.map(e => (
                <div key={e.student.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
                    {e.student.name?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{e.student.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create Assignment */}
      <AnimatePresence>
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} />
            
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '500px', borderRadius: 'var(--radius-xl)', padding: '2.5rem', zIndex: 1 }}>
              
              <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}>
                <X size={20} />
              </button>

              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Plus size={24} color="var(--accent-mint)" /> New Assignment</h2>

              <form onSubmit={handleCreateAssignment}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Title</label>
                  <input type="text" className="input-field" placeholder="e.g. Build a Task Manager API" value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} required />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Description / Requirements</label>
                  <textarea className="input-field" placeholder="Outline the requirements and learning objectives..." rows={4} value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Max Points</label>
                    <input type="number" className="input-field" value={newAssignment.maxScore} onChange={e => setNewAssignment({...newAssignment, maxScore: e.target.value})} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Deadline (Optional)</label>
                    <input type="date" className="input-field" value={newAssignment.deadline} onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})} />
                  </div>
                </div>

                <button type="submit" className="btn-primary full-width" disabled={uploading}>
                  {uploading ? <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Publish Assignment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Submit Assignment */}
      <AnimatePresence>
        {selectedAssignment && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAssignment(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} />
            
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '450px', borderRadius: 'var(--radius-xl)', padding: '2.5rem', zIndex: 1, textAlign: 'center' }}>
              
              <button onClick={() => setSelectedAssignment(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}>
                <X size={20} />
              </button>

              {uploadSuccess ? (
                <div style={{ padding: '2rem 0' }}>
                  <CheckCircle size={64} color="var(--accent-mint)" style={{ marginBottom: '1.5rem', margin: '0 auto' }} />
                  <h2 style={{ marginBottom: '0.5rem' }}>Successfully Submitted!</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Your code is being analyzed by Gemini AI.</p>
                </div>
              ) : (
                <>
                  <h2 style={{ marginBottom: '0.5rem' }}>Submit Work</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{selectedAssignment.title}</p>
                  
                  <div style={{ padding: '2.5rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)', marginBottom: '1.5rem' }}>
                    <UploadCloud size={40} color="var(--accent-lavender)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Select your project .ZIP file for evaluation.</p>
                    
                    <input type="file" accept=".zip" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                    <button className="btn-primary" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                      {uploading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite', marginRight: '0.5rem' }} /> Processing...</> : 'Choose ZIP File'}
                    </button>
                  </div>

                  {uploadError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                      <AlertTriangle size={14} /> {uploadError}
                    </div>
                  )}
                </>
              )}
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

export default ClassDetailPage;
