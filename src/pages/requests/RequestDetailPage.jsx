import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatRating } from '../../utils/helpers';

const PLACEHOLDER_IMAGE = 'https://www.shutterstock.com/image-vector/gaming-pc-wireframe-drawing-line-600nw-2588972631.jpg';

const STATUS_BADGE = {
  open: 'badge--success',
  claimed: 'badge--primary',
  in_progress: 'badge--warning',
  completed: 'badge--secondary',
  cancelled: 'badge--danger',
};

export default function RequestDetailPage() {
  const { id } = useParams();
  const {
    getItemById, getOffers, getBuildParts,
    createItem, editItem, acceptOffer,
  } = useData();
  const { user, isAuthenticated, isBuilder } = useAuth();

  const [request, setRequest] = useState(null);
  const [build, setBuild] = useState(null);
  const [parts, setParts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Offer form state
  const [offerFee, setOfferFee] = useState(0);
  const [offerMessage, setOfferMessage] = useState('');
  const [offerContact, setOfferContact] = useState('');
  const [offerError, setOfferError] = useState('');

  const loadData = async () => {
    try {
      const req = await getItemById('build_requests', id);
      if (!req) {
        setRequest(null);
        return;
      }
      setRequest(req);

      const [buildData, partsData, offersData] = await Promise.all([
        getItemById('builds', req.build_id),
        getBuildParts(req.build_id),
        getOffers({ request_id: req.id }),
      ]);

      setBuild(buildData);
      setParts(partsData);
      setOffers(offersData);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  if (!request) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Request not found.</p>
          <Link to="/requests" className="btn btn--primary">Back to Request Board</Link>
        </div>
      </div>
    );
  }

  const isOwner = isAuthenticated && user.id === request.user_id;
  const alreadyOffered = isBuilder && offers.some(o => o.builder_id === user?.id);

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    setOfferError('');

    if (!offerMessage.trim()) {
      setOfferError('Please provide a message.');
      return;
    }
    if (!offerContact.trim()) {
      setOfferError('Please provide your contact information.');
      return;
    }
    if (alreadyOffered) {
      setOfferError('You have already submitted an offer for this request.');
      return;
    }

    try {
      await createItem('builder_offers', {
        request_id: request.id,
        builder_id: user.id,
        fee: Number(offerFee) || 0,
        message: offerMessage.trim(),
        contact_info: offerContact.trim(),
        status: 'pending',
      });

      setOfferFee(0);
      setOfferMessage('');
      setOfferContact('');
      await loadData();
    } catch (err) {
      setOfferError(err.response?.data?.error || err.message);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      await acceptOffer(offerId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleMarkComplete = async () => {
    try {
      await editItem('build_requests', request.id, { status: 'completed' });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleCancel = async () => {
    try {
      await editItem('build_requests', request.id, { status: 'cancelled' });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="page">
      <Link to="/requests" className="btn btn--ghost" style={{ marginBottom: '1rem' }}>
        &larr; Back to Request Board
      </Link>

      {/* Request Info Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card__header">
          <h1 className="card__title">
            {build ? (
              <Link to={`/builds/${build.id}`}>{build.title}</Link>
            ) : (
              request.build_title || 'Untitled Build'
            )}
          </h1>
          <span className={`badge ${STATUS_BADGE[request.status] || 'badge--secondary'}`}>
            {request.status.replace('_', ' ')}
          </span>
        </div>

        <div className="card__body">
          <div className="request-card__budget" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
            <strong>Budget:</strong> {formatCurrency(request.budget || 0)}
          </div>

          {request.purpose && (
            <p><strong>Purpose:</strong> {request.purpose}</p>
          )}

          {request.notes && (
            <p><strong>Notes:</strong> {request.notes}</p>
          )}

          {request.preferred_builder_name && (
            <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
              Wished to be built by{' '}
              {request.preferred_builder_id ? (
                <Link to={`/profile/${request.preferred_builder_id}`}>{request.preferred_builder_name}</Link>
              ) : (
                request.preferred_builder_name
              )}
            </p>
          )}

          <div className="card__meta" style={{ marginTop: '1rem' }}>
            <span>
              Posted by{' '}
              {request.user_id ? (
                <Link to={`/profile/${request.user_id}`}>{request.user_display_name || 'Unknown'}</Link>
              ) : (
                'Unknown'
              )}
            </span>
            <span>{formatDate(request.created_at)}</span>
          </div>

          {/* Owner actions */}
          {isOwner && (
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              {(request.status === 'in_progress' || request.status === 'claimed') && (
                <button className="btn btn--success" onClick={handleMarkComplete}>
                  Mark Complete
                </button>
              )}
              {request.status === 'open' && (
                <button className="btn btn--danger" onClick={handleCancel}>
                  Cancel Request
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      {((request.build_image_urls && request.build_image_urls.length > 0) || (build?.image_urls && build.image_urls.length > 0)) && (
        <div className="build-gallery card" style={{ marginBottom: '2rem' }}>
          <div className="card__body">
            <div className="build-gallery__main">
              <img
                src={(request.build_image_urls || build.image_urls)[selectedImageIndex]}
                alt={request.build_title || 'Build'}
                className="build-gallery__image"
                style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: 'var(--radius-lg, 8px)' }}
              />
            </div>
            {(request.build_image_urls || build.image_urls).length > 1 && (
              <div className="build-gallery__thumbs" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', overflowX: 'auto' }}>
                {(request.build_image_urls || build.image_urls).map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`${request.build_title || 'Build'} ${idx + 1}`}
                    className="build-gallery__thumb"
                    onClick={() => setSelectedImageIndex(idx)}
                    style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm, 4px)', cursor: 'pointer', opacity: idx === selectedImageIndex ? 1 : 0.6, border: idx === selectedImageIndex ? '2px solid var(--color-primary)' : '2px solid transparent' }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parts list */}
      {parts.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card__header">
            <h3>Build Parts</h3>
          </div>
          <div className="card__body">
            <table className="table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Category</th>
                  <th>Part</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((bp) => (
                  <tr key={bp.id}>
                    <td>
                      <img
                        src={bp.part?.image_url || PLACEHOLDER_IMAGE}
                        alt={bp.part?.name || 'Part'}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    </td>
                    <td>{bp.category ? bp.category.name : 'Unknown'}</td>
                    <td>{bp.part ? bp.part.name : 'Unknown Part'}</td>
                    <td>{bp.part ? formatCurrency(bp.part.price) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3"><strong>Total</strong></td>
                  <td><strong>{formatCurrency(build?.total_price || request.build_total_price || 0)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Offers Section */}
      <div>
        <h2>Offers ({offers.length})</h2>

        {/* Offer form for builders */}
        {isBuilder && !isOwner && request.status === 'open' && !alreadyOffered && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card__header">
              <h3>Submit an Offer</h3>
            </div>
            <div className="card__body">
              <form onSubmit={handleSubmitOffer}>
                {offerError && (
                  <div className="alert alert--danger" style={{ marginBottom: '1rem' }}>
                    {offerError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="offer-fee">Fee ($)</label>
                  <input
                    id="offer-fee"
                    type="number"
                    className="form-input"
                    min="0"
                    step="0.01"
                    value={offerFee}
                    onChange={(e) => setOfferFee(e.target.value)}
                    placeholder="0 means free"
                  />
                  <span className="text--muted">Enter 0 for a free build service.</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="offer-message">Message *</label>
                  <textarea
                    id="offer-message"
                    className="form-input"
                    rows="4"
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="Describe your experience and approach for this build..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="offer-contact">Contact Info *</label>
                  <input
                    id="offer-contact"
                    type="text"
                    className="form-input"
                    value={offerContact}
                    onChange={(e) => setOfferContact(e.target.value)}
                    placeholder="Email, phone, or Discord username"
                    required
                  />
                </div>

                <button type="submit" className="btn btn--primary">Submit Offer</button>
              </form>
            </div>
          </div>
        )}

        {isBuilder && alreadyOffered && request.status === 'open' && (
          <div className="alert alert--info" style={{ marginBottom: '1rem' }}>
            You have already submitted an offer for this request.
          </div>
        )}

        {/* Offer list */}
        {offers.length === 0 ? (
          <div className="empty-state">
            <p>No offers have been submitted yet.</p>
          </div>
        ) : (
          <div className="offer-list">
            {offers.map((offer) => {
              const isAccepted = offer.status === 'accepted';

              return (
                <div key={offer.id} className="card offer-card" style={{ marginBottom: '1rem' }}>
                  <div className="card__header">
                    <h4>
                      {offer.builder_id ? (
                        <Link to={`/profile/${offer.builder_id}`}>
                          {offer.builder_display_name || 'Unknown Builder'}
                        </Link>
                      ) : (
                        'Unknown Builder'
                      )}
                    </h4>
                    <span className={`badge ${
                      offer.status === 'accepted' ? 'badge--success' :
                      offer.status === 'rejected' ? 'badge--danger' :
                      'badge--secondary'
                    }`}>
                      {offer.status}
                    </span>
                  </div>

                  <div className="card__body">
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Fee:</strong>{' '}
                      {Number(offer.fee) === 0 ? (
                        <span className="badge badge--success">Free</span>
                      ) : (
                        formatCurrency(offer.fee)
                      )}
                    </div>

                    <p>{offer.message}</p>

                    {offer.builder_profile && (
                      <div className="offer-card__stats" style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                        {offer.builder_profile.years_of_experience != null && (
                          <span>{offer.builder_profile.years_of_experience} years experience</span>
                        )}
                        {offer.builder_profile.completed_builds != null && (
                          <span> &middot; {offer.builder_profile.completed_builds} builds completed</span>
                        )}
                        {offer.builder_profile.avg_rating != null && (
                          <span> &middot; {formatRating(offer.builder_profile.avg_rating)} avg rating</span>
                        )}
                      </div>
                    )}

                    {/* Accept button - visible to request owner */}
                    {isOwner && (request.status === 'open' || request.status === 'claimed') && offer.status === 'pending' && (
                      <button
                        className="btn btn--success"
                        style={{ marginTop: '0.75rem' }}
                        onClick={() => handleAcceptOffer(offer.id)}
                      >
                        Accept Offer
                      </button>
                    )}

                    {/* Show contact info for accepted offer */}
                    {isAccepted && (isOwner || (isAuthenticated && user.id === offer.builder_id)) && (
                      <div className="offer-card__contact" style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--color-bg-secondary, #f5f5f5)', borderRadius: '0.5rem' }}>
                        <strong>Contact Information:</strong> {offer.contact_info}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
