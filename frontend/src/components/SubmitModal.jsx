import { useState, useRef } from 'react';
import { X, UploadCloud, CheckCircle, AlertCircle, FileCode2, FolderGit, Database, Archive, Globe, Terminal, Info, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const TYPE_OPTIONS = [
  {
    value: 'zip',
    labelKey: 'fullProjectZip',
    accept: '.zip',
    Icon: Archive,
    hintKey: 'fullProjectZipHint',
  },
  {
    value: 'html_css',
    labelKey: 'htmlCss',
    accept: '.html,.htm,.css,.zip',
    Icon: Globe,
    hintKey: 'htmlCssHint',
  },
  {
    value: 'python',
    labelKey: 'pythonScript',
    accept: '.py,.zip',
    Icon: Terminal,
    hintKey: 'pythonScriptHint',
  },
  {
    value: 'sql',
    labelKey: 'sqlQueries',
    accept: '.sql',
    Icon: Database,
    hintKey: 'sqlQueriesHint',
  },
];

const SubmitModal = ({ isOpen, onClose, onSuccess, onStatusChange }) => {
  const { t } = useLanguage();
  const [submissionMethod, setSubmissionMethod] = useState('file');
  const [submissionType, setSubmissionType] = useState('zip');
  const [formData, setFormData] = useState({
    title: '', description: '', language: 'javascript',
    githubUrl: '', projectType: 'unknown',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const currentTypeOption = TYPE_OPTIONS.find(t => t.value === submissionType) || TYPE_OPTIONS[0];

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    const ext = selected.name.split('.').pop().toLowerCase();
    const validExts = currentTypeOption.accept.replace(/\./g, '').split(',');
    if (validExts.includes(ext)) {
      setFile(selected);
      setError('');
    } else {
      setFile(null);
      setError(t('invalidFileType', { types: currentTypeOption.accept }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submissionMethod === 'file' && !file) { setError(t('fileRequired')); return; }
    if (submissionMethod === 'github' && !formData.githubUrl) { setError(t('githubUrlRequired')); return; }

    setLoading(true);
    setError('');
    onStatusChange?.('uploading');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('language', formData.language);
      data.append('projectType', formData.projectType);
      data.append('submissionType', submissionType);

      if (submissionMethod === 'file') {
        data.append('projectFile', file);
      } else {
        data.append('githubUrl', formData.githubUrl);
        data.append('isGithubLink', 'true');
      }

      const res = await projectService.submit(data);
      setResult(res.data);
      onStatusChange?.('success');
    } catch (err) {
      const errorData = err.response?.data?.error;
      const errorMessage = typeof errorData === 'object' && errorData !== null
        ? errorData.message || t('uploadFailed')
        : errorData || t('uploadFailed');
      setError(errorMessage);
      onStatusChange?.('error');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setFormData({ title: '', description: '', language: 'javascript', githubUrl: '', projectType: 'unknown' });
    setFile(null);
    setSubmissionMethod('file');
    setSubmissionType('zip');
    setResult(null);
    setError('');
    if (result && onSuccess) onSuccess(result);
    onStatusChange?.('idle');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={resetAndClose} />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="modal-content card"
          style={{ maxWidth: '620px' }}
        >
          <div className="modal-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {result
                ? <><CheckCircle size={20} style={{ color: 'var(--accent-mint)' }} /> {t('submissionReceived')}</>
                : <><Send size={20} /> {t('submitProject')}</>
              }
            </h2>
            <button onClick={resetAndClose} className="icon-btn"><X size={20} /></button>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {!result ? (
            <form onSubmit={handleSubmit} className="auth-form">

              {/* Upload Method Toggle */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.2rem', background: 'var(--bg-hover)', padding: '0.3rem', borderRadius: 'var(--radius-md)' }}>
                {[
                  { val: 'file',   label: t('localFile'),  Icon: UploadCloud },
                  { val: 'github', label: t('github'),     Icon: FolderGit },
                ].map(({ val, label, Icon }) => (
                  <button key={val} type="button" onClick={() => setSubmissionMethod(val)}
                    style={{
                      flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: 'none',
                      background: submissionMethod === val ? 'var(--bg-card)' : 'transparent',
                      color: submissionMethod === val ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: submissionMethod === val ? 600 : 400, cursor: 'pointer',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    }}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {/* Submission Type Selector */}
              <div className="form-group">
                <label>{t('submissionType')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {TYPE_OPTIONS.map(({ value, labelKey, Icon }) => (
                    <button key={value} type="button"
                      onClick={() => { setSubmissionType(value); setFile(null); }}
                      style={{
                        padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        transition: 'all 0.2s', textAlign: 'left', fontSize: '0.82rem',
                        fontWeight: submissionType === value ? 600 : 400,
                        border: `1px solid ${submissionType === value ? 'var(--accent-lavender)' : 'var(--border-color)'}`,
                        background: submissionType === value ? 'rgba(139,92,246,0.1)' : 'var(--bg-hover)',
                        color: submissionType === value ? 'var(--accent-lavender)' : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                      }}>
                      <Icon size={14} /> {t(labelKey)}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  {t(currentTypeOption.hintKey)}
                </p>
              </div>

              {/* Title */}
              <div className="form-group">
                <label>
                  {t('projectTitle')}
                  {submissionMethod === 'github' && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                      {t('optionalRepoName')}
                    </span>
                  )}
                </label>
                <input type="text" name="title" value={formData.title} onChange={handleChange}
                  className="input-field" placeholder={t('myProjectPlaceholder')} required={submissionMethod === 'file'} />
              </div>

              {/* Description */}
              <div className="form-group">
                <label>
                  {t('description')}
                  {submissionMethod === 'github' && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>({t('optional')})</span>
                  )}
                </label>
                <textarea name="description" value={formData.description} onChange={handleChange}
                  className="input-field" rows="2" placeholder={t('briefDescriptionPlaceholder')}
                  required={submissionMethod === 'file'} />
              </div>

              {/* File or Github */}
              {submissionMethod === 'file' ? (
                <div className="form-group">
                  <label>{t('file')} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({currentTypeOption.accept})</span></label>
                  <div className="upload-zone" onClick={() => fileInputRef.current.click()}
                    style={{
                      border: '2px dashed var(--border-color)', padding: '2rem', textAlign: 'center',
                      borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'var(--bg-hover)',
                      transition: 'border-color 0.2s',
                    }}>
                    <input type="file" accept={currentTypeOption.accept} ref={fileInputRef}
                      onChange={handleFileChange} style={{ display: 'none' }} />
                    <UploadCloud size={32} style={{ color: 'var(--accent-lavender)', marginBottom: '0.5rem' }} />
                    {file ? (
                      <div style={{ color: 'var(--accent-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <CheckCircle size={14} />
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {t('clickChooseFile', { types: currentTypeOption.accept })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FolderGit size={14} /> {t('githubRepositoryUrl')}
                  </label>
                  <input required type="url" name="githubUrl" value={formData.githubUrl} onChange={handleChange}
                    placeholder="https://github.com/username/repo" className="input-field" />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                    {t('publicRepoHint')}
                  </p>
                </div>
              )}

              {/* Info banner */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem',
                marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)',
              }}>
                <Info size={14} style={{ marginTop: '1px', flexShrink: 0, color: 'var(--accent-lavender)' }} />
                <span>
                  <strong style={{ color: 'var(--text-primary)' }}>{t('aiOptionalTitle')}</strong>{' '}
                  {t('aiOptionalText')}
                </span>
              </div>

              <button type="submit" className="btn-primary full-width mt-4"
                disabled={loading || (submissionMethod === 'file' && !file) || (submissionMethod === 'github' && !formData.githubUrl)}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <UploadCloud size={15} style={{ animation: 'pulse 1s infinite' }} /> {t('savingProject')}
                    </span>
                  : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Send size={15} /> {t('submitProject')}
                    </span>
                }
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,196,154,0.1)',
                border: '2px solid var(--accent-mint)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 1rem',
              }}>
                <CheckCircle size={28} style={{ color: 'var(--accent-mint)' }} />
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>{t('projectSubmitted')}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {t('visitProjectPage')}
              </p>
              <button className="btn-primary full-width" onClick={resetAndClose}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <FileCode2 size={15} /> {t('viewInCommunity')}
                </span>
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-backdrop { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--overlay-bg); backdrop-filter: blur(4px); }
        .modal-content { position: relative; width: 100%; max-width: 400px; z-index: 1001; background: var(--bg-card); max-height: 92vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .icon-btn { color: var(--text-secondary); } .icon-btn:hover { color: var(--text-primary); }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; margin-bottom: 0.5rem; color: var(--text-secondary); }
        .input-field { width: 100%; padding: 0.75rem; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-primary); font-family: inherit; box-sizing: border-box; }
        .input-field:focus { outline: none; border-color: var(--accent-lavender); }
        .full-width { width: 100%; } .mt-4 { margin-top: 1rem; }
        .error-message { background: rgba(239, 68, 68, 0.1); color: var(--danger); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
};

export default SubmitModal;
