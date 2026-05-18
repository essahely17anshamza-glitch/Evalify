import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../hooks/useTheme';
import {
  LayoutDashboard, Users, FolderOpen, MessageSquare,
  GraduationCap, Swords, Shield, LogOut, ArrowLeft,
  Sun, Moon, ChevronRight, Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview',   icon: LayoutDashboard, labelKey: 'overview' },
  { id: 'users',      icon: Users,           labelKey: 'userManagement' },
  { id: 'projects',   icon: FolderOpen,      labelKey: 'totalProjects' },
  { id: 'comments',   icon: MessageSquare,   labelKey: 'comments' },
  { id: 'classes',    icon: GraduationCap,   labelKey: 'totalClasses' },
  { id: 'arena',      icon: Swords,          labelKey: 'arenaSection' },
  { id: 'requests',   icon: Shield,          labelKey: 'requests' },
];

export default function AdminLayout({ children, activeSection, onSectionChange, pendingCount = 0 }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? '64px' : '240px',
        transition: 'width 250ms cubic-bezier(0.4,0,0.2,1)',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* Logo / Header */}
        <div style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 20px' : '0 20px',
          borderBottom: '1px solid var(--border-color)',
          gap: '0.75rem',
          flexShrink: 0,
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #7c6ff7, #00c49a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Shield size={16} color="#fff" />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', lineHeight: 1.1 }}>Control Room</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent-lavender)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('adminPanel')}</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badge = item.id === 'requests' && pendingCount > 0 ? pendingCount : null;

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                title={collapsed ? t(item.labelKey) : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: collapsed ? '0.65rem 20px' : '0.65rem 20px',
                  background: isActive ? 'rgba(124,111,247,0.12)' : 'transparent',
                  border: 'none',
                  borderLeft: `2px solid ${isActive ? 'var(--accent-lavender)' : 'transparent'}`,
                  color: isActive ? 'var(--accent-lavender)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 150ms',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textAlign: 'left',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <>
                    <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
                    {badge && (
                      <span style={{
                        background: 'var(--accent-lavender)', color: '#fff', fontSize: '0.65rem',
                        fontWeight: 800, padding: '1px 6px', borderRadius: '10px',
                      }}>{badge}</span>
                    )}
                  </>
                )}
                {collapsed && badge && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '6px',
                    background: '#7c6ff7', color: '#fff', fontSize: '0.55rem',
                    fontWeight: 800, width: '14px', height: '14px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: User + Collapse */}
        <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.75rem 12px', flexShrink: 0 }}>
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end',
              background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.4rem',
              marginBottom: '0.5rem', borderRadius: '6px',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <ChevronRight size={16} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 250ms' }} />
          </button>

          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.5rem', borderRadius: '8px', background: 'var(--bg-hover)' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-lavender), var(--accent-mint))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.8rem', color: '#fff', flexShrink: 0,
              }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-lavender)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('admin')}</div>
              </div>
              <button onClick={handleLogout} title={t('signOut')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                <LogOut size={14} />
              </button>
            </div>
          )}

          {collapsed && (
            <button onClick={handleLogout} title={t('signOut')}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}>
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <header style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          flexShrink: 0,
        }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none',
            transition: 'color 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ArrowLeft size={16} />
            {t('backToEvalify')}
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Breadcrumb */}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {t('admin')} / <span style={{ color: 'var(--accent-lavender)' }}>{t(activeSection)}</span>
            </span>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: '32px', height: '32px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-hover)', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
