import { useState, useEffect, useCallback } from 'react';
import api, { adminService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import AdminLayout from '../components/AdminLayout';
import {
  Users, Activity, Flag, Loader, Search,
  RefreshCw, Trash2, Shield, BarChart2, FolderOpen,
  MessageSquare, GraduationCap, Swords, AlertTriangle
} from 'lucide-react';

/* ─── Admin colour tokens (theme-aware) ─────────────────────────── */
const C = {
  bg:       'var(--bg)',
  surface:  'var(--bg-card)',
  border:   'var(--border-color)',
  text:     'var(--text-primary)',
  muted:    'var(--text-secondary)',
  accent:   'var(--accent-lavender)',
  mint:     'var(--accent-mint)',
  danger:   'var(--danger)',
  warning:  'var(--warning)',
};

/* ─── Shared table styles ──────────────────────────────────────── */
const TH = { padding: '0.75rem 1rem', color: C.muted, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', borderBottom: `1px solid ${C.border}`, background: 'var(--bg-hover)', whiteSpace: 'nowrap' };
const TD = { padding: '0.85rem 1rem', borderBottom: `1px solid ${C.border}`, fontSize: '0.875rem', color: C.text };

/* ─── Stat card ────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
      <Icon size={22} />
    </div>
    <div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: C.text, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.78rem', color: C.muted, marginTop: '0.25rem' }}>{label}</div>
    </div>
  </div>
);

/* ─── Section wrapper ──────────────────────────────────────────── */
const Section = ({ title, action, children }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
    {title && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: C.text }}>{title}</span>
        {action}
      </div>
    )}
    {children}
  </div>
);

/* ─── Badge ────────────────────────────────────────────────────── */
const Badge = ({ label, color }) => (
  <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`, borderRadius: '6px', padding: '0.15rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}>
    {label}
  </span>
);

/* ─── Role colour map ──────────────────────────────────────────── */
const roleColor = r => ({ ADMIN: C.danger, TEACHER: C.mint, STUDENT: C.muted }[r] || C.muted);

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const VALID_SECTIONS = ['overview', 'users', 'projects', 'requests', 'comments', 'classes', 'arena'];
  const initialSection = VALID_SECTIONS.includes(searchParams.get('section'))
    ? searchParams.get('section')
    : 'overview';
  const [section, setSection]         = useState(initialSection);

  // Keep section state in sync with URL ?section= param so admin notification links work
  useEffect(() => {
    const urlSection = searchParams.get('section');
    if (urlSection && VALID_SECTIONS.includes(urlSection) && urlSection !== section) {
      setSection(urlSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const changeSection = (next) => {
    setSection(next);
    if (next === 'overview') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ section: next }, { replace: true });
    }
  };
  const [metrics, setMetrics]         = useState(null);
  const [usersList, setUsersList]     = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [projects, setProjects]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [reportedComments, setReportedComments] = useState([]);
  const [allCommentsData, setAllCommentsData] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [allChallenges, setAllChallenges] = useState([]);
  const [allBattles, setAllBattles] = useState([]);
  const [commentsTab, setCommentsTab] = useState('reported');
  const [arenaTab, setArenaTab] = useState('challenges');

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, uRes, rRes, pRes] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/admin/users'),
        api.get('/admin/role-requests'),
        api.get('/community?limit=100').catch(() => ({ data: { data: [] } })),
      ]);
      setMetrics(mRes.data.data);
      setUsersList(uRes.data.data);
      setRoleRequests(rRes.data.data);
      setProjects(pRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') navigate('/');
    else fetchData();
  }, [user, navigate, fetchData]);

  /* ── actions ── */
  const updateRole = async (userId, role) => {
    if (!window.confirm(`${t('confirmRoleUpdate')} ${role}?`)) return;
    await api.patch(`/admin/users/${userId}/role`, { role });
    fetchData();
  };

  const deleteUser = async (userId) => {
    if (!window.confirm(t('confirmUserDelete'))) return;
    await api.delete(`/admin/users/${userId}`);
    fetchData();
  };

  const handleRoleRequest = async (id, status) => {
    if (!window.confirm(`${status === 'APPROVED' ? t('approve') : t('reject')} this request?`)) return;
    await api.patch(`/admin/role-requests/${id}`, { status });
    fetchData();
  };

  const deleteProject = async (id) => {
    if (!window.confirm(t('deleteProjectPermanently'))) return;
    try { await adminService.deleteProject(id); setProjects(ps => ps.filter(p => p.id !== id)); }
    catch (e) { alert('Failed to delete project'); }
  };

  /* ── Comments moderation ── */
  const fetchReportedComments = async () => {
    try {
      const res = await adminService.getReportedComments();
      setReportedComments(res.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchAllComments = async () => {
    try {
      const res = await adminService.getAllComments();
      setAllCommentsData(res.data?.comments || []);
    } catch (e) { console.error(e); }
  };

  const dismissReport = async (commentId) => {
    if (!window.confirm('Dismiss this report?')) return;
    try {
      await adminService.dismissReport(commentId);
      fetchReportedComments();
      fetchAllComments();
    } catch (e) { alert('Failed to dismiss report'); }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm(t('deleteCommentConfirm'))) return;
    try {
      await adminService.deleteComment(commentId);
      fetchReportedComments();
      fetchAllComments();
    } catch (e) { alert(t('failedDeleteComment')); }
  };

  /* ── Classes management ── */
  const fetchAllClasses = async () => {
    try {
      const res = await adminService.getAllClasses();
      setAllClasses(res.data || []);
    } catch (e) { console.error(e); }
  };

  const deleteClass = async (classId) => {
    if (!window.confirm('Delete this class? All assignments and enrollments will be lost.')) return;
    try {
      await adminService.deleteClass(classId);
      setAllClasses(prev => prev.filter(c => c.id !== classId));
    } catch (e) { alert('Failed to delete class'); }
  };

  /* ── Arena management ── */
  const fetchAllChallenges = async () => {
    try {
      const res = await adminService.getAllChallenges();
      setAllChallenges(res.data || []);
    } catch (e) { console.error(e); }
  };

  const deleteChallenge = async (id) => {
    if (!window.confirm('Delete this challenge and all its battles?')) return;
    try {
      await adminService.deleteChallenge(id);
      setAllChallenges(prev => prev.filter(c => c.id !== id));
    } catch (e) { alert('Failed to delete challenge'); }
  };

  const fetchAllBattles = async () => {
    try {
      const res = await adminService.getAllBattles();
      setAllBattles(res.data || []);
    } catch (e) { console.error(e); }
  };

  const deleteBattle = async (id) => {
    if (!window.confirm('Delete this battle?')) return;
    try {
      await adminService.deleteBattle(id);
      setAllBattles(prev => prev.filter(b => b.id !== id));
    } catch (e) { alert('Failed to delete battle'); }
  };

  // Load section-specific data when switching sections
  useEffect(() => {
    if (section === 'comments') {
      fetchReportedComments();
      fetchAllComments();
    } else if (section === 'classes') {
      fetchAllClasses();
    } else if (section === 'arena') {
      fetchAllChallenges();
      fetchAllBattles();
    }
  }, [section]);

  if (!user || user.role !== 'ADMIN') return null;

  const pendingCount = roleRequests.filter(r => r.status === 'PENDING').length;
  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Refresh button ── */
  const RefreshBtn = (
    <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.muted, borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>
      <RefreshCw size={13} /> {t('refresh')}
    </button>
  );

  /* ══════════════════════════ SECTIONS ══════════════════════════ */

  /* Overview */
  const Overview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text, marginBottom: '0.25rem' }}>{t('overview')}</h1>
        <p style={{ color: C.muted, fontSize: '0.875rem' }}>{t('adminSubtitle')}</p>
      </div>
      {loading ? <div style={{ color: C.muted, padding: '2rem 0', textAlign: 'center' }}><Loader size={24} style={{ animation: 'spin 1s linear infinite' }} /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard label={t('totalUsers')}    value={metrics?.userCount}       icon={Users}       color={C.accent} />
          <StatCard label={t('totalProjects')} value={metrics?.projectCount}    icon={FolderOpen}  color={C.mint} />
          <StatCard label={t('totalClasses')}  value={metrics?.classCount || 0} icon={GraduationCap} color={C.warning} />
          <StatCard label={t('totalBattles')}  value={metrics?.battleCount}     icon={Swords}      color={C.danger} />
        </div>
      )}

      {/* Recent activity — pending requests teaser */}
      {pendingCount > 0 && (
        <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}30`, borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: C.text }}>
            <Shield size={18} color={C.accent} />
            <span style={{ fontWeight: 600 }}>{pendingCount} {t('pendingTeacherRequests')}</span>
          </div>
          <button onClick={() => changeSection('requests')} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            {t('review')} →
          </button>
        </div>
      )}
    </div>
  );

  /* Users */
  const UsersSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text }}>{t('userManagement')}</h1>
        {RefreshBtn}
      </div>
      <div style={{ position: 'relative', maxWidth: '360px' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
        <input
          className="input-field"
          placeholder={t('searchUsers')}
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.25rem', background: C.surface, border: `1px solid ${C.border}`, color: C.text, width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      <Section>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>User</th>
              <th style={TH}>{t('role')}</th>
              <th style={TH}>{t('joined')}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ ...TD, textAlign: 'center', padding: '3rem', color: C.muted }}>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              </td></tr>
            ) : filteredUsers.map(u => (
              <tr key={u.id} style={{ transition: 'background 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={TD}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, ${C.mint})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.8rem', flexShrink: 0 }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <Link to={`/profile/${u.id}`} style={{ fontWeight: 600, color: C.text, textDecoration: 'none', fontSize: '0.875rem' }}>{u.name}</Link>
                      <div style={{ fontSize: '0.75rem', color: C.muted }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={TD}>
                  <select
                    value={u.role}
                    onChange={e => updateRole(u.id, e.target.value)}
                    disabled={u.id === user.id}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: roleColor(u.role), borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', cursor: u.id === user.id ? 'not-allowed' : 'pointer' }}
                  >
                    <option value="STUDENT">{t('student')}</option>
                    <option value="TEACHER">{t('teacher')}</option>
                    <option value="ADMIN">{t('admin')}</option>
                  </select>
                </td>
                <td style={{ ...TD, color: C.muted, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  <button
                    onClick={() => deleteUser(u.id)}
                    disabled={u.id === user.id}
                    style={{ background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)`, color: u.id === user.id ? C.muted : C.danger, borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: u.id === user.id ? 'not-allowed' : 'pointer', opacity: u.id === user.id ? 0.4 : 1 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredUsers.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>
            {t('noUsersFound')} "{search}"
          </div>
        )}
      </Section>
    </div>
  );

  /* Projects */
  const ProjectsSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text }}>{t('totalProjects')}</h1>
        {RefreshBtn}
      </div>
      <Section>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>{t('title')}</th>
              <th style={TH}>{t('author')}</th>
              <th style={TH}>{t('language')}</th>
              <th style={TH}>{t('aiScore')}</th>
              <th style={TH}>{t('date')}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '3rem', color: C.muted }}>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              </td></tr>
            ) : projects.slice(0, 50).map(p => (
              <tr key={p.id} style={{ transition: 'background 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={TD}>
                  <Link to={`/projects/${p.id}`} style={{ color: C.accent, textDecoration: 'none', fontWeight: 500 }}>{p.title}</Link>
                </td>
                <td style={{ ...TD, color: C.muted }}>{p.user?.name}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: C.mint }}>{p.language || '—'}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.aiScore >= 80 ? C.mint : p.aiScore >= 60 ? C.warning : C.muted }}>
                  {p.aiScore ?? '—'}
                </td>
                <td style={{ ...TD, color: C.muted, fontSize: '0.78rem' }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  <button
                    onClick={() => deleteProject(p.id)}
                    style={{ background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)`, color: C.danger, borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && projects.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: C.muted }}>{t('noProjectsYet')}</div>
        )}
      </Section>
    </div>
  );

  /* Requests */
  const RequestsSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text }}>{t('pendingRequests')}</h1>
        {RefreshBtn}
      </div>
      <Section>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>{t('user')}</th>
              <th style={TH}>{t('email')}</th>
              <th style={TH}>{t('proof')}</th>
              <th style={TH}>{t('status')}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {roleRequests.length === 0 ? (
              <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', padding: '3rem', color: C.muted }}>{t('noPendingRequests')}</td></tr>
            ) : roleRequests.map(req => (
              <tr key={req.id} style={{ transition: 'background 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...TD, fontWeight: 600 }}>{req.user?.name}</td>
                <td style={{ ...TD, color: C.muted, fontSize: '0.8rem' }}>{req.user?.email}</td>
                <td style={{ ...TD, maxWidth: '220px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.proof}
                  </div>
                </td>
                <td style={TD}>
                  <Badge
                    label={req.status}
                    color={req.status === 'PENDING' ? C.warning : req.status === 'APPROVED' ? C.mint : C.danger}
                  />
                </td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  {req.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleRoleRequest(req.id, 'APPROVED')}
                        style={{ background: `${C.mint}12`, color: C.mint, border: `1px solid ${C.mint}30`, borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                        {t('approve')}
                      </button>
                      <button onClick={() => handleRoleRequest(req.id, 'REJECTED')}
                        style={{ background: `${C.danger}12`, color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                        {t('reject')}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );

  /* Comments Moderation */
  const CommentsSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text }}>{t('commentsModeration')}</h1>
        {RefreshBtn}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button onClick={() => setCommentsTab('reported')}
          style={{
            padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.85rem',
            background: commentsTab === 'reported' ? C.accent : 'var(--bg-hover)',
            color: commentsTab === 'reported' ? '#fff' : C.muted,
          }}>
          {t('reportedComments')} ({reportedComments.length})
        </button>
        <button onClick={() => setCommentsTab('all')}
          style={{
            padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.85rem',
            background: commentsTab === 'all' ? C.accent : 'var(--bg-hover)',
            color: commentsTab === 'all' ? '#fff' : C.muted,
          }}>
          {t('allComments')}
        </button>
      </div>

      {commentsTab === 'reported' ? (
        <Section>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>{t('author')}</th>
                <th style={TH}>{t('content', 'Comment')}</th>
                <th style={TH}>{t('reportCount')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reportedComments.length === 0 ? (
                <tr><td colSpan={4} style={{ ...TD, textAlign: 'center', padding: '3rem', color: C.muted }}>{t('noReportedComments')}</td></tr>
              ) : reportedComments.map(c => (
                <tr key={c.id} style={{ transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{c.user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: C.muted }}>{c.user?.email}</div>
                  </td>
                  <td style={{ ...TD, maxWidth: '300px' }}>
                    <div style={{ color: C.text, marginBottom: '0.25rem' }}>{c.content?.substring(0, 120)}{c.content?.length > 120 ? '...' : ''}</div>
                    {c.reports?.length > 0 && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {c.reports.map(r => (
                          <div key={r.id} style={{ background: `${C.warning}10`, border: `1px solid ${C.warning}20`, borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 600, color: C.warning }}>{r.user?.name}</span>
                            <span style={{ color: C.muted, marginLeft: '0.5rem' }}>{r.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ ...TD, color: C.warning, fontWeight: 600 }}>
                    {c.reports?.length || 0} {t('reportCount')}
                  </td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => dismissReport(c.id)}
                        style={{ background: `${C.mint}12`, color: C.mint, border: `1px solid ${C.mint}30`, borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                        {t('dismiss')}
                      </button>
                      <button onClick={() => deleteComment(c.id)}
                        style={{ background: `${C.danger}12`, color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : (
        <Section>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>{t('author')}</th>
                <th style={TH}>Comment</th>
                <th style={TH}>{t('projectTitle')}</th>
                <th style={TH}>{t('reportCount')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {allCommentsData.length === 0 ? (
                <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', padding: '3rem', color: C.muted }}>{t('noCommentsFound')}</td></tr>
              ) : allCommentsData.map(c => (
                <tr key={c.id} style={{ transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={TD}>
                    <div style={{ fontWeight: 600 }}>{c.user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: C.muted }}>{c.user?.email}</div>
                  </td>
                  <td style={{ ...TD, maxWidth: '300px', color: C.muted, fontSize: '0.85rem' }}>
                    {c.content?.substring(0, 150)}{c.content?.length > 150 ? '...' : ''}
                  </td>
                  <td style={{ ...TD, color: C.accent, fontSize: '0.85rem' }}>{c.project?.title || '—'}</td>
                  <td style={{ ...TD, color: c.isReported ? C.warning : C.muted, fontWeight: 600 }}>
                    {c._count?.reports || 0}
                  </td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <button onClick={() => deleteComment(c.id)}
                      style={{ background: `${C.danger}12`, color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );

  /* Classes Management */
  const ClassesSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text }}>{t('classesManagement')}</h1>
        {RefreshBtn}
      </div>
      <Section>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>{t('className2')}</th>
              <th style={TH}>{t('teacher2')}</th>
              <th style={TH}>{t('enrolled')}</th>
              <th style={TH}>{t('assignments')}</th>
              <th style={TH}>{t('inviteCode')}</th>
              <th style={{ ...TH, textAlign: 'right' }}>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {allClasses.length === 0 ? (
              <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '3rem', color: C.muted }}>{t('noClassesFound')}</td></tr>
            ) : allClasses.map(cls => (
              <tr key={cls.id} style={{ transition: 'background 150ms' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...TD, fontWeight: 600 }}>{cls.name}</td>
                <td style={{ ...TD, color: C.muted }}>{cls.teacher?.name || '—'}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{cls._count?.enrollments || 0}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{cls._count?.assignments || 0}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', color: C.accent }}>{cls.inviteCode}</td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  <button onClick={() => deleteClass(cls.id)}
                    style={{ background: `${C.danger}12`, color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );

  /* Arena Management */
  const ArenaSection = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text }}>{t('arenaManagement')}</h1>
        {RefreshBtn}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button onClick={() => setArenaTab('challenges')}
          style={{
            padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.85rem',
            background: arenaTab === 'challenges' ? C.accent : 'var(--bg-hover)',
            color: arenaTab === 'challenges' ? '#fff' : C.muted,
          }}>
          {t('challenges2')} ({allChallenges.length})
        </button>
        <button onClick={() => setArenaTab('battles')}
          style={{
            padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.85rem',
            background: arenaTab === 'battles' ? C.accent : 'var(--bg-hover)',
            color: arenaTab === 'battles' ? '#fff' : C.muted,
          }}>
          {t('battles2')} ({allBattles.length})
        </button>
      </div>

      {arenaTab === 'challenges' ? (
        <Section>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>{t('challengeTitle')}</th>
                <th style={TH}>{t('challengeType')}</th>
                <th style={TH}>{t('difficulty')}</th>
                <th style={TH}>{t('author')}</th>
                <th style={TH}>{t('battles2')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {allChallenges.length === 0 ? (
                <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '3rem', color: C.muted }}>{t('noChallengesFound')}</td></tr>
              ) : allChallenges.map(ch => (
                <tr key={ch.id} style={{ transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...TD, fontWeight: 600 }}>{ch.title}</td>
                  <td style={{ ...TD }}>
                    <Badge label={ch.type} color={ch.type === 'OFFICIAL' ? C.accent : C.mint} />
                  </td>
                  <td style={{ ...TD, color: C.muted }}>{ch.difficulty}</td>
                  <td style={{ ...TD, color: C.muted }}>{ch.creator?.name || '—'}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{ch._count?.battles || 0}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <button onClick={() => deleteChallenge(ch.id)}
                      style={{ background: `${C.danger}12`, color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : (
        <Section>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>{t('challengeLabel')}</th>
                <th style={TH}>{t('playerA2')}</th>
                <th style={TH}>{t('playerB2')}</th>
                <th style={TH}>{t('winner')}</th>
                <th style={TH}>{t('status')}</th>
                <th style={{ ...TH, textAlign: 'right' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {allBattles.length === 0 ? (
                <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '3rem', color: C.muted }}>{t('noBattlesFound')}</td></tr>
              ) : allBattles.map(b => (
                <tr key={b.id} style={{ transition: 'background 150ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...TD, color: C.accent }}>{b.challenge?.title || '—'}</td>
                  <td style={{ ...TD }}>{b.playerA?.name}</td>
                  <td style={{ ...TD }}>{b.playerB?.name}</td>
                  <td style={{ ...TD, color: C.mint, fontWeight: 600 }}>{b.winner?.name || '—'}</td>
                  <td style={{ ...TD }}>
                    <Badge label={b.status}
                      color={b.status === 'COMPLETE' ? C.mint : b.status === 'ACTIVE' ? C.accent : C.muted} />
                  </td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <button onClick={() => deleteBattle(b.id)}
                      style={{ background: `${C.danger}12`, color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );

  /* Placeholder for sections not yet implemented */
  const Placeholder = ({ title }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text }}>{title}</h1>
      <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: '10px', padding: '4rem', textAlign: 'center', color: C.muted }}>
        <AlertTriangle size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
        <p>{t('comingSoon')}</p>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (section) {
      case 'overview':  return <Overview />;
      case 'users':     return <UsersSection />;
      case 'projects':  return <ProjectsSection />;
      case 'requests':  return <RequestsSection />;
      case 'comments':  return <CommentsSection />;
      case 'classes':   return <ClassesSection />;
      case 'arena':     return <ArenaSection />;
      default:          return <Placeholder title={t('settings')} />;
    }
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <AdminLayout activeSection={section} onSectionChange={changeSection} pendingCount={pendingCount}>
        {renderSection()}
      </AdminLayout>
    </>
  );
}
