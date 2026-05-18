import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { FileCode, FileText, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const getLanguageFromFileName = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'cpp':
    case 'cc':
    case 'c':
      return 'cpp';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    default:
      return 'plaintext';
  }
};

const CodeEditor = ({ files, onChange, defaultLanguage = 'javascript', readOnly = false }) => {
  const { t } = useLanguage();
  const [activeFileName, setActiveFileName] = useState(files[0]?.name || 'main.js');
  const [newFileName, setNewFileName] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);

  const activeFile = files.find(f => f.name === activeFileName);

  useEffect(() => {
    if (!activeFile && files.length > 0) {
      setActiveFileName(files[0].name);
    }
  }, [files, activeFile]);

  const handleEditorChange = (value) => {
    const updatedFiles = files.map(f =>
      f.name === activeFileName ? { ...f, content: value || '' } : f
    );
    onChange(updatedFiles);
  };

  const handleAddFile = (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    // Prevent duplicates
    if (files.some(f => f.name === newFileName.trim())) {
      setIsAddingFile(false);
      setNewFileName('');
      return;
    }

    const updatedFiles = [...files, { name: newFileName.trim(), content: '' }];
    onChange(updatedFiles);
    setActiveFileName(newFileName.trim());
    setIsAddingFile(false);
    setNewFileName('');
  };

  const handleDeleteFile = (e, fileName) => {
    e.stopPropagation();
    if (files.length <= 1) return; // Must have at least one file
    const updatedFiles = files.filter(f => f.name !== fileName);
    onChange(updatedFiles);
    if (activeFileName === fileName) {
      setActiveFileName(updatedFiles[0].name);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '400px', backgroundColor: '#1e1e1e', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      {/* File Tree Sidebar */}
      <div style={{ width: '200px', backgroundColor: '#181818', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('files')}</span>
          {!readOnly && (
            <button onClick={() => setIsAddingFile(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Plus size={14} />
            </button>
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {files.map(f => (
            <div
              key={f.name}
              onClick={() => setActiveFileName(f.name)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: activeFileName === f.name ? 'rgba(124, 111, 247, 0.15)' : 'transparent',
                color: activeFileName === f.name ? 'var(--accent-lavender)' : 'var(--text-secondary)',
                borderLeft: activeFileName === f.name ? '2px solid var(--accent-lavender)' : '2px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCode size={14} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              </div>
              {!readOnly && files.length > 1 && (
                <button onClick={(e) => handleDeleteFile(e, f.name)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: activeFileName === f.name ? 1 : 0.5 }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}

          {isAddingFile && (
            <form onSubmit={handleAddFile} style={{ padding: '0.5rem 1rem' }}>
              <input
                autoFocus
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={() => setIsAddingFile(false)}
                placeholder={t('filenamePlaceholder')}
                style={{
                  width: '100%',
                  background: '#252526',
                  border: '1px solid var(--accent-lavender)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '3px',
                  outline: 'none'
                }}
              />
            </form>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.5rem 1rem', backgroundColor: '#1e1e1e', borderBottom: '1px solid #2d2d2d', color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={14} />
          {activeFileName}
        </div>
        <div style={{ flex: 1 }}>
          <Editor
            height="100%"
            language={getLanguageFromFileName(activeFileName) || defaultLanguage}
            theme="vs-dark"
            value={activeFile?.content || ''}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: readOnly,
              padding: { top: 16 }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
