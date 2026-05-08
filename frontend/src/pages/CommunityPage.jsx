import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import ProjectCard from '../components/ProjectCard';
import { projectService } from '../services/api';
import { Search, Code, Loader } from 'lucide-react';

const LANGUAGE_FILTERS = ['All', 'JavaScript', 'Python', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'PHP', 'Ruby'];

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Top Scored', value: 'score' },
  { label: 'Most Discussed', value: 'comments' },
];

const CommunityPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('All');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    projectService.getProjects()
      .then(res => setProjects(res.data || []))
      .catch(err => console.error('Failed to fetch projects', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...projects];
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.user?.name?.toLowerCase().includes(q)
      );
    }
    // Language filter
    if (langFilter !== 'All') {
      result = result.filter(p => p.language?.toLowerCase() === langFilter.toLowerCase());
    }
    // Sort
    if (sort === 'score') result.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    else if (sort === 'comments') result.sort((a, b) => (b._count?.comments || 0) - (a._count?.comments || 0));
    // default: newest (already from API)
    return result;
  }, [projects, search, langFilter, sort]);

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Community <span className="text-gradient">Projects</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Explore AI-reviewed projects submitted by developers worldwide.
        </p>
      </div>

      {/* Search + Sort Row */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
          <input
            id="community-search"
            type="text"
            placeholder="Search projects or authors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>
        {/* Sort */}
        <select
          id="community-sort"
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '140px', cursor: 'pointer' }}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Language Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {LANGUAGE_FILTERS.map(lang => (
          <button
            key={lang}
            id={`filter-${lang.toLowerCase()}`}
            onClick={() => setLangFilter(lang)}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid',
              transition: 'all 150ms',
              borderColor: langFilter === lang ? 'var(--accent-lavender)' : 'var(--border-color)',
              background: langFilter === lang ? 'rgba(124,111,247,0.15)' : 'transparent',
              color: langFilter === lang ? 'var(--accent-lavender)' : 'var(--text-secondary)',
            }}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem', color: 'var(--text-secondary)', gap: '0.75rem' }}>
          <Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
          Loading projects...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
          <Code size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No projects found</h3>
          <p>{search || langFilter !== 'All' ? 'Try adjusting your filters.' : 'Be the first to submit a project!'}</p>
        </motion.div>
      ) : (
        <>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {filtered.length} project{filtered.length !== 1 ? 's' : ''} found
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CommunityPage;
