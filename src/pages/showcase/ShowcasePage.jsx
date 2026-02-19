import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency, formatRating } from '../../utils/helpers';

const AVAILABILITY_BADGE = {
  available: 'badge--success',
  sold_out: 'badge--warning',
  discontinued: 'badge--danger',
};

export default function ShowcasePage() {
  const { getBuilds } = useData();
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [allBuilds, setAllBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await getBuilds({ status: 'published', build_type: 'showcase' });
        setAllBuilds(result);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getBuilds]);

  const builds = useMemo(() => {
    let results = [...allBuilds];

    // Filter by availability
    if (availabilityFilter !== 'all') {
      results = results.filter(b => b.availability_status === availabilityFilter);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(b =>
        b.title.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q)) ||
        (b.specs_summary && b.specs_summary.toLowerCase().includes(q))
      );
    }

    return results;
  }, [allBuilds, availabilityFilter, search]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1>Builder Showcase</h1>
        <p>
          Browse pre-built PCs from verified builders. Find your perfect machine ready to order.
        </p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="filter-bar__search"
          placeholder="Search showcase builds..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter-bar__sort"
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
        >
          <option value="all">All Availability</option>
          <option value="available">Available</option>
          <option value="sold_out">Sold Out</option>
          <option value="discontinued">Discontinued</option>
        </select>
      </div>

      {builds.length === 0 ? (
        <div className="empty-state">
          <p>{search ? 'No showcase builds match your search.' : 'No showcase builds have been published yet.'}</p>
        </div>
      ) : (
        <div className="grid grid--3">
          {builds.map((build) => (
            <Link
              to={`/showcase/${build.id}`}
              key={build.id}
              className="card card--hover"
            >
              <img
                className="card__image"
                src="https://www.shutterstock.com/image-vector/gaming-pc-wireframe-drawing-line-600nw-2588972631.jpg"
                alt="PC Build"
              />
              <div className="card__body">
                <h3 className="card__title">{build.title}</h3>

                {build.specs_summary && (
                  <p className="card__description">{build.specs_summary}</p>
                )}

                <div className="showcase-card__price" style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0.5rem 0' }}>
                  {formatCurrency(build.total_price || 0)}
                </div>

                <span className={`badge ${AVAILABILITY_BADGE[build.availability_status] || 'badge--secondary'}`}>
                  {(build.availability_status || 'available').replace('_', ' ')}
                </span>

                <div className="card__meta" style={{ marginTop: '0.75rem' }}>
                  <span className="card__creator">
                    by {build.creator_display_name || 'Unknown Builder'}
                  </span>
                </div>

                <div className="card__stats">
                  <span className="card__stat" title="Rating">
                    &#9733; {formatRating(build.rating_avg)} ({build.rating_count || 0})
                  </span>
                  <span className="card__stat" title="Likes">
                    &#9829; {build.like_count || 0}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
