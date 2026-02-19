import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { formatDate, formatCurrency, formatRating } from '../../utils/helpers';

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { getUser, getBuilds, getBuilderProfile } = useData();

  const [profileUser, setProfileUser] = useState(null);
  const [builderProfile, setBuilderProfile] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const foundUser = await getUser(id);
        setProfileUser(foundUser);

        if (foundUser) {
          const userBuilds = await getBuilds({ creator_id: foundUser.id, status: 'published' });
          setBuilds(userBuilds);

          if (foundUser.role === 'builder' || foundUser.role === 'admin') {
            const bp = await getBuilderProfile(foundUser.id);
            setBuilderProfile(bp);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, getUser, getBuilds, getBuilderProfile]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!profileUser) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>User not found.</p>
          <Link to="/" className="btn btn--primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === profileUser.id;
  const isBuilder = profileUser.role === 'builder' || profileUser.role === 'admin';

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'badge badge--error';
      case 'builder': return 'badge badge--success';
      default: return 'badge badge--secondary';
    }
  };

  return (
    <div className="page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-header__avatar">
          {profileUser.display_name
            ? profileUser.display_name.charAt(0).toUpperCase()
            : '?'}
        </div>
        <div className="profile-header__info">
          <h1>{profileUser.display_name || 'Anonymous'}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={getRoleBadgeClass(profileUser.role)}>
              {profileUser.role}
            </span>
            {isBuilder && (
              <span className="badge badge--primary builder-badge">
                Verified Builder
              </span>
            )}
          </div>
          {profileUser.bio && (
            <p style={{ marginTop: '0.5rem' }}>{profileUser.bio}</p>
          )}
          <div className="profile-header__meta">
            <span>Joined {formatDate(profileUser.created_at)}</span>
            <span>{builds.length} build{builds.length !== 1 ? 's' : ''}</span>
          </div>
          {isOwnProfile && (
            <Link to="/profile/edit" className="btn btn--secondary" style={{ marginTop: '0.75rem' }}>
              Edit Profile
            </Link>
          )}
        </div>
      </div>

      {/* Builder Info Card */}
      {isBuilder && builderProfile && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card__body">
            <h2>Builder Information</h2>
            <div className="grid grid--2" style={{ marginTop: '1rem' }}>
              <div>
                {builderProfile.business_name && (
                  <p><strong>Business:</strong> {builderProfile.business_name}</p>
                )}
                {builderProfile.specialization && (
                  <p><strong>Specialization:</strong> {builderProfile.specialization}</p>
                )}
                {builderProfile.years_of_experience != null && (
                  <p><strong>Experience:</strong> {builderProfile.years_of_experience} year{builderProfile.years_of_experience !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div>
                <p>
                  <strong>Avg Rating:</strong>{' '}
                  &#9733; {builderProfile.avg_rating != null ? formatRating(builderProfile.avg_rating) : 'N/A'}
                </p>
                <p>
                  <strong>Completed Builds:</strong>{' '}
                  {builderProfile.completed_builds || 0}
                </p>
              </div>
            </div>
            {(builderProfile.website || builderProfile.portfolio_url) && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                {builderProfile.website && (
                  <a
                    href={builderProfile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--secondary"
                  >
                    Website
                  </a>
                )}
                {builderProfile.portfolio_url && (
                  <a
                    href={builderProfile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--secondary"
                  >
                    Portfolio
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Published Builds */}
      <div style={{ marginTop: '2rem' }}>
        <h2>Published Builds</h2>
        {builds.length === 0 ? (
          <div className="empty-state">
            <p>No published builds yet.</p>
          </div>
        ) : (
          <div className="grid grid--3" style={{ marginTop: '1rem' }}>
            {builds.map((build) => (
              <Link
                to={build.build_type === 'showcase' ? `/showcase/${build.id}` : `/builds/${build.id}`}
                key={build.id}
                className="card card--hover"
              >
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
                  <div className="card__stats">
                    <span className="card__stat" title="Likes">
                      &#9829; {build.like_count || 0}
                    </span>
                    <span className="card__stat" title="Rating">
                      &#9733; {formatRating(build.rating_avg)} ({build.rating_count || 0})
                    </span>
                  </div>
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
    </div>
  );
}
