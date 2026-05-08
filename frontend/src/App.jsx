import { useState } from 'react';
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
import { Zap, LogOut, User } from 'lucide-react';

const NAV_LINKS = [
  { to: '/community', label: 'Community' },
  { to: '/arena', label: 'Arena' },
  { to: '/classroom', label: 'Classroom' },
];

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

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
        background: 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        {/* Logo */}
        <Link to="/" id="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.25rem', textDecoration: 'none', color: 'var(--text-primary)' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-warm))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="#fff" />
          </div>
          Evalify
        </Link>

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
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/arena/battles/:id" element={<BattleDetailPage />} />
          <Route path="/classroom" element={<ClassroomPage />} />
          <Route path="/classroom/:id" element={<ClassDetailPage />} />
          <Route path="/assignments/:id/submissions" element={<SubmissionsPage />} />
          <Route path="/submissions/:id" element={<SubmissionDetailPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>
      </main>

      {/* ── Modals ── */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <SubmitModal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} onSuccess={() => {}} />

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
