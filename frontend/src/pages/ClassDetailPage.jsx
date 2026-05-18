import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { classService, arenaService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, Users, BookOpen, Clock, ChevronRight, X, 
  Loader, UploadCloud, CheckCircle, AlertTriangle, FileText, 
  MessageSquare, Star, ArrowLeft, Pencil, Trash2, Paperclip, Download
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ACCEPTED_ASSIGNMENT_FILES = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.zip,.png,.jpg,.jpeg,.webp';
const createEmptyAssignmentForm = () => ({ title: '', description: '', maxScore: 20, deadline: '', attachment: null });

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const buildAssignmentFormData = (assignment) => {
  const formData = new FormData();
  formData.append('title', assignment.title);
  formData.append('description', assignment.description || '');
  formData.append('maxScore', assignment.maxScore || 20);
  formData.append('deadline', assignment.deadline || '');
  if (assignment.attachment) formData.append('attachment', assignment.attachment);
  if (assignment.removeAttachment) formData.append('removeAttachment', 'true');
  return formData;
};

const getApiErrorMessage = (error, fallback) => {
  const apiError = error.response?.data?.error;
  if (typeof apiError === 'string') return apiError;
  if (apiError?.message) return apiError.message;
  return fallback;
};

const ClassDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState(createEmptyAssignmentForm);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editAssignmentData, setEditAssignmentData] = useState({ title: '', description: '', maxScore: 20, deadline: '', attachment: null, removeAttachment: false });
  const [assignmentError, setAssignmentError] = useState('');
  
  // For submission
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const assignmentAttachmentInputRef = useRef(null);
  const editAttachmentInputRef = useRef(null);

  const fetchClassDetails = useCallback(async () => {
    try {
      const res = await classService.getClass(id);
      setClassData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClassDetails();
  }, [fetchClassDetails]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignment.description.trim() && !newAssignment.attachment) {
      setAssignmentError(t('addDescriptionOrAttach'));
      return;
    }
    setUploading(true);
    setAssignmentError('');
    try {
      await classService.createAssignment(id, buildAssignmentFormData(newAssignment));
      setShowCreateModal(false);
      setNewAssignment(createEmptyAssignmentForm());
      if (assignmentAttachmentInputRef.current) assignmentAttachmentInputRef.current.value = '';
      fetchClassDetails();
    } catch (error) {
      console.error("Failed to create", error);
      setAssignmentError(getApiErrorMessage(error, t('failedPublishAssignment')));
    } finally {
      setUploading(false);
    }
  };

  const openEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setEditAssignmentData({
      title: assignment.title || '',
      description: assignment.description || '',
      maxScore: assignment.maxScore || 20,
      deadline: assignment.deadline ? assignment.deadline.split('T')[0] : '',
      attachment: null,
      removeAttachment: false
    });
    setAssignmentError('');
  };

  const handleAssignmentFieldChange = (field, value) => {
    setEditAssignmentData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditAssignment = async (e) => {
    e.preventDefault();
    if (!editingAssignment) return;
    const keepsExistingAttachment = Boolean(editingAssignment.attachmentOriginalName && !editAssignmentData.removeAttachment);
    if (!editAssignmentData.description.trim() && !editAssignmentData.attachment && !keepsExistingAttachment) {
      setAssignmentError(t('addDescriptionOrKeepAttach'));
      return;
    }
    setUploading(true);
    setAssignmentError('');
    try {
      await classService.updateAssignment(editingAssignment.id, buildAssignmentFormData(editAssignmentData));
      setEditingAssignment(null);
      if (editAttachmentInputRef.current) editAttachmentInputRef.current.value = '';
      fetchClassDetails();
    } catch (err) {
      console.error('Failed to update assignment', err);
      setAssignmentError(getApiErrorMessage(err, t('failedUpdateAssignment')));
    } finally {
      setUploading(false);
    }
  };

  const clearNewAssignmentAttachment = () => {
    setNewAssignment(prev => ({ ...prev, attachment: null }));
    if (assignmentAttachmentInputRef.current) assignmentAttachmentInputRef.current.value = '';
  };

  const clearEditAssignmentAttachment = () => {
    setEditAssignmentData(prev => ({ ...prev, attachment: null }));
    if (editAttachmentInputRef.current) editAttachmentInputRef.current.value = '';
  };

  const handleDownloadAssignmentAttachment = async (assignment) => {
    try {
      const blob = await classService.downloadAssignmentAttachment(assignment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = assignment.attachmentOriginalName || `assignment-${assignment.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download assignment attachment', err);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm(t('deleteAssignmentConfirm'))) return;
    try {
      await classService.deleteAssignment(assignmentId);
      fetchClassDetails();
    } catch (err) {
      console.error('Failed to delete assignment', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) { setUploadError(t('pleaseUploadZip')); return; }

    setUploading(true); setUploadError('');
    try {
      const formData = new FormData();
      formData.append('notes', t('assignmentSubmission'));
      formData.append('projectFile', file);
      
      await classService.submitAssignment(selectedAssignment.id, formData);
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setSelectedAssignment(null);
        fetchClassDetails();
      }, 2000);
    } catch (err) {
      setUploadError(err.response?.data?.error || t('uploadFailedRetry'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '0.75rem', color: 'var(--text-secondary)' }}>
      <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('loadingClassDetails')}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!classData) return (
    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
      <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
      <h2>{t('classNotFound')}</h2>
      <Link to="/classroom" style={{ color: 'var(--accent-lavender)', marginTop: '1rem', display: 'inline-block' }}>← {t('backToClassroom')}</Link>
    </div>
  );

  const isTeacher = user?.id === classData.teacherId || user?.role === 'ADMIN';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link to="/classroom" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        <ArrowLeft size={16} /> {t('backToMyClasses')}
      </Link>

      {/* Class Hero Header */}
      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(124,111,247,0.1), transparent)', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{classData.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', lineHeight: 1.6 }}>{classData.description || t('welcomeLearningSpace')}</p>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={16} /> {classData.enrollments?.length || 0} {t('students')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><BookOpen size={16} /> {classData.assignments?.length || 0} {t('assignments')}</span>
            </div>
          </div>
          {isTeacher && (
            <div style={{ textAlign: 'right', background: 'rgba(255,107,53,0.1)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,107,53,0.2)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('inviteCode')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-warm)', fontFamily: 'var(--font-mono)' }}>{classData.inviteCode}</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '0.4rem' }}>{t('shareWithStudents')}</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        {/* Main Content: Assignments */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{t('assignments')}</h2>
            {isTeacher && (
              <button className="btn-primary" onClick={() => { setAssignmentError(''); setShowCreateModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} /> {t('newAssignment')}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {classData.assignments?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                <BookOpen size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>{t('noAssignmentsPublished')}</p>
              </div>
            ) : (
              classData.assignments.map((assignment, i) => (
                <motion.div key={assignment.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{assignment.title}</h3>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {assignment.deadline ? `${t('due')} ${new Date(assignment.deadline).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')}` : t('noDeadline')}</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-mint)' }}>{assignment.maxScore} {t('points')}</span>
                      </div>
                    </div>
                  </div>
                  {assignment.description ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: assignment.attachmentOriginalName ? '1rem' : '1.5rem' }}>{assignment.description}</p>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: assignment.attachmentOriginalName ? '1rem' : '1.5rem' }}>{t('instructionsAttached')}</p>
                  )}

                  {assignment.attachmentOriginalName && (
                    <button type="button" onClick={() => handleDownloadAssignmentAttachment(assignment)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.85rem 1rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                        <FileText size={18} color="var(--accent-lavender)" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignment.attachmentOriginalName}</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-secondary)', fontSize: '0.8rem', flexShrink: 0 }}>
                        {formatFileSize(assignment.attachmentSize)}
                        <Download size={14} />
                      </span>
                    </button>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    {isTeacher ? (
                      <>
                        <button type="button" onClick={() => openEditAssignment(assignment)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.95rem', fontSize: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <Pencil size={14} /> {t('edit')}
                        </button>
                        <button type="button" onClick={() => handleDeleteAssignment(assignment.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.95rem', fontSize: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--danger)', background: 'rgba(236, 72, 86, 0.08)', color: 'var(--danger)', cursor: 'pointer' }}>
                          <Trash2 size={14} /> {t('delete')}
                        </button>
                        <Link to={`/assignments/${assignment.id}/submissions`} className="btn-primary" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                          {t('viewSubmissions')}
                        </Link>
                      </>
                    ) : assignment.submissions?.[0] ? (
                      <Link to={`/submissions/${assignment.submissions[0].id}`} className="btn-primary" style={{ background: 'var(--bg-hover)', color: 'var(--accent-mint)', border: '1px solid rgba(0,196,154,0.3)', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle size={14} /> {t('viewFeedback')}
                      </Link>
                    ) : (
                      <button className="btn-primary" onClick={() => setSelectedAssignment(assignment)} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                        {t('submitWork')}
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
            <Users size={18} color="var(--accent-lavender)" /> {t('students')} ({classData.enrollments?.length || 0})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {classData.enrollments?.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>{t('noStudentsJoined')}</p>
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
              style={{ position: 'absolute', inset: 0, background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} />
            
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '520px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', borderRadius: 'var(--radius-xl)', padding: '2.5rem', zIndex: 1 }}>
              
              <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}>
                <X size={20} />
              </button>

              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Plus size={24} color="var(--accent-mint)" /> {t('newAssignment')}</h2>

              <form onSubmit={handleCreateAssignment}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('title')}</label>
                  <input type="text" className="input-field" placeholder={t('assignmentTitlePlaceholder')} value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} required />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('requirements')}</label>
                  <textarea className="input-field" placeholder={t('assignmentRequirementsPlaceholder')} rows={4} value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('maxPoints')}</label>
                    <input type="number" className="input-field" value={newAssignment.maxScore} onChange={e => setNewAssignment({...newAssignment, maxScore: e.target.value})} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('deadlineOptional')}</label>
                    <input type="date" className="input-field" value={newAssignment.deadline} onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})} />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('assignmentFile')}</label>
                  <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)', padding: '1rem' }}>
                    <input type="file" accept={ACCEPTED_ASSIGNMENT_FILES} ref={assignmentAttachmentInputRef} onChange={e => setNewAssignment({...newAssignment, attachment: e.target.files?.[0] || null})} style={{ display: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <Paperclip size={20} color="var(--accent-lavender)" style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{newAssignment.attachment ? newAssignment.attachment.name : t('attachBrief')}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{newAssignment.attachment ? formatFileSize(newAssignment.attachment.size) : t('allowedAssignmentFiles')}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {newAssignment.attachment && (
                          <button type="button" onClick={clearNewAssignmentAttachment} style={{ padding: '0.6rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>{t('clear')}</button>
                        )}
                        <button type="button" onClick={() => assignmentAttachmentInputRef.current?.click()} style={{ padding: '0.6rem 0.9rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>{t('chooseFile')}</button>
                      </div>
                    </div>
                  </div>
                </div>

                {assignmentError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={14} /> {assignmentError}
                  </div>
                )}

                <button type="submit" className="btn-primary full-width" disabled={uploading}>
                  {uploading ? <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> : t('publishAssignment')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingAssignment && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingAssignment(null)}
              style={{ position: 'absolute', inset: 0, background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} />

            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '520px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', borderRadius: 'var(--radius-xl)', padding: '2.5rem', zIndex: 1 }}>

              <button onClick={() => setEditingAssignment(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}>
                <X size={20} />
              </button>

              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Pencil size={24} color="var(--accent-mint)" /> {t('editAssignment')}</h2>

              <form onSubmit={handleEditAssignment}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('title')}</label>
                  <input type="text" className="input-field" value={editAssignmentData.title} onChange={e => handleAssignmentFieldChange('title', e.target.value)} required />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('requirements')}</label>
                  <textarea className="input-field" rows={4} value={editAssignmentData.description} onChange={e => handleAssignmentFieldChange('description', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('maxPoints')}</label>
                    <input type="number" className="input-field" value={editAssignmentData.maxScore} onChange={e => handleAssignmentFieldChange('maxScore', e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('deadlineOptional')}</label>
                    <input type="date" className="input-field" value={editAssignmentData.deadline} onChange={e => handleAssignmentFieldChange('deadline', e.target.value)} />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{t('assignmentFile')}</label>
                  <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-hover)', padding: '1rem' }}>
                    <input type="file" accept={ACCEPTED_ASSIGNMENT_FILES} ref={editAttachmentInputRef} onChange={e => setEditAssignmentData(prev => ({ ...prev, attachment: e.target.files?.[0] || null, removeAttachment: false }))} style={{ display: 'none' }} />

                    {editingAssignment.attachmentOriginalName && !editAssignmentData.attachment && !editAssignmentData.removeAttachment && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <FileText size={20} color="var(--accent-lavender)" style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editingAssignment.attachmentOriginalName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatFileSize(editingAssignment.attachmentSize) || t('currentAttachment')}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" onClick={() => setEditAssignmentData(prev => ({ ...prev, removeAttachment: true }))} style={{ padding: '0.6rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>{t('remove')}</button>
                          <button type="button" onClick={() => editAttachmentInputRef.current?.click()} style={{ padding: '0.6rem 0.9rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>{t('replace')}</button>
                        </div>
                      </div>
                    )}

                    {editAssignmentData.removeAttachment && !editAssignmentData.attachment && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('attachmentWillBeRemoved')}</div>
                        <button type="button" onClick={() => setEditAssignmentData(prev => ({ ...prev, removeAttachment: false }))} style={{ padding: '0.6rem 0.9rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>{t('undo')}</button>
                      </div>
                    )}

                    {editAssignmentData.attachment && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <Paperclip size={20} color="var(--accent-lavender)" style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editAssignmentData.attachment.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatFileSize(editAssignmentData.attachment.size)}</div>
                          </div>
                        </div>
                        <button type="button" onClick={clearEditAssignmentAttachment} style={{ padding: '0.6rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>{t('clear')}</button>
                      </div>
                    )}

                    {!editingAssignment.attachmentOriginalName && !editAssignmentData.attachment && !editAssignmentData.removeAttachment && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Paperclip size={20} color="var(--accent-lavender)" />
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('noFileAttached')}</span>
                        </div>
                        <button type="button" onClick={() => editAttachmentInputRef.current?.click()} style={{ padding: '0.6rem 0.9rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>{t('chooseFile')}</button>
                      </div>
                    )}
                  </div>
                </div>

                {assignmentError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={14} /> {assignmentError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setEditingAssignment(null)} style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>{t('cancel')}</button>
                  <button type="submit" className="btn-primary" disabled={uploading} style={{ padding: '0.85rem 1.25rem' }}>{uploading ? t('saving') : t('saveChanges')}</button>
                </div>
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
              style={{ position: 'absolute', inset: 0, background: 'var(--overlay-bg)', backdropFilter: 'blur(4px)' }} />
            
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel" style={{ position: 'relative', width: '100%', maxWidth: '450px', borderRadius: 'var(--radius-xl)', padding: '2.5rem', zIndex: 1, textAlign: 'center' }}>
              
              <button onClick={() => setSelectedAssignment(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'none' }}>
                <X size={20} />
              </button>

              {uploadSuccess ? (
                <div style={{ padding: '2rem 0' }}>
                  <CheckCircle size={64} color="var(--accent-mint)" style={{ marginBottom: '1.5rem', margin: '0 auto' }} />
                  <h2 style={{ marginBottom: '0.5rem' }}>{t('successfullySubmitted')}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{t('assignmentSubmittedText')}</p>
                </div>
              ) : (
                <>
                  <h2 style={{ marginBottom: '0.5rem' }}>{t('submitWork')}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{selectedAssignment.title}</p>
                  
                  <div style={{ padding: '2.5rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)', marginBottom: '1.5rem' }}>
                    <UploadCloud size={40} color="var(--accent-lavender)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{t('selectProjectZip')}</p>
                    
                    <input type="file" accept=".zip" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                    <button className="btn-primary" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                      {uploading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite', marginRight: '0.5rem' }} /> {t('processing')}</> : t('chooseZipFile')}
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
