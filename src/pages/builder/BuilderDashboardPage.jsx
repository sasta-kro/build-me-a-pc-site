import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency, formatDate, formatRating } from '../../utils/helpers';

export default function BuilderDashboardPage() {
  const { user } = useAuth();
  const { getBuilds, getOffers, getBuilderProfile, getInquiries, updateInquiry } = useData();

  const [activeTab, setActiveTab] = useState('offers');
  const [offers, setOffers] = useState([]);
  const [showcaseBuilds, setShowcaseBuilds] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState({
    totalOffers: 0,
    acceptedOffers: 0,
    showcaseCount: 0,
    completedBuilds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const [builderOffers, showcase, builderInquiries, builderProfile] = await Promise.all([
          getOffers({ builder_id: user.id }),
          getBuilds({ creator_id: user.id, build_type: 'showcase' }),
          getInquiries({ builder_id: user.id }),
          getBuilderProfile(user.id),
        ]);

        setOffers(builderOffers);
        setShowcaseBuilds(showcase);
        setInquiries(builderInquiries);

        setStats({
          totalOffers: builderOffers.length,
          acceptedOffers: builderOffers.filter(o => o.status === 'accepted').length,
          showcaseCount: showcase.length,
          completedBuilds: builderProfile?.completed_builds || 0,
        });
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, getOffers, getBuilds, getInquiries, getBuilderProfile]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'accepted': return 'badge badge--success';
      case 'rejected':
      case 'declined': return 'badge badge--error';
      case 'pending': return 'badge badge--warning';
      default: return 'badge badge--secondary';
    }
  };

  const getAvailabilityBadgeClass = (availability) => {
    switch (availability) {
      case 'available': return 'badge badge--success';
      case 'sold_out': return 'badge badge--error';
      case 'discontinued': return 'badge badge--secondary';
      default: return 'badge badge--secondary';
    }
  };

  const handleInquiryStatus = async (inquiryId, status) => {
    setProcessingId(inquiryId);
    try {
      const updated = await updateInquiry(inquiryId, status);
      setInquiries(prev => prev.map(i => i.id === inquiryId ? { ...i, status: updated.status } : i));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1>Builder Dashboard</h1>
        <p>Manage your offers, showcase builds, and inquiries.</p>
      </div>

      {/* Stats Row */}
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-card__value">{stats.totalOffers}</div>
          <div className="stat-card__label">Total Offers</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.acceptedOffers}</div>
          <div className="stat-card__label">Accepted Offers</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.showcaseCount}</div>
          <div className="stat-card__label">Showcase Builds</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.completedBuilds}</div>
          <div className="stat-card__label">Completed Builds</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tabs__tab ${activeTab === 'offers' ? 'tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('offers')}
        >
          My Offers
        </button>
        <button
          className={`tabs__tab ${activeTab === 'showcase' ? 'tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('showcase')}
        >
          My Showcase Builds
        </button>
        <button
          className={`tabs__tab ${activeTab === 'inquiries' ? 'tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('inquiries')}
        >
          Inquiries
        </button>
      </div>

      {/* My Offers Tab */}
      {activeTab === 'offers' && (
        <div className="tab-content">
          {offers.length === 0 ? (
            <div className="empty-state">
              <p>You haven&apos;t sent any offers yet.</p>
              <Link to="/requests" className="btn btn--primary">Browse Requests</Link>
            </div>
          ) : (
            <div className="grid grid--2">
              {offers.map((offer) => (
                <Link to={`/requests/${offer.request_id}`} key={offer.id} className="card card--hover">
                  <div className="card__body">
                    <h3 className="card__title">{offer.request_title || 'Unknown Request'}</h3>
                    <span className={getStatusBadgeClass(offer.status)}>
                      {offer.status}
                    </span>
                    <div className="card__price">
                      {offer.fee ? formatCurrency(offer.fee) : 'Free'}
                    </div>
                    {offer.message && (
                      <p className="card__description">
                        {offer.message.length > 120
                          ? offer.message.slice(0, 120) + '...'
                          : offer.message}
                      </p>
                    )}
                    <div className="card__meta">
                      <span className="card__date">{formatDate(offer.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Showcase Builds Tab */}
      {activeTab === 'showcase' && (
        <div className="tab-content">
          <div style={{ marginBottom: '1rem' }}>
            <Link to="/builds/new" className="btn btn--primary">
              Create Showcase Build
            </Link>
          </div>

          {showcaseBuilds.length === 0 ? (
            <div className="empty-state">
              <p>You haven&apos;t created any showcase builds yet.</p>
            </div>
          ) : (
            <div className="grid grid--3">
              {showcaseBuilds.map((build) => (
                <Link to={`/showcase/${build.id}`} key={build.id} className="card card--hover">
                  <div className="card__body">
                    <h3 className="card__title">{build.title}</h3>
                    <span className={getAvailabilityBadgeClass(build.availability_status)}>
                      {build.availability_status || 'available'}
                    </span>
                    <div className="card__price">
                      {formatCurrency(build.showcase_price || build.total_price || 0)}
                    </div>
                    <div className="card__stats">
                      <span className="card__stat" title="Rating">
                        &#9733; {formatRating(build.rating_avg)} ({build.rating_count || 0})
                      </span>
                    </div>
                    <div className="card__meta">
                      <span className="card__date">{formatDate(build.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inquiries Tab */}
      {activeTab === 'inquiries' && (
        <div className="tab-content">
          {inquiries.length === 0 ? (
            <div className="empty-state">
              <p>No inquiries received yet.</p>
            </div>
          ) : (
            <div className="grid grid--2">
              {inquiries.map((inquiry) => (
                <div key={inquiry.id} className="card">
                  <div className="card__body">
                    <h3 className="card__title">
                      {inquiry.build_title || 'Unknown Build'}
                    </h3>
                    <p className="card__description">
                      <strong>From:</strong> {inquiry.user_display_name || 'Unknown User'}
                    </p>
                    {inquiry.message && (
                      <p className="card__description">{inquiry.message}</p>
                    )}
                    <span className={getStatusBadgeClass(inquiry.status)}>
                      {inquiry.status}
                    </span>
                    <div className="card__meta">
                      <span className="card__date">{formatDate(inquiry.created_at)}</span>
                    </div>
                    {inquiry.status === 'pending' && (
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => handleInquiryStatus(inquiry.id, 'accepted')}
                          disabled={processingId === inquiry.id}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => handleInquiryStatus(inquiry.id, 'declined')}
                          disabled={processingId === inquiry.id}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
