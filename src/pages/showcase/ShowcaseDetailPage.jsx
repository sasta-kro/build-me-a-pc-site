import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatRating } from '../../utils/helpers';

const PLACEHOLDER_IMAGE = 'https://www.shutterstock.com/image-vector/gaming-pc-wireframe-drawing-line-600nw-2588972631.jpg';

const AVAILABILITY_BADGE = {
  available: 'badge--success',
  sold_out: 'badge--warning',
  discontinued: 'badge--danger',
};

export default function ShowcaseDetailPage() {
  const { id } = useParams();
  const {
    getItemById, getBuildParts, getBuilderProfile,
    getRatings, getUserRating, addRating, getComments, addComment,
    isLiked, toggleLike, createInquiry, getInquiries, updateInquiry,
  } = useData();
  const { user, isAuthenticated } = useAuth();

  const [build, setBuild] = useState(null);
  const [parts, setParts] = useState([]);
  const [builderProfile, setBuilderProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [inquiries, setInquiries] = useState([]);
  const [processingInquiryId, setProcessingInquiryId] = useState(null);

  // Inquiry form state
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  // Rating form state
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [hasRated, setHasRated] = useState(false);

  // Comment form state
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const loadData = async () => {
    try {
      const b = await getItemById('builds', id);
      if (!b) {
        setBuild(null);
        return;
      }
      setBuild(b);
      setLikeCount(b.like_count || 0);

      const promises = [
        getBuildParts(b.id),
        getBuilderProfile(b.creator_id),
        getRatings(b.id),
        getComments(b.id),
      ];

      if (user) {
        promises.push(isLiked(b.id));
        promises.push(getUserRating(b.id));
      }

      const results = await Promise.all(promises);

      setParts(results[0]);
      setBuilderProfile(results[1]);
      setRatings(results[2]);
      setComments(results[3]);

      if (user) {
        setLiked(results[4]);
        setHasRated(!!results[5]);
      }

      // Load inquiries for builder owner
      if (user && user.id === b.creator_id) {
        try {
          const inquiriesData = await getInquiries({ build_id: b.id });
          setInquiries(inquiriesData);
        } catch {
          setInquiries([]);
        }
      }
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

  if (!build) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Showcase build not found.</p>
          <Link to="/showcase" className="btn btn--primary">Back to Showcase</Link>
        </div>
      </div>
    );
  }

  const isOwner = isAuthenticated && user.id === build.creator_id;

  const handleToggleLike = async () => {
    if (!isAuthenticated) return;
    try {
      const nowLiked = await toggleLike(build.id);
      setLiked(nowLiked);
      setLikeCount(prev => nowLiked ? prev + 1 : Math.max(0, prev - 1));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || hasRated) return;
    try {
      await addRating(build.id, {
        score: Number(ratingScore),
        review: ratingReview.trim() || null,
      });
      setRatingScore(5);
      setRatingReview('');
      setHasRated(true);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !commentText.trim()) return;
    try {
      await addComment(build.id, {
        content: commentText.trim(),
      });
      setCommentText('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !replyText.trim() || !replyTo) return;
    try {
      await addComment(build.id, {
        content: replyText.trim(),
        parent_comment_id: replyTo,
      });
      setReplyTo(null);
      setReplyText('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !inquiryMessage.trim()) return;
    try {
      await createInquiry({
        build_id: build.id,
        builder_id: build.creator_id,
        message: inquiryMessage.trim(),
      });
      setInquiryMessage('');
      setInquirySubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleInquiryStatus = async (inquiryId, status) => {
    setProcessingInquiryId(inquiryId);
    try {
      const updated = await updateInquiry(inquiryId, status);
      setInquiries(prev => prev.map(i => i.id === inquiryId ? { ...i, status: updated.status } : i));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setProcessingInquiryId(null);
    }
  };

  // Build threaded comment tree
  function buildCommentTree(comments) {
    const map = {};
    const roots = [];

    comments.forEach(c => {
      map[c.id] = { ...c, replies: [] };
    });

    comments.forEach(c => {
      if (c.parent_comment_id && map[c.parent_comment_id]) {
        map[c.parent_comment_id].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });

    return roots;
  }

  const commentTree = buildCommentTree(comments);

  // Recursive comment renderer
  const renderComment = (comment, depth = 0) => {
    const isReply = depth > 0;
    return (
      <div
        key={comment.id}
        style={{
          borderBottom: isReply ? 'none' : '1px solid var(--color-border, #eee)',
          padding: isReply ? '0.5rem 0' : '0.75rem 0',
          marginLeft: isReply ? '1.5rem' : '0',
          borderLeft: isReply ? '2px solid var(--color-border, #ddd)' : 'none',
          paddingLeft: isReply ? '1rem' : '0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>
            {comment.user_id ? (
              <Link to={`/profile/${comment.user_id}`}>
                {comment.creator_display_name || 'Unknown User'}
              </Link>
            ) : (
              'Unknown User'
            )}
          </strong>
          <span className="text--muted" style={{ fontSize: '0.85rem' }}>
            {formatDate(comment.created_at)}
          </span>
        </div>
        <p>{comment.content}</p>
        {isAuthenticated && (
          <button
            className="comment__reply-btn"
            onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            type="button"
          >
            {replyTo === comment.id ? 'Cancel' : 'Reply'}
          </button>
        )}
        {replyTo === comment.id && (
          <form onSubmit={handleSubmitReply} style={{ marginTop: '0.5rem' }}>
            <textarea
              className="form-input"
              rows="2"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              style={{ marginBottom: '0.5rem' }}
            />
            <button type="submit" className="btn btn--primary btn--sm" disabled={!replyText.trim()}>
              Post Reply
            </button>
          </form>
        )}
        {comment.replies.length > 0 && (
          <div style={{ marginTop: '0.25rem' }}>
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <Link to="/showcase" className="btn btn--ghost" style={{ marginBottom: '1rem' }}>
        &larr; Back to Showcase
      </Link>

      <div className="page-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
        {/* Main content */}
        <div>
          {/* Build info card */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card__header">
              <h1 className="card__title">{build.title}</h1>
              <span className={`badge ${AVAILABILITY_BADGE[build.availability_status] || 'badge--secondary'}`}>
                {(build.availability_status || 'available').replace('_', ' ')}
              </span>
            </div>

            <div className="card__body">
              {build.description && <p>{build.description}</p>}

              {build.specs_summary && (
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  {build.specs_summary}
                </p>
              )}

              <div className="showcase-card__price" style={{ fontSize: '1.5rem', fontWeight: '700', margin: '1rem 0' }}>
                {formatCurrency(build.total_price || 0)}
              </div>

              {/* Social actions */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                {isAuthenticated && !isOwner && (
                  <button
                    className={`btn ${liked ? 'btn--danger' : 'btn--ghost'}`}
                    onClick={handleToggleLike}
                  >
                    {liked ? '\u2665' : '\u2661'} {likeCount}
                  </button>
                )}
                {(!isAuthenticated || isOwner) && (
                  <span className="card__stat" title="Likes">&#9829; {likeCount}</span>
                )}
                <span className="card__stat" title="Rating">
                  &#9733; {formatRating(build.rating_avg)} ({build.rating_count || 0})
                </span>
              </div>

              <div className="card__meta">
                <span>{formatDate(build.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Image Gallery */}
          {build.image_urls && build.image_urls.length > 0 && (
            <div className="build-gallery card" style={{ marginBottom: '2rem' }}>
              <div className="card__body">
                <div className="build-gallery__main">
                  <img
                    src={build.image_urls[selectedImageIndex]}
                    alt={build.title}
                    className="build-gallery__image"
                    style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: 'var(--radius-lg, 8px)' }}
                  />
                </div>
                {build.image_urls.length > 1 && (
                  <div className="build-gallery__thumbs" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', overflowX: 'auto' }}>
                    {build.image_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`${build.title} ${idx + 1}`}
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

          {/* Parts table */}
          {parts.length > 0 && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div className="card__header">
                <h2>Parts List</h2>
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
                      <td><strong>{formatCurrency(build.total_price || 0)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Inquiry form */}
          {isAuthenticated && !isOwner && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div className="card__header">
                <h2>Send Inquiry</h2>
              </div>
              <div className="card__body">
                {inquirySubmitted ? (
                  <div className="alert alert--success">
                    Your inquiry has been sent to the builder. They will reach out to you soon.
                  </div>
                ) : (
                  <form onSubmit={handleSubmitInquiry}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="inquiry-message">Message</label>
                      <textarea
                        id="inquiry-message"
                        className="form-input"
                        rows="4"
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        placeholder="Interested in this build? Ask the builder a question or request more details..."
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn--primary">Send Inquiry</button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Inquiries management for builder owner */}
          {isOwner && inquiries.length > 0 && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div className="card__header">
                <h2>Inquiries ({inquiries.length})</h2>
              </div>
              <div className="card__body">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} style={{ borderBottom: '1px solid var(--color-border, #eee)', padding: '1rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <strong>
                        {inquiry.user_id ? (
                          <Link to={`/profile/${inquiry.user_id}`}>{inquiry.user_display_name || 'Unknown User'}</Link>
                        ) : (
                          'Unknown User'
                        )}
                      </strong>
                      <span className={`badge ${
                        inquiry.status === 'accepted' ? 'badge--success' :
                        inquiry.status === 'declined' ? 'badge--error' :
                        'badge--warning'
                      }`}>
                        {inquiry.status}
                      </span>
                    </div>
                    {inquiry.message && <p style={{ marginBottom: '0.5rem' }}>{inquiry.message}</p>}
                    <span className="text--muted" style={{ fontSize: '0.85rem' }}>
                      {formatDate(inquiry.created_at)}
                    </span>
                    {inquiry.status === 'pending' && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => handleInquiryStatus(inquiry.id, 'accepted')}
                          disabled={processingInquiryId === inquiry.id}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => handleInquiryStatus(inquiry.id, 'declined')}
                          disabled={processingInquiryId === inquiry.id}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ratings section */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card__header">
              <h2>Ratings ({ratings.length})</h2>
            </div>
            <div className="card__body">
              {/* Rating form */}
              {isAuthenticated && !isOwner && !hasRated && (
                <form onSubmit={handleSubmitRating} style={{ marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="rating-score">Your Rating</label>
                    <select
                      id="rating-score"
                      className="form-input"
                      value={ratingScore}
                      onChange={(e) => setRatingScore(e.target.value)}
                      style={{ width: 'auto' }}
                    >
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Great</option>
                      <option value="3">3 - Good</option>
                      <option value="2">2 - Fair</option>
                      <option value="1">1 - Poor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="rating-review">Review (optional)</label>
                    <textarea
                      id="rating-review"
                      className="form-input"
                      rows="3"
                      value={ratingReview}
                      onChange={(e) => setRatingReview(e.target.value)}
                      placeholder="Share your thoughts about this build..."
                    />
                  </div>
                  <button type="submit" className="btn btn--primary">Submit Rating</button>
                </form>
              )}

              {hasRated && (
                <div className="alert alert--info" style={{ marginBottom: '1rem' }}>
                  You have already rated this build.
                </div>
              )}

              {ratings.length === 0 ? (
                <p className="text--muted">No ratings yet. Be the first to rate this build.</p>
              ) : (
                <div className="rating-list">
                  {ratings.map((rating) => (
                    <div key={rating.id} style={{ borderBottom: '1px solid var(--color-border, #eee)', padding: '0.75rem 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>
                          {rating.user_id ? (
                            <Link to={`/profile/${rating.user_id}`}>
                              {rating.creator_display_name || 'Unknown User'}
                            </Link>
                          ) : (
                            'Unknown User'
                          )}
                        </strong>
                        <span>
                          {'★'.repeat(rating.score)}{'☆'.repeat(5 - rating.score)}
                        </span>
                      </div>
                      {rating.review_text && <p style={{ marginTop: '0.25rem' }}>{rating.review_text}</p>}
                      <span className="text--muted" style={{ fontSize: '0.85rem' }}>
                        {formatDate(rating.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comments section */}
          <div className="card">
            <div className="card__header">
              <h2>Comments ({comments.length})</h2>
            </div>
            <div className="card__body">
              {/* Comment form */}
              {isAuthenticated && (
                <form onSubmit={handleSubmitComment} style={{ marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <textarea
                      className="form-input"
                      rows="3"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Leave a comment..."
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn--primary">Post Comment</button>
                </form>
              )}

              {comments.length === 0 ? (
                <p className="text--muted">No comments yet. Start the conversation.</p>
              ) : (
                <div className="comment-list">
                  {commentTree.map(comment => renderComment(comment))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Builder info */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '1rem' }}>
            <div className="card__header">
              <h3>Builder</h3>
            </div>
            <div className="card__body">
              {build.creator_id ? (
                <div>
                  <h4>
                    <Link to={`/profile/${build.creator_id}`}>
                      {build.creator_display_name || 'Unknown Builder'}
                    </Link>
                  </h4>

                  {builderProfile && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {builderProfile.business_name && (
                        <p><strong>{builderProfile.business_name}</strong></p>
                      )}
                      {builderProfile.specialization && (
                        <p className="text--muted">{builderProfile.specialization}</p>
                      )}
                      <div style={{ marginTop: '0.5rem' }}>
                        {builderProfile.avg_rating != null && (
                          <p>
                            &#9733; {formatRating(builderProfile.avg_rating)} avg rating
                          </p>
                        )}
                        {builderProfile.completed_builds != null && (
                          <p>{builderProfile.completed_builds} builds completed</p>
                        )}
                        {builderProfile.years_of_experience != null && (
                          <p>{builderProfile.years_of_experience} years experience</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text--muted">Builder information unavailable.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
