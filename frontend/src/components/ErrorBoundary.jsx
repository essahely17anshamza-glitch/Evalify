import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { getStoredLanguage, translate } from '../context/LanguageContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: errorId
    });

    // Log error details (in production, send to error tracking service)
    console.error('Error Boundary caught an error:', {
      errorId,
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // In development, you might want to send this to an error reporting service
    if (import.meta.env.MODE === 'production') {
      // Example: sendErrorToService(errorId, error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.MODE === 'development';
      const lang = getStoredLanguage();
      const t = (key, values) => translate(key, lang, values);

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'var(--bg-color)'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '600px',
            width: '100%',
            padding: '2.5rem',
            textAlign: 'center',
            borderRadius: 'var(--radius-xl)'
          }}>
            {/* Error Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={32} style={{ color: 'var(--danger)' }} />
            </div>

            {/* Error Title */}
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)'
            }}>
              {t('errorBoundaryTitle')}
            </h1>

            {/* Error Message */}
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              {t('errorBoundaryText')}
            </p>

            {/* Error ID */}
            {this.state.errorId && (
              <div style={{
                background: 'var(--bg-hover)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('errorId')}: </span>
                <span style={{ color: 'var(--accent-lavender)' }}>{this.state.errorId}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleRetry}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <RefreshCw size={16} />
                {t('tryAgain')}
              </button>
              
              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--bg-card)';
                  e.target.style.borderColor = 'var(--accent-lavender)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--bg-hover)';
                  e.target.style.borderColor = 'var(--border-color)';
                }}
              >
                <Home size={16} />
                {t('goHome')}
              </button>
            </div>

            {/* Development Details */}
            {isDevelopment && this.state.error && (
              <details style={{
                marginTop: '2rem',
                textAlign: 'left',
                background: 'var(--bg-hover)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  color: 'var(--text-primary)'
                }}>
                  {t('developmentErrorDetails')}
                </summary>
                
                <div style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>{t('errorLabel')}</strong>
                    <pre style={{
                      background: 'var(--terminal-bg)',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'auto',
                      marginTop: '0.5rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  
                  {this.state.errorInfo && (
                    <div>
                      <strong>{t('componentStack')}</strong>
                      <pre style={{
                        background: 'var(--terminal-bg)',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'auto',
                        marginTop: '0.5rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem'
                      }}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
