import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Swords, BookOpen, Users, ArrowRight, Code, Star, Award, ChevronRight } from 'lucide-react';

const Counter = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const observed = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !observed.current) {
        observed.current = true;
        let start = 0;
        const step = (ts) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / 1800, 1);
          setCount(Math.floor(progress * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const FEATURES = [
  { icon: <Zap size={22} />, title: 'AI Code Reviews', desc: 'Brutally honest, actionable feedback from Gemini AI — scores, strengths, weaknesses, and suggestions instantly.', accent: 'var(--accent-warm)' },
  { icon: <Swords size={22} />, title: 'Code Arena', desc: 'Challenge developers to head-to-head battles. Submit your solution, let AI judge, and climb the leaderboard.', accent: 'var(--accent-lavender)' },
  { icon: <BookOpen size={22} />, title: 'Classroom Mode', desc: 'Teachers create classes, publish assignments, and get AI-assisted grading. Students get instant feedback on ZIP submissions.', accent: 'var(--accent-mint)' },
  { icon: <Users size={22} />, title: 'Community Feed', desc: 'Share projects publicly, get rated by peers, and discover what other developers are building — all AI-scored.', accent: '#FFB347' },
];

const STEPS = [
  { num: '01', title: 'Upload Your Code', desc: 'Zip your project and upload it through our drag-and-drop interface. No setup required.' },
  { num: '02', title: 'AI Reads Everything', desc: 'Gemini 2.0 Flash scans every file — logic, structure, style, security, and performance.' },
  { num: '03', title: 'Get Your Report', desc: 'Receive a detailed breakdown with an overall score, per-category ratings, and specific action items.' },
];

export default function HomePage({ onOpenAuth, onOpenSubmit, user }) {
  const navigate = useNavigate();
  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* ── Hero ── */}
      <section style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', position: 'relative', padding: '4rem 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '45%', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,111,247,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
        {/* Floating terminal */}
        <div className="terminal-window" style={{ position: 'absolute', right: '0', top: '12%', width: '300px', opacity: 0.6, transform: 'rotate(3deg)', display: 'none' }} aria-hidden="true">
          <div className="terminal-header"><div className="terminal-dot" style={{ background: '#FF5F56' }} /><div className="terminal-dot" style={{ background: '#FFBD2E' }} /><div className="terminal-dot" style={{ background: '#27C93F' }} /></div>
          <div className="terminal-body" style={{ fontSize: '0.72rem' }}>
            <div style={{ color: '#6B7280' }}>// Analyzing your project...</div>
            <div style={{ color: '#7C6FF7' }}>const score = 87;</div>
            <div style={{ color: '#00C49A' }}>// ✅ Code Quality: Excellent</div>
            <div style={{ color: '#F59E0B' }}>// ⚠️  Security: 2 issues</div>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ maxWidth: '680px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(124,111,247,0.12)', border: '1px solid rgba(124,111,247,0.3)', borderRadius: '999px', padding: '0.35rem 1rem', marginBottom: '2rem', fontSize: '0.8rem', color: 'var(--accent-lavender)', fontWeight: 600 }}>
            <Zap size={12} /> Powered by Gemini 2.0 Flash
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 4.2rem)', fontWeight: 700, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Your code,{' '}<span className="text-gradient">instantly reviewed</span>{' '}by AI
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.7, maxWidth: '520px' }}>
            Upload any project and get detailed AI feedback in seconds. Compete in coding battles, join classrooms, and grow with a developer community.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {user ? (
              <button id="hero-submit-btn" className="btn-primary" onClick={onOpenSubmit} style={{ fontSize: '1rem', padding: '0.9rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Submit a Project <ArrowRight size={16} />
              </button>
            ) : (
              <button id="hero-get-started-btn" className="btn-primary" onClick={onOpenAuth} style={{ fontSize: '1rem', padding: '0.9rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Get Started Free <ArrowRight size={16} />
              </button>
            )}
            <button id="hero-community-btn" onClick={() => navigate('/community')} style={{ fontSize: '1rem', padding: '0.9rem 2rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 150ms' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,111,247,0.5)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
              <Code size={16} /> Browse Projects
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '5rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Everything you need to <span className="text-gradient">level up</span></h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto' }}>From solo projects to competitive battles and classroom assignments — one platform.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="card" style={{ cursor: 'default' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: `${f.accent}20`, border: `1px solid ${f.accent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.accent, marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.6rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: '5rem 0', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>How it <span className="text-gradient">works</span></h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxWidth: '640px', margin: '0 auto' }}>
          {STEPS.map((step, i) => (
            <motion.div key={step.num} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', paddingBottom: i < STEPS.length - 1 ? '2.5rem' : 0, position: 'relative' }}>
              {i < STEPS.length - 1 && <div style={{ position: 'absolute', left: '20px', top: '44px', width: '2px', height: 'calc(100% - 20px)', background: 'linear-gradient(to bottom, rgba(124,111,247,0.4), transparent)' }} />}
              <div style={{ minWidth: '40px', height: '40px', borderRadius: '50%', background: 'rgba(124,111,247,0.12)', border: '1px solid rgba(124,111,247,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-lavender)', flexShrink: 0 }}>{step.num}</div>
              <div><h3 style={{ marginBottom: '0.35rem', fontSize: '1rem' }}>{step.title}</h3><p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '0.9rem' }}>{step.desc}</p></div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '5rem 0' }}>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} style={{ background: 'linear-gradient(135deg, rgba(124,111,247,0.18), rgba(255,107,53,0.08))', border: '1px solid rgba(124,111,247,0.25)', borderRadius: 'var(--radius-xl)', padding: '4rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,111,247,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <Award size={36} style={{ color: 'var(--accent-lavender)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '1rem' }}>Ready to get your code <span className="text-gradient">reviewed?</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '420px', margin: '0 auto 2rem' }}>
            Join thousands of developers who use Evalify to get instant AI feedback and sharpen their skills.
          </p>
          {user ? (
            <button id="cta-submit-btn" className="btn-primary" onClick={onOpenSubmit} style={{ fontSize: '1rem', padding: '0.9rem 2.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>Submit Your Project <ChevronRight size={16} /></button>
          ) : (
            <button id="cta-signup-btn" className="btn-primary" onClick={onOpenAuth} style={{ fontSize: '1rem', padding: '0.9rem 2.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>Create Free Account <ChevronRight size={16} /></button>
          )}
        </motion.div>
      </section>
    </div>
  );
}
