import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Star, Code, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { adminService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const ProjectCard = ({ project, index = 0, onDelete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const score = project.aiScore;
  const scoreColor = score >= 85 ? 'var(--accent-mint)' : score >= 65 ? 'var(--warning)' : score > 0 ? 'var(--danger)' : 'var(--text-secondary)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
    >
      <div onClick={() => navigate(`/projects/${project.id}`)} style={{ textDecoration: 'none', display: 'block' }}>
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', borderLeft: project.user?.role === 'TEACHER' ? '3px solid #FFD700' : undefined }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                {project.title}
              </h3>
              <Link to={`/profile/${project.user?.id}`} onClick={e => e.stopPropagation()}
                style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-lavender)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(124,111,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--accent-lavender)', flexShrink: 0 }}>
                  {project.user?.name?.[0]?.toUpperCase()}
                </div>
                {project.user?.name}
                {project.user?.role === 'TEACHER' && (
                  <span style={{
                    background: 'rgba(255,215,0,0.15)', color: '#FFD700', borderRadius: '4px',
                    padding: '0.1rem 0.35rem', fontSize: '0.65rem', fontWeight: 600, border: '1px solid rgba(255,215,0,0.3)',
                    marginLeft: '0.3rem'
                  }}>
                    {t('teacherLabel')}
                  </span>
                )}
              </Link>
            </div>
            {/* Score Circle / Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm(t('deleteProjectShortConfirm'))) {
                      try {
                        await adminService.deleteProject(project.id);
                        if (onDelete) onDelete(project.id);
                      } catch (err) {
                        alert(t('unableDeleteProject'));
                      }
                    }
                  }}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', padding: '0.4rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <div style={{
                minWidth: '44px', height: '44px', borderRadius: '50%',
                border: `2px solid ${scoreColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${scoreColor}12`,
                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem',
                color: scoreColor, flexShrink: 0,
              }}>
                {score ?? '—'}
              </div>
            </div>
          </div>

          {/* Description */}
          <p style={{
            color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            marginBottom: '1.25rem', flex: 1,
          }}>
            {project.description}
          </p>

          {/* Tags */}
          {project.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {project.tags.slice(0, 3).map(tag => (
                <span key={tag} style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', borderRadius: '999px', padding: '0.15rem 0.55rem', fontSize: '0.7rem' }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.9rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', background: 'var(--bg-hover)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
              <Code size={11} /> {project.language || t('code')}
            </div>
            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title={`${project._count?.ratings ?? 0} ${t('ratings')}`}>
                <Star size={13} fill={project.averageRating > 0 ? 'currentColor' : 'none'} style={{ color: project.averageRating > 0 ? 'var(--accent-warm)' : 'inherit' }} /> 
                {project.averageRating > 0 ? project.averageRating : '—'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MessageSquare size={13} /> {project._count?.comments ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
