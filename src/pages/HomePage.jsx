import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/helpers';

export default function HomePage() {
  const { getBuilds, getStats } = useData();

  const [showcaseBuilds, setShowcaseBuilds] = useState([]);
  const [stats, setStats] = useState({ builds: 0, users: 0, parts: 0, requests: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [builds, platformStats] = await Promise.all([
          getBuilds({ status: 'published', build_type: 'showcase' }),
          getStats(),
        ]);
        setShowcaseBuilds(builds.slice(0, 3));
        setStats(platformStats);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getBuilds, getStats]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page">
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero__title">Build Your Dream PC</h1>
        <p className="hero__subtitle">
          A community platform for PC enthusiasts. Pick parts, share builds,
          and connect with expert builders to bring your dream setup to life.
        </p>
        <div className="hero__actions">
          <Link to="/showcase" className="btn btn--primary btn--lg">Browse Showcase</Link>
          <Link to="/builds/new" className="btn btn--secondary btn--lg">Create Build</Link>
        </div>
      </section>

      {/* Featured Showcase */}
      {showcaseBuilds.length > 0 && (
        <section className="section">
          <div className="section__header">
            <h2>Featured Showcase Builds</h2>
            <Link to="/showcase" className="section__link">View All</Link>
          </div>
          <div className="grid grid--3">
            {showcaseBuilds.map((build) => (
              <Link to={`/showcase/${build.id}`} key={build.id} className="card card--hover">
                <img
                  className="card__image"
                  src="https://www.shutterstock.com/image-vector/gaming-pc-wireframe-drawing-line-600nw-2588972631.jpg"
                  alt="PC Build"
                />
                <div className="card__body">
                  <h3 className="card__title">{build.title}</h3>
                  {build.purpose && (
                    <span className="badge badge--secondary">{build.purpose}</span>
                  )}
                  <p className="card__description">
                    {build.description
                      ? build.description.length > 100
                        ? build.description.slice(0, 100) + '...'
                        : build.description
                      : 'No description provided.'}
                  </p>
                  <div className="card__price">{formatCurrency(build.total_price || 0)}</div>
                  <div className="card__meta">
                    <span className="card__creator">
                      by {build.creator_display_name || 'Unknown'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="section stats-section">
        <h2>Platform Stats</h2>
        <div className="grid grid--3">
          <div className="stat-card">
            <span className="stat-card__number">{stats.builds}</span>
            <span className="stat-card__label">Total Builds</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__number">{stats.users}</span>
            <span className="stat-card__label">Total Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__number">{stats.parts}</span>
            <span className="stat-card__label">Total Parts</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <h2>How It Works</h2>
        <div className="grid grid--3">
          <div className="step-card">
            <span className="step-card__number">1</span>
            <h3 className="step-card__title">Pick Parts</h3>
            <p className="step-card__description">
              Choose from a curated catalog of PC components across 8 categories.
              Real-time compatibility checks ensure everything fits together.
            </p>
          </div>
          <div className="step-card">
            <span className="step-card__number">2</span>
            <h3 className="step-card__title">Create Build</h3>
            <p className="step-card__description">
              Assemble your parts into a complete build. Add a title, description,
              and purpose to share with the community.
            </p>
          </div>
          <div className="step-card">
            <span className="step-card__number">3</span>
            <h3 className="step-card__title">Get Expert Help</h3>
            <p className="step-card__description">
              Post your build to the Request Board and receive offers from verified
              builders who can assemble it for you.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
