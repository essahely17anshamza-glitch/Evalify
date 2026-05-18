import { useState } from 'react';
import { Sparkles, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { projectService, classService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

/**
 * Reusable on-demand AI analysis button.
 * Props:
 *   - projectId: string|number (use for community projects)
 *   - submissionId: string|number (use for assignment submissions)
 *   - hasExistingAnalysis: bool (true → shows "Re-analyze" style)
 *   - onAnalysisComplete: fn(updatedData) — called after successful analysis
 */
const AnalyzeButton = ({ projectId, submissionId, hasExistingAnalysis = false, onAnalysisComplete }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (projectId) {
        result = await projectService.analyzeById(projectId);
      } else if (submissionId) {
        result = await classService.analyzeSubmission(submissionId);
      } else {
        throw new Error(t('noAnalysisTarget'));
      }
      onAnalysisComplete?.(result.data);
    } catch (err) {
      const errData = err.response?.data?.error;
      const msg = typeof errData === 'object' ? errData?.message : errData;
      setError(msg || t('aiAnalysisFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.65rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid',
          borderColor: loading ? 'var(--border-color)' : 'var(--accent-lavender)',
          background: loading
            ? 'var(--bg-hover)'
            : hasExistingAnalysis
              ? 'transparent'
              : 'linear-gradient(135deg, var(--accent-lavender), #7c3aed)',
          color: loading ? 'var(--text-secondary)' : hasExistingAnalysis ? 'var(--accent-lavender)' : '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
          boxShadow: !loading && !hasExistingAnalysis ? '0 4px 20px rgba(139,92,246,0.3)' : 'none',
        }}
      >
        {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
        {!loading && hasExistingAnalysis && <RefreshCw size={15} />}
        {!loading && !hasExistingAnalysis && <Sparkles size={15} />}
        <span>
          {loading
            ? t('analyzingInProgress')
            : hasExistingAnalysis
              ? t('reanalyzeWithAi')
              : t('analyzeWithAi')}
        </span>
      </button>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--danger)', fontSize: '0.85rem',
          background: 'rgba(239,68,68,0.1)', padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-sm)', maxWidth: '400px',
        }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AnalyzeButton;
