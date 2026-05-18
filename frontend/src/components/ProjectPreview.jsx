import React, { useState, useRef } from 'react';
import { Play, Copy, Terminal, Image as ImageIcon, Upload } from 'lucide-react';
import { projectService, codeService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

export default function ProjectPreview({ project, onUpdate }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const isOwner = user?.id === project.userId;

  const handleRunCli = async () => {
    setRunning(true);
    setOutput(null);
    try {
      // Fetch source code
      const sourceData = await projectService.getSource(project.id);
      
      if (!sourceData.files || sourceData.files.length === 0) {
        throw new Error(t('noFilesFound'));
      }

      // Execute via Piston
      const data = await codeService.executeCode({
        language: project.language || 'javascript',
        files: sourceData.files.map(f => ({ name: f.path, content: f.content }))
      });
      
      if (!data.success) throw new Error(data.error || t('executionFailed'));
      
      setOutput(data.run);
    } catch (err) {
      setOutput({ stderr: err.message, code: 1 });
    } finally {
      setRunning(false);
    }
  };

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      
      // Upload via projectService
      const data = await projectService.uploadScreenshot(project.id, formData);
      if (data.success && onUpdate) {
        onUpdate(data.data);
      }
    } catch (err) {
      console.error('Screenshot upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const copyCloneCommand = () => {
    const cmd = `git clone ${project.githubUrl} && cd ${project.githubUrl.split('/').pop()}`;
    navigator.clipboard.writeText(cmd);
    alert(t('cloneCommandCopied'));
  };

  if (!project.projectType || project.projectType === 'unknown') {
    return null; // Don't show preview panel if unknown
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem', padding: '0' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          {project.projectType === 'web' && <><Play size={16} /> {t('liveWebPreview')}</>}
          {project.projectType === 'cli' && <><Terminal size={16} /> {t('terminalEnvironment')}</>}
          {project.projectType === 'gui' && <><ImageIcon size={16} /> {t('guiPreview')}</>}
        </h3>
        {project.projectType === 'cli' && (
          <button onClick={handleRunCli} disabled={running} className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {running ? t('running') : <><Play size={14} /> {t('runCode')}</>}
          </button>
        )}
      </div>

      <div style={{ background: 'var(--bg)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', overflow: 'hidden' }}>
        {project.projectType === 'web' && (
          <iframe 
            src={`http://localhost:5000/preview/${project.id}/index.html`}
            sandbox="allow-scripts allow-same-origin"
            style={{ width: '100%', height: '500px', border: 'none', background: '#fff' }}
            title={t('webPreviewTitle')}
          />
        )}

        {project.projectType === 'cli' && (
          <div style={{ padding: '1rem', background: '#0d1117', color: '#c9d1d9', minHeight: '300px', fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap', overflowY: 'auto' }}>
            {output ? (
              <>
                {output.stdout && <div style={{ color: '#c9d1d9' }}>{output.stdout}</div>}
                {output.stderr && <div style={{ color: '#ff7b72', marginTop: output.stdout ? '1rem' : '0' }}>{output.stderr}</div>}
                <div style={{ marginTop: '1rem', color: output.code === 0 ? '#3fb950' : '#ff7b72', fontSize: '0.8rem' }}>
                  {t('programExited', { code: output.code })}
                </div>
              </>
            ) : (
              <div style={{ color: '#8b949e', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '260px' }}>
                {t('clickRunCode')}
              </div>
            )}
          </div>
        )}

        {project.projectType === 'gui' && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            {project.screenshotPath ? (
              <img src={`http://localhost:5000/uploads/${project.screenshotPath}`} alt={t('guiPreview')} style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} />
            ) : (
              <div style={{ padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <ImageIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p style={{ marginBottom: '1rem' }}>{t('noScreenshot')}</p>
                {isOwner && (
                  <>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleScreenshotUpload} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                      {uploading ? t('uploading') : <><Upload size={14} style={{ display: 'inline', marginRight: '0.4rem' }}/> {t('uploadScreenshot')}</>}
                    </button>
                  </>
                )}
              </div>
            )}
            
            {project.githubUrl && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{t('guiCannotRun')}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <code style={{ background: 'var(--bg-hover)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--accent-lavender)' }}>
                    git clone {project.githubUrl}
                  </code>
                  <button onClick={copyCloneCommand} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
