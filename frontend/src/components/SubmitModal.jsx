import { useState, useRef } from 'react';
import { X, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectService } from '../services/api';

const SubmitModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ title: '', description: '', language: 'javascript' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.name.endsWith('.zip')) {
      setFile(selected);
      setError('');
    } else {
      setFile(null);
      setError('Please select a valid .zip file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('A ZIP file is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('language', formData.language);
      data.append('projectFile', file);

      const res = await projectService.analyze(data);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze project');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setFormData({ title: '', description: '', language: 'javascript' });
    setFile(null);
    setResult(null);
    setError('');
    if (result && onSuccess) onSuccess(result);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={resetAndClose}></div>
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="modal-content card"
          style={{ maxWidth: '600px' }}
        >
          <div className="modal-header">
            <h2>{result ? 'Analysis Complete' : 'Submit Project'}</h2>
            <button onClick={resetAndClose} className="icon-btn"><X size={20} /></button>
          </div>
          
          {error && <div className="error-message"><AlertCircle size={16}/> {error}</div>}
          
          {!result ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Project Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="input-field" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea required name="description" value={formData.description} onChange={handleChange} className="input-field" rows="3"></textarea>
              </div>
              
              <div className="form-group">
                <label>Upload ZIP</label>
                <div 
                  className="upload-zone"
                  onClick={() => fileInputRef.current.click()}
                  style={{ border: '2px dashed var(--border-color)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'var(--bg-hover)' }}
                >
                  <input type="file" accept=".zip" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                  <UploadCloud size={32} style={{ color: 'var(--accent-lavender)', marginBottom: '0.5rem' }} />
                  {file ? (
                    <div style={{ color: 'var(--accent-mint)' }}>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</div>
                  ) : (
                    <div>Click to upload or drag and drop your .zip file</div>
                  )}
                </div>
              </div>

              <button type="submit" className="btn-primary full-width mt-4" disabled={loading || !file}>
                {loading ? 'Extracting & Analyzing with Gemini...' : 'Submit for AI Analysis'}
              </button>
            </form>
          ) : (
            <div className="analysis-result">
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div className={`score-ring ${result.aiScore >= 85 ? 'good' : result.aiScore >= 70 ? 'avg' : 'poor'}`}>
                  {result.aiScore}
                </div>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Overall Score</p>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ color: 'var(--accent-warm)' }}>Feedback</h4>
                <p>{result.aiFeedback}</p>
              </div>

              <button className="btn-primary full-width" onClick={resetAndClose}>
                View in Community
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-backdrop { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10, 10, 10, 0.8); backdrop-filter: blur(4px); }
        .modal-content { position: relative; width: 100%; max-width: 400px; z-index: 1001; background: var(--bg-card); max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .icon-btn { color: var(--text-secondary); } .icon-btn:hover { color: var(--text-primary); }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 0.875rem; margin-bottom: 0.5rem; color: var(--text-secondary); }
        .input-field { width: 100%; padding: 0.75rem; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: white; font-family: inherit; }
        .input-field:focus { outline: none; border-color: var(--accent-lavender); }
        .full-width { width: 100%; } .mt-4 { margin-top: 1rem; }
        .error-message { background: rgba(239, 68, 68, 0.1); color: var(--danger); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
        .score-ring { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; margin: 0 auto; border: 4px solid var(--border-color); }
        .score-ring.good { border-color: var(--accent-mint); color: var(--accent-mint); box-shadow: 0 0 20px rgba(0, 196, 154, 0.2); }
        .score-ring.avg { border-color: var(--warning); color: var(--warning); }
        .score-ring.poor { border-color: var(--danger); color: var(--danger); }
      `}</style>
    </div>
  );
};

export default SubmitModal;
