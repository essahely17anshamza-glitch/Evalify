import { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [errorId, setErrorId] = useState(null);

  const handleError = useCallback((error, context = '') => {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.error('Error caught by useErrorHandler:', {
      errorId,
      error: error?.message || error,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString()
    });

    setErrorId(errorId);
    setError({
      message: error?.message || 'An unexpected error occurred',
      context,
      errorId
    });

    // In production, you might want to send this to an error reporting service
    if (import.meta.env.MODE === 'production') {
      // sendErrorToService(errorId, error, context);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorId(null);
  }, []);

  const ErrorComponent = error ? (
    <div style={{
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: 'var(--radius-md)',
      padding: '1rem',
      margin: '1rem 0',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem'
    }}>
      <AlertTriangle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '0.125rem' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
          {error.message}
        </div>
        {error.context && (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Context: {error.context}
          </div>
        )}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Error ID: {error.errorId}
        </div>
        <button
          onClick={clearError}
          style={{
            marginTop: '0.75rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--danger)',
            color: 'white',
            border: 'none',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'opacity var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.8'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          Dismiss
        </button>
      </div>
    </div>
  ) : null;

  return {
    error,
    errorId,
    handleError,
    clearError,
    ErrorComponent
  };
};

export default useErrorHandler;
