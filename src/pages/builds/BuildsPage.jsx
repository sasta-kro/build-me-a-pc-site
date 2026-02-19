import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function BuildsPage() {
  const { user, isAuthenticated } = useAuth();
  const { getBuilds } = useData();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [allBuilds, setAllBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const results = await getBuilds({ creator_id: user.id });
        setAllBuilds(results);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getBuilds, user]);

  const builds = useMemo(() => {
    let results = [...allBuilds];

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(b =>
        b.title.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sort) {
      case 'oldest':
        results.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'price-low':
        results.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
        break;
      case 'price-high':
        results.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
        break;
      case 'newest':
      default:
        break;
    }

    return results;
  }, [allBuilds, search, sort]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1>My Builds</h1>
        <p>Manage your PC builds. Create new builds or edit existing ones.</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="filter-bar__search"
          placeholder="Search builds by title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-bar__sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      {builds.length === 0 ? (
        <div className="empty-state">
          <p>{search ? 'No builds match your search.' : 'You haven\'t created any builds yet.'}</p>
          <Link to="/builds/new" className="btn btn--primary">Create Your First Build</Link>
        </div>
      ) : (
        <div className="grid grid--3">
          {builds.map((build) => (
            <Link to={`/builds/${build.id}`} key={build.id} className="card card--hover">
              <img
                className="card__image"
                src="https://www.shutterstock.com/image-vector/gaming-pc-wireframe-drawing-line-600nw-2588972631.jpg"
                alt="PC Build"
              />
              <div className="card__body">
                <h3 className="card__title">{build.title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className={`badge ${build.status === 'published' ? 'badge--success' : 'badge--secondary'}`}>
                    {build.status}
                  </span>
                  {build.purpose && (
                    <span className="badge badge--secondary">{build.purpose}</span>
                  )}
                </div>
                <p className="card__description">
                  {build.description
                    ? build.description.length > 100
                      ? build.description.slice(0, 100) + '...'
                      : build.description
                    : 'No description provided.'}
                </p>
                <div className="card__price">{formatCurrency(build.total_price || 0)}</div>
                <div className="card__meta">
                  <span className="card__date">{formatDate(build.created_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
