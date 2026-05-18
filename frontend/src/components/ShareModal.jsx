import React, { useState } from 'react';
import { Share2, Copy, Twitter, Linkedin, Facebook, Download, Link2, BarChart3 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ShareModal = ({ isOpen, onClose, type, data, onShare }) => {
  const { t } = useLanguage();
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [shareData, setShareData] = useState(null);

  const shareUrl = shareData?.shareUrl || data?.shareUrl || '';
  const downloadUrl = shareData?.downloadUrl || data?.downloadUrl;

  const handleShare = async () => {
    try {
      const response = await fetch(`/api/${type === 'project' ? 'projects' : 'arena/battles'}/${data.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ customMessage })
      });

      const result = await response.json();
      if (result.success) {
        setShareData(result.data);
        onShare && onShare(result.data);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const shareOnSocial = (platform) => {
    const text = customMessage || (type === 'project' ? t('shareDefaultProject') : t('shareDefaultBattle'));
    const url = shareUrl;

    let socialUrl = '';
    switch (platform) {
      case 'twitter':
        socialUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        socialUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        socialUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
    }

    window.open(socialUrl, '_blank', 'width=600,height=400');
  };

  const downloadFile = async () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${type === 'project' ? data.title : `battle-${data.id}`}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--overlay-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            {type === 'project' ? t('shareProject') : t('shareBattle')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>

        {/* Content Preview */}
        <div style={{
          background: 'var(--bg-hover)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.1rem',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            {data.title || data.challenge?.title}
          </h3>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            {data.description || data.challenge?.prompt}
          </p>
        </div>

        {/* Custom Message */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: '500',
            color: 'var(--text-primary)'
          }}>
            {t('customMessageOptional')}
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder={t('addPersonalMessage')}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              resize: 'vertical',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Share Actions */}
        <div style={{ marginBottom: '1.5rem' }}>
          {!shareUrl ? (
            <button
              onClick={handleShare}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              <Share2 size={16} style={{ marginRight: '0.5rem' }} />
              {t('generateShareLink')}
            </button>
          ) : (
            <div>
              {/* Share URL */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
                <button
                  onClick={() => copyToClipboard(shareUrl)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Copy size={16} />
                  {copied ? t('copied') : t('copy')}
                </button>
              </div>

              {/* Social Share Buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <button
                  onClick={() => shareOnSocial('twitter')}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: '#1DA1F2',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <Twitter size={16} />
                  Twitter
                </button>
                <button
                  onClick={() => shareOnSocial('linkedin')}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: '#0077B5',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <Linkedin size={16} />
                  LinkedIn
                </button>
                <button
                  onClick={() => shareOnSocial('facebook')}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: '#1877F2',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <Facebook size={16} />
                  Facebook
                </button>
                {downloadUrl && (
                  <button
                    onClick={downloadFile}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-mint)',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '0.9rem'
                    }}
                  >
                    <Download size={16} />
                    {t('download')}
                  </button>
                )}
              </div>

              {/* Analytics Button */}
              {shareData?.shareId && (
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem'
                  }}
                >
                  <BarChart3 size={16} />
                  {showAnalytics ? t('hide') : t('show')} {t('analytics')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Analytics Section */}
        {showAnalytics && shareData?.shareId && (
          <div style={{
            background: 'var(--bg-hover)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginTop: '1rem'
          }}>
            <h4 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              {t('shareAnalytics')}
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('totalClicks')}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-lavender)' }}>
                  {shareData.totalClicks || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('uniqueClicks')}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-mint)' }}>
                  {shareData.uniqueClicks || 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
