import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import AuthModal from './components/AuthModal';
import SubmitModal from './components/SubmitModal';
import HomePage from './pages/HomePage';
import CommunityPage from './pages/CommunityPage';
import ClassroomPage from './pages/ClassroomPage';
import ClassDetailPage from './pages/ClassDetailPage';
import SubmissionsPage from './pages/SubmissionsPage';
import SubmissionDetailPage from './pages/SubmissionDetailPage';
import ArenaPage from './pages/ArenaPage';
import BattleDetailPage from './pages/BattleDetailPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useLanguage } from './context/LanguageContext';
import useSocket from './hooks/useSocket';
import { Zap, LogOut, User, Sun, Moon, Shield, Bell, Loader, Languages } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-lavender)' }} /></div>;
  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', textAlign: 'center' }}>
        <Shield size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
        <h2 style={{ marginBottom: '1rem' }}>{t('authRequired')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>
          {t('authRequiredText')}
        </p>
        <button id="auth-required-signin" className="btn-primary" onClick={() => document.getElementById('nav-signin-btn')?.click()} style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
          {t('signIn')}
        </button>
      </div>
    );
  }
  return children;
};

const LOGO_STATUS_ICONS = {
  analyzing: (
    <svg className="logo-status-icon logo-status-icon--analyzing" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="6.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="8 6" transform="rotate(-45 10 10)" />
    </svg>
  ),
  success: (
    <svg className="logo-status-icon logo-status-icon--success" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1.6l2.6 5.3 5.9.9-4.3 4.2 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.5 7.8l5.9-.9L10 1.6z" />
    </svg>
  ),
  lowScore: (
    <svg className="logo-status-icon logo-status-icon--warning" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.5L2.2 17.1h15.6L10 2.5zm0 10.6a.9.9 0 100 1.8.9.9 0 000-1.8zm.9-6.2h-1.8v4.4h1.8V6.9z" />
    </svg>
  ),
  battle: (
    <svg className="logo-status-icon logo-status-icon--bolt" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M8.5 1.5L3 10h4.5L6 18.5 15 8.5H10.5L12 1.5z" />
    </svg>
  ),
  victory: (
    <svg className="logo-status-icon logo-status-icon--trophy" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 3h10v2c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V3zm2 0V2h6v1h3v2.5c0 2.2-1.8 4-4 4-.1 1.7-1.5 3-3.2 3.2V17h3v1H7v-1h3v-2.3C7.5 13.5 6.1 12.2 6 10.5c-2.2-.1-4-1.8-4-4V3h3z" />
    </svg>
  ),
  defeat: (
    <svg className="logo-status-icon logo-status-icon--strong" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 4h8a1 1 0 011 1v8a1 1 0 01-1 1h-2v2H8v-2H6a1 1 0 01-1-1V5a1 1 0 011-1zm8 1H6v8h2v2h4v-2h2V5z" />
    </svg>
  ),
  graded: (
    <svg className="logo-status-icon logo-status-icon--check" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7.5 13.5L4.5 10.5 3 12l4.5 4.5L17 7l-1.5-1.5L7.5 13.5z" />
    </svg>
  ),
  achievement: (
    <svg className="logo-status-icon logo-status-icon--badge" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.5l2.5 5.5L19 8l-4.5 4.4 1 6.1L10 15.5 4.5 18.4l1-6.1L1 8l6.5-.1L10 2.5z" />
    </svg>
  ),
  leaderboard: (
    <svg className="logo-status-icon logo-status-icon--crown" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2 5l2.5 6 3-4 3 4 3-4 2.5 6H2L2 5z" />
    </svg>
  ),
};

function LiveLogo({ status = 'idle' }) {
  const [hovered, setHovered] = useState(false);
  const effectiveStatus = hovered && status === 'idle' ? 'hover' : status;
  const icon = LOGO_STATUS_ICONS[effectiveStatus];

  return (
    <Link
      to="/"
      id="nav-logo"
      className={`logo-container status-${effectiveStatus}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="logo-text-wrapper">
        <span className="logo-bracket">&lt;</span>
        <span className="logo-main">Evalify</span>
        <span className="logo-bracket">/&gt;</span>
      </div>
      {icon && effectiveStatus !== 'hover' && (
        <span className="logo-status-indicator animate-fade-in-up">
          {icon}
        </span>
      )}
    </Link>
  );
}

const NAV_LINKS = [
  { to: '/community', label: 'Community' },
  { to: '/arena', label: 'Arena' },
  { to: '/classroom', label: 'Classroom' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [logoStatus, setLogoStatus] = useState('idle');
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, t, toggleLanguage } = useLanguage();
  const { notifications, unreadCount, markNotificationRead, clearNotifications } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const statusResetTimer = useRef(null);

  // Admin routes bypass the normal layout entirely
  const isAdminRoute = location.pathname.startsWith('/admin');

  const handleLogoStatusChange = (nextStatus) => {
    if (statusResetTimer.current) {
      clearTimeout(statusResetTimer.current);
      statusResetTimer.current = null;
    }

    setLogoStatus(nextStatus || 'idle');

    if (nextStatus && nextStatus !== 'idle' && nextStatus !== 'hover') {
      statusResetTimer.current = setTimeout(() => setLogoStatus('idle'), 3200);
    }
  };

  useEffect(() => {
    return () => {
      if (statusResetTimer.current) clearTimeout(statusResetTimer.current);
    };
  }, []);

  const handleLogout = () => { logout(); setShowUserMenu(false); };

  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="app-container">
      {/* ── Admin routes: fullscreen, no navbar ── */}
      {isAdminRoute ? (
        <Routes>
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        </Routes>
      ) : (
      <>
      {/* ── Navbar ── */}
      <nav style={{
        padding: '0 2rem',
        height: '64px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        {/* Logo */}
        <LiveLogo status={logoStatus} />

        {/* Nav links */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {user && NAV_LINKS.filter(link => {
            if (user.role === 'ADMIN' && ['Arena', 'Classroom'].includes(link.label)) return false;
            return true;
          }).map(link => (
            <NavLink key={link.to} to={link.to} id={`nav-${link.label.toLowerCase()}`}
              style={({ isActive }) => ({
                padding: '0.5rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: isActive ? 'var(--accent-lavender)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(124,111,247,0.1)' : 'transparent',
                transition: 'all 150ms',
                textDecoration: 'none',
              })}>
              {t(link.label.toLowerCase())}
            </NavLink>
          ))}
        </div>

        {/* Auth area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Language toggle */}
          <button
            className="icon-btn"
            onClick={toggleLanguage}
            title={lang === 'en' ? t('switchFr') : t('switchEn')}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)', cursor: 'pointer',
              position: 'relative'
            }}
          >
            <Languages size={18} />
            <span style={{ fontSize: '0.6rem', fontWeight: 800, position: 'absolute', top: -4, right: -4, background: 'var(--accent-lavender)', color: 'white', padding: '1px 3px', borderRadius: '4px', textTransform: 'uppercase' }}>{lang}</span>
          </button>

          {/* Theme toggle */}
          <button
            id="nav-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('switchLight') : t('switchDark')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'color 200ms ease, background 200ms ease, transform 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-lavender)'; e.currentTarget.style.transform = 'rotate(20deg) scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.transform = 'rotate(0deg) scale(1)'; }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {loading ? (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', animation: 'pulse 1.5s infinite' }} />
          ) : user ? (
            <>
              {/* Admin shield icon — only for admins, in main navbar */}
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => navigate('/admin')}
                  title={t('adminDashboard')}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,196,154,0.1)', border: '1px solid rgba(0,196,154,0.3)',
                    color: 'var(--accent-mint)', cursor: 'pointer', flexShrink: 0,
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,196,154,0.2)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,196,154,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Shield size={16} />
                </button>
              )}
              {/* Notifications */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowNotifications(v => !v)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                    background: 'var(--bg-hover)', border: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                    transition: 'color 200ms ease, background 200ms ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-lavender)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)', width: '320px', maxHeight: '400px', overflowY: 'auto',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.5)', zIndex: 200, padding: '1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{t('notifications')}</h4>
                      {notifications.length > 0 && (
                        <button onClick={clearNotifications} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>{t('clearAll')}</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>{t('noNotifications')}</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {notifications.map(n => (
                          <div key={n.id} onClick={() => {
                            markNotificationRead(n.id);
                            if (n.link) {
                              navigate(n.link);
                            } else if (n.type === 'battleInvite' || n.type === 'battle') {
                              navigate(`/arena/battles/${n.data?.battleId || n.data?.id}`);
                            } else if (n.type === 'comment' && n.data?.projectId) {
                              navigate(`/projects/${n.data.projectId}`);
                            }
                            setShowNotifications(false);
                          }} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: n.read ? 'transparent' : 'rgba(124,111,247,0.05)', border: `1px solid ${n.read ? 'transparent' : 'rgba(124,111,247,0.2)'}`, cursor: 'pointer' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem', color: n.read ? 'var(--text-primary)' : 'var(--accent-lavender)' }}>{n.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.message}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{new Date(n.timestamp).toLocaleTimeString(lang === 'en' ? 'en-US' : 'fr-FR')}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {user.role !== 'ADMIN' && (
                <button id="nav-submit-btn" className="btn-primary" onClick={() => setIsSubmitModalOpen(true)}
                  style={{ padding: '0.5rem 1.1rem', fontSize: '0.875rem' }}>
                  {t('addProject')}
                </button>
              )}
              {/* Avatar menu */}
              <div style={{ position: 'relative' }}>
                <button id="nav-avatar-btn" onClick={() => setShowUserMenu(v => !v)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', color: '#fff',
                    border: user.role === 'TEACHER' ? '2px solid #FFD700' : '2px solid transparent',
                    boxShadow: showUserMenu ? '0 0 0 2px var(--accent-lavender)' : 'none',
                    transition: 'box-shadow 150ms',
                    position: 'relative'
                  }}>
                  {user.name?.[0]?.toUpperCase()}
                  {user.role === 'ADMIN' && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--danger)', color: 'white', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                      <Shield size={10} />
                    </div>
                  )}
                </button>
                {showUserMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)', padding: '0.5rem', minWidth: '180px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.5)', zIndex: 200,
                  }}>
                    <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{t(user.role?.toLowerCase())}</div>
                    </div>
                    <button id="nav-profile-link" onClick={() => { navigate(`/profile/${user.id}`); setShowUserMenu(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', background: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <User size={14} /> {t('myProfile')}
                    </button>
                    <button id="nav-logout-btn" onClick={handleLogout}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.875rem', cursor: 'pointer', background: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <LogOut size={14} /> {t('signOut')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button id="nav-signin-btn" className="btn-primary" onClick={() => setIsAuthModalOpen(true)}
              style={{ padding: '0.5rem 1.1rem', fontSize: '0.875rem' }}>
              {t('signIn')}
            </button>
          )}
        </div>
      </nav>

      {/* Click-away for user menu and notifications */}
      {(showUserMenu || showNotifications) && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => { setShowUserMenu(false); setShowNotifications(false); }} />}

      {/* ── Main ── */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={user ? <HomePage user={user} onOpenSubmit={() => setIsSubmitModalOpen(true)} /> : <ProtectedRoute />} />
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
          <Route path="/arena" element={<ProtectedRoute><ArenaPage setLogoStatus={handleLogoStatusChange} /></ProtectedRoute>} />
          <Route path="/arena/battles/:id" element={<ProtectedRoute><BattleDetailPage setLogoStatus={handleLogoStatusChange} /></ProtectedRoute>} />
          <Route path="/submissions/:id" element={<ProtectedRoute><SubmissionDetailPage setLogoStatus={handleLogoStatusChange} /></ProtectedRoute>} />
          <Route path="/classroom" element={<ProtectedRoute><ClassroomPage /></ProtectedRoute>} />
          <Route path="/classroom/:id" element={<ProtectedRoute><ClassDetailPage /></ProtectedRoute>} />
          <Route path="/assignments/:id/submissions" element={<ProtectedRoute><SubmissionsPage /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
        </Routes>
      </main>

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <SubmitModal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} onSuccess={() => {}} onStatusChange={handleLogoStatusChange} />
      </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default App;
