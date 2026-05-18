import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Swords, Code, ArrowRight, Shield } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HomePage({ user, onOpenSubmit }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  if (!user) return null; // Handled by ProtectedRoute in App.jsx

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 0' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          {t('welcomeBackUser')} <span className="text-gradient">{user.name.split(' ')[0]}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          {t('dashboardSubtitle')}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(124,111,247,0.1)', color: 'var(--accent-lavender)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Code size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t('projects')}</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('shareLearn')}</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', flex: 1 }}>{t('projectsDesc')}</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary" onClick={onOpenSubmit} style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem' }}>{t('newSubmission')}</button>
            <button className="btn-secondary" onClick={() => navigate('/community')} style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem' }}>{t('browse')}</button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(0,196,154,0.1)', color: 'var(--accent-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t('classroom')}</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('academicWork')}</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', flex: 1 }}>{t('classroomDesc')}</p>
          <button className="btn-secondary" onClick={() => navigate('/classroom')} style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            {t('goToClassrooms')} <ArrowRight size={16} />
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(255,179,71,0.1)', color: '#FFB347', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Swords size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{t('arena')}</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('competeClimb')}</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', flex: 1 }}>{t('arenaDesc')}</p>
          <button className="btn-secondary" onClick={() => navigate('/arena')} style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            {t('enterArena')} <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>

      <section className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          <Shield size={20} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{t('internalNotice')}</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t('internalNoticeText')}
        </p>
      </section>
    </div>
  );
}
