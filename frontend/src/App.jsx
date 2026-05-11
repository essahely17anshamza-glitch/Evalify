import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
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
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { Zap, LogOut, User, Sun, Moon } from 'lucide-react';

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
];

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [logoStatus, setLogoStatus] = useState('idle');
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const statusResetTimer = useRef(null);

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

  return (
    <div className="app-container">
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
          {NAV_LINKS.map(link => (
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
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Auth area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Theme toggle */}
          <button
            id="nav-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
              <button id="nav-submit-btn" className="btn-primary" onClick={() => setIsSubmitModalOpen(true)}
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.875rem' }}>
                + Submit
              </button>
              {/* Avatar menu */}
              <div style={{ position: 'relative' }}>
                <button id="nav-avatar-btn" onClick={() => setShowUserMenu(v => !v)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', color: '#fff',
                    border: '2px solid transparent',
                    boxShadow: showUserMenu ? '0 0 0 2px var(--accent-lavender)' : 'none',
                    transition: 'box-shadow 150ms',
                  }}>
                  {user.name?.[0]?.toUpperCase()}
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
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{user.role}</div>
                    </div>
                    <button id="nav-profile-link" onClick={() => { navigate(`/profile/${user.id}`); setShowUserMenu(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', background: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <User size={14} /> My Profile
                    </button>
                    <button id="nav-logout-btn" onClick={handleLogout}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.875rem', cursor: 'pointer', background: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button id="nav-signin-btn" className="btn-primary" onClick={() => setIsAuthModalOpen(true)}
              style={{ padding: '0.5rem 1.1rem', fontSize: '0.875rem' }}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Click-away for user menu */}
      {showUserMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowUserMenu(false)} />}

      {/* ── Main ── */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage onOpenAuth={() => setIsAuthModalOpen(true)} onOpenSubmit={() => setIsSubmitModalOpen(true)} user={user} />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/arena" element={<ArenaPage setLogoStatus={handleLogoStatusChange} />} />
          <Route path="/arena/battles/:id" element={<BattleDetailPage setLogoStatus={handleLogoStatusChange} />} />
          <Route path="/submissions/:id" element={<SubmissionDetailPage setLogoStatus={handleLogoStatusChange} />} />
          <Route path="/classroom" element={<ClassroomPage />} />
          <Route path="/classroom/:id" element={<ClassDetailPage />} />
          <Route path="/assignments/:id/submissions" element={<SubmissionsPage />} />
          <Route path="/submissions/:id" element={<SubmissionDetailPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>
      </main>

      {/* ── Modals ── */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <SubmitModal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} onSuccess={() => {}} onStatusChange={handleLogoStatusChange} />

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
