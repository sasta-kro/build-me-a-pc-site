import { useState, useEffect, useCallback } from 'react';
import {useParams, Link, Navigate, useNavigate} from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, timeAgo, formatRating } from '../../utils/helpers';

const PLACEHOLDER_IMAGE = 'https://www.shutterstock.com/image-vector/gaming-pc-wireframe-drawing-line-600nw-2588972631.jpg';

// Build a tree of comments from a flat array
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

// Render filled/empty stars for a given score out of 5
function StarDisplay({ score }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className={i <= Math.round(score) ? 'star star--filled' : 'star'}
      >
        &#9733;
      </span>
    );
  }
  return <span className="star-display">{stars}</span>;
}

// Recursive comment renderer component
function CommentItem({ comment, isAuthenticated, replyTo, setReplyTo, replyText, setReplyText, handleSubmitReply, isReply = false }) {
  return (
    <div className={`comment ${isReply ? 'comment--reply' : ''}`}>
      <div className="comment__header">
        <span className="comment__author">
          {comment.creator_display_name || 'Unknown User'}
        </span>
        <span className="comment__date">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="comment__content">{comment.content}</p>
      {isAuthenticated && (
        <button
          className="comment__reply-btn"
          onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
        >
          {replyTo === comment.id ? 'Cancel' : 'Reply'}
        </button>
      )}

      {replyTo === comment.id && (
        <form className="comment-form comment-form--reply" onSubmit={handleSubmitReply}>
          <textarea
            className="form__textarea"
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
          />
          <button type="submit" className="btn btn--primary btn--sm" disabled={!replyText.trim()}>
            Post Reply
          </button>
        </form>
      )}

      {comment.replies.length > 0 && (
        <div className="comment__replies">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isAuthenticated={isAuthenticated}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyText={replyText}
              setReplyText={setReplyText}
              handleSubmitReply={handleSubmitReply}
              isReply={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BuildDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate()
  const {
    getItemById, getBuildParts, getRatings, getComments,
    isLiked, toggleLike, addRating, addComment, createItem,
    updateBuild, getBuilders, getRequests, getUserRating,
    checkCompatibility, removeItem, getInquiries, updateInquiry
  } = useData();
  const { user, isAuthenticated, isBuilder } = useAuth();

  const [build, setBuild] = useState(null);
  const [parts, setParts] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [compatIssues, setCompatIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [inquiries, setInquiries] = useState([]);
  const [processingInquiryId, setProcessingInquiryId] = useState(null);

  // Rating form
  const [newScore, setNewScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [newReview, setNewReview] = useState('');
  const [hasRated, setHasRated] = useState(false);

  // Comment form
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Request form
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestBudget, setRequestBudget] = useState('');
  const [requestPurpose, setRequestPurpose] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestPreferredBuilder, setRequestPreferredBuilder] = useState('');
  const [requestCreated, setRequestCreated] = useState(false);
  const [builders, setBuilders] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const b = await getItemById('builds', id);
      if (!b) {
        setLoading(false);
        return;
      }
      setBuild(b);
      setLikeCount(b.like_count || 0);

      const bp = await getBuildParts(id);
      setParts(bp);

      // Build compatibility map
      const partMap = {};
      bp.forEach(({ part, category }) => {
        if (part && category) {
          const slug = category.name?.toLowerCase().replace(/\s+/g, '-') || '';
          partMap[slug] = part;
        }
      });

      // Run server-side compatibility check
      if (Object.keys(partMap).length >= 2) {
        try {
          const issues = await checkCompatibility(partMap);
          setCompatIssues(issues);
        } catch {
          setCompatIssues([]);
        }
      } else {
        setCompatIssues([]);
      }

      const [ratingsData, commentsData, buildersData] = await Promise.all([
        getRatings(id),
        getComments(id),
        getBuilders(),
      ]);

      setRatings(ratingsData);
      setComments(commentsData);
      setBuilders(buildersData.filter(u => u.role === 'builder'));

      // Load active requests for this build
      try {
        const allRequests = await getRequests({ build_id: id });
        const active = allRequests.find(r => r.status === 'open' || r.status === 'claimed');
        setActiveRequest(active || null);
      } catch {
        setActiveRequest(null);
      }

      // Load inquiries for builder owners of showcase builds
      if (user && user.id === b.creator_id && b.build_type === 'showcase') {
        try {
          const inquiriesData = await getInquiries({ build_id: id });
          setInquiries(inquiriesData);
        } catch {
          setInquiries([]);
        }
      }

      if (user) {
        const [likedStatus, userRating] = await Promise.all([
          isLiked(id),
          getUserRating(id),
        ]);
        setHasLiked(likedStatus);
        setHasRated(!!userRating);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [id, user, getItemById, getBuildParts, getRatings, getComments, isLiked, getBuilders, getRequests, getUserRating, checkCompatibility, getInquiries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleLike = useCallback(async () => {
    if (!user) return;
    try {
      const nowLiked = await toggleLike(id);
      setHasLiked(nowLiked);
      setLikeCount(prev => nowLiked ? prev + 1 : Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  }, [user, id, toggleLike]);

  const handleSubmitRating = useCallback(async (e) => {
    e.preventDefault();
    if (!user || newScore === 0) return;
    try {
      await addRating(id, { score: newScore, review: newReview.trim() || null });
      setHasRated(true);
      setNewScore(0);
      setHoverScore(0);
      setNewReview('');
      const updatedRatings = await getRatings(id);
      setRatings(updatedRatings);
      // Refresh build to get updated avg
      const updated = await getItemById('builds', id);
      if (updated) setBuild(updated);
    } catch (err) {
      console.error('Failed to submit rating:', err);
    }
  }, [user, id, newScore, newReview, addRating, getRatings, getItemById]);

  const handleDelete = async (buildId, buildName) => {
      if (!window.confirm(`Are you sure you want to delete "${buildName}"?`)) return;
      try {
          await removeItem('builds', buildId);
          navigate('/builds')
      } catch (err) {
          setError(err.response?.data?.error || err.message);
      }
  };

  const handleCreateRequest = useCallback(async (e) => {
    e.preventDefault();
    if (!user || !build) return;
    try {
      // Double-check no active request exists
      const allRequests = await getRequests({ build_id: build.id });
      const existingActive = allRequests.filter(r => r.status === 'open' || r.status === 'claimed');
      if (existingActive.length > 0) return;

      await createItem('build_requests', {
        build_id: build.id,
        budget: Number(requestBudget) || 0,
        purpose: requestPurpose.trim() || null,
        notes: requestNotes.trim() || null,
        preferred_builder_id: requestPreferredBuilder || null,
        status: 'open',
      });
      setRequestCreated(true);
      setShowRequestForm(false);
    } catch (err) {
      console.error('Failed to create request:', err);
    }
  }, [user, build, requestBudget, requestPurpose, requestNotes, requestPreferredBuilder, createItem, getRequests]);

  const handleSubmitReply = useCallback(async (e) => {
    e.preventDefault();
    if (!user || !replyText.trim() || !replyTo) return;
    try {
      await addComment(id, { content: replyText.trim(), parent_id: replyTo });
      setReplyTo(null);
      setReplyText('');
      const updatedComments = await getComments(id);
      setComments(updatedComments);
    } catch (err) {
      console.error('Failed to submit reply:', err);
    }
  }, [user, id, replyTo, replyText, addComment, getComments]);

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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!build) {
    return (
      <div className="page">
        <h1>Build Not Found</h1>
        <p>The build you are looking for does not exist or has been removed.</p>
        <Link to="/builds" className="btn btn--primary">Back to Builds</Link>
      </div>
    );
  }

  const isOwner = user && user.id === build.creator_id;
  const commentTree = buildCommentTree(comments);
  const errors = compatIssues.filter(i => i.severity === 'error');
  const warnings = compatIssues.filter(i => i.severity === 'warning');
  const hasActiveRequest = !!activeRequest;
  const isOwnRequest = activeRequest && user && activeRequest.creator_id === user.id;

  return (
    <div className="page">
      <div className="build-detail">
        <div className="build-detail__main">

          {/* Header */}
          <div className="card" style={{marginBottom: '2rem'}}>
            <h1>{build.title}</h1>
            {build.purpose && (
              <span className="badge badge--secondary">{build.purpose}</span>
            )}
            <p className="build-detail__author">
              By{' '}
              {build.creator_display_name ? (
                <Link to={`/profile/${build.creator_id}`}>{build.creator_display_name}</Link>
              ) : (
                'Unknown'
              )}
              {' '}&middot; {formatDate(build.created_at)}
            </p>
            {build.description && (
              <p className="build-detail__description">{build.description}</p>
            )}
          </div>

          {/* Image Gallery */}
          {build.image_urls && build.image_urls.length > 0 && (
            <div className="build-gallery" style={{marginBottom: '2rem'}}>
              <div className="build-gallery__main">
                <img
                  src={build.image_urls[selectedImageIndex]}
                  alt={build.title}
                  className="build-gallery__image"
                  style={{width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: 'var(--radius-lg, 8px)'}}
                />
              </div>
              {build.image_urls.length > 1 && (
                <div className="build-gallery__thumbs" style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem', overflowX: 'auto'}}>
                  {build.image_urls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`${build.title} ${idx + 1}`}
                      className="build-gallery__thumb"
                      onClick={() => setSelectedImageIndex(idx)}
                      style={{width: '80px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm, 4px)', cursor: 'pointer', opacity: idx === selectedImageIndex ? 1 : 0.6, border: idx === selectedImageIndex ? '2px solid var(--color-primary)' : '2px solid transparent'}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parts Table */}
          <div className="build-detail__parts" style={{marginBottom: '1rem'}}>
            <h2>Parts List</h2>
            <table className="parts-table">
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
                    <td>
                      {bp.part ? (
                        <>
                          <strong>{bp.part.name}</strong>
                          {bp.part.brand && (
                            <span className="parts-table__manufacturer">
                              {' '}({bp.part.brand})
                            </span>
                          )}
                        </>
                      ) : (
                        <em>Part not found</em>
                      )}
                    </td>
                    <td>{bp.part ? formatCurrency(bp.part.price) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3"><strong>Total</strong></td>
                  <td><strong>{formatCurrency(build.total_price)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Compatibility */}
          {compatIssues.length === 0 ? (
              <div className="card" style={{marginBottom: '2rem'}}>
                <h2>Compatibility Check</h2>
                <div className="alert alert--success" style={{marginBottom: '1rem', marginTop: '1rem'}}>
                  <p>All parts are compatible!</p>
                </div>
              </div>
          ) : (
              <div className="card" style={{marginBottom: '2rem'}}>
              <h2>Compatibility Check</h2>
              {errors.length > 0 && (
                <div className="compat-issues compat-issues--error">
                  <h3>Errors ({errors.length})</h3>
                  <ul>
                    {errors.map((issue, i) => (
                      <li key={i}>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {warnings.length > 0 && (
                <div className="compat-issues compat-issues--warning">
                  <h3 style={{marginBottom: '0.5rem'}}>Warnings ({warnings.length})</h3>
                  <ul>
                    {warnings.map((issue, i) => (
                      <ul className="alert alert--warning" key={i}>
                        {issue.message}
                      </ul>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* likes, avg rating */}
          <div className="social-actions card" style={{marginBottom: '2rem'}}>
            {isAuthenticated && (
              <button
                className={hasLiked ? 'like-btn like-btn--liked' : 'like-btn'}
                onClick={handleToggleLike}
              >
                &#9829; {likeCount}
              </button>
            )}
            {!isAuthenticated && (
              <span className="like-btn like-btn--disabled">&#9829; {likeCount}</span>
            )}
            <span className="social-actions__rating">
              <StarDisplay score={Number(build.rating_avg) || 0} />
              {' '}
              {formatRating(build.rating_avg)} ({build.rating_count || 0} ratings)
            </span>
          </div>

          {/* Rating Form */}
          {isAuthenticated && !hasRated && !isOwner && (
            <div className="build-detail__rating-form">
              <h2>Rate This Build</h2>
              <form onSubmit={handleSubmitRating}>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={
                        star <= (hoverScore || newScore)
                          ? 'star-rating__star star-rating__star--filled'
                          : 'star-rating__star'
                      }
                      onClick={() => setNewScore(star)}
                      onMouseEnter={() => setHoverScore(star)}
                      onMouseLeave={() => setHoverScore(0)}
                    >
                      &#9733;
                    </button>
                  ))}
                </div>
                <textarea
                  className="form__textarea"
                  placeholder="Write a review (optional)..."
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  rows={3}
                />
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={newScore === 0}
                >
                  Submit Rating
                </button>
              </form>
            </div>
          )}

          {/* Ratings List */}
          <div className="card" style={{marginBottom: '2rem'}}>
            <div className="card__title">
              <h2>Ratings ({ratings.length})</h2>
            </div>
            {ratings.length === 0 ? (
                <p className="text-muted">No ratings yet.</p>
            ) : (
                <div className="card__body">
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
                </div>
            )}
        </div>

          {/* Comments Section */}
          <div className="build-detail__comments card">
            <h2>Comments ({comments.length})</h2>

            {commentTree.length > 0 ? (
              <div className="comments-list">
                {commentTree.map(comment => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    isAuthenticated={isAuthenticated}
                    replyTo={replyTo}
                    setReplyTo={setReplyTo}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    handleSubmitReply={handleSubmitReply}
                    isReply={false}
                  />
                ))}
              </div>
            ) : (
                <p className="comments-empty">No comments yet. Be the first to share your thoughts!</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="build-detail__sidebar">

          {/* Build info */}
          <div className="card" style={{marginBottom: '2rem'}}>
            <div className="card__body">
              <h3 className="card__header">Build Info</h3>
              <div className="card__body">

                <dl className="build-detail__info">
                  <dt style={{fontWeight: 'bold'}}>Creator</dt>
                  <dd style={{fontWeight: 'bold'}}>
                    {build.creator_display_name ?
                        ( <Link to={`/profile/${build.creator_id}`}>{build.creator_display_name}</Link> )
                        :
                        ( 'Unknown' )
                    }
                  </dd>
                </dl>

                <dl className="build-detail__info">
                  <dt>Created</dt>
                  <dd>{formatDate(build.created_at)}</dd>
                </dl>

                <dl className="build-detail__info">
                  <dt>Status</dt>
                  <dd>
                    <span className="badge--success badge">{build.status}</span>
                  </dd>
                </dl>
                <dl className="build-detail__info">
                  <dt>Total Price</dt>
                  <dd>{formatCurrency(build.total_price)}</dd>
                </dl>
              </div>

              {/* Build actions */}
              {isOwner && (
                <div className="build-card__actions">
                    <div className="build-actions__edit-del">
                        <Link to={`/builds/${build.id}/edit`} className="btn btn--secondary btn--block">
                            Edit Build
                        </Link>
                        <button
                            className="btn btn--danger btn--block"
                            onClick={() => handleDelete(build.id, build.title)}
                        >
                            Delete
                        </button>
                    </div>
                  {isBuilder && build.status === 'published' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 0' }}>
                      <input
                        type="checkbox"
                        checked={build.build_type === 'showcase'}
                        onChange={async () => {
                          try {
                            const newType = build.build_type === 'showcase' ? 'personal' : 'showcase';
                            await updateBuild(build.id, { build_type: newType });
                            setBuild({ ...build, build_type: newType });
                          } catch (err) {
                            console.error('Failed to update build type:', err);
                          }
                        }}
                      />
                      Show in Showcase
                    </label>
                  )}
                  {build.status === 'published' && !hasActiveRequest && !requestCreated && (
                    <button
                      className="btn btn--primary btn--block"
                      onClick={() => setShowRequestForm(!showRequestForm)}
                    >
                      {showRequestForm ? 'Cancel' : 'Post to Request Board'}
                    </button>
                  )}
                  {requestCreated && (
                    <div className="alert alert--success">Request posted!</div>
                  )}
                  {hasActiveRequest && !requestCreated && (
                    <p className="text--muted">
                      {isOwnRequest
                        ? 'You already have an active request for this build.'
                        : 'This build already has an active request.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Request Form */}
          {showRequestForm && (
            <div className="card" style={{marginBottom: '2rem'}}>
              <div className="card__body">
                <h3 className="card__title">Post Request</h3>
                <form onSubmit={handleCreateRequest}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="req-budget">Budget ($)</label>
                    <input
                      id="req-budget"
                      type="number"
                      className="form-input"
                      min="0"
                      step="0.01"
                      value={requestBudget}
                      onChange={(e) => setRequestBudget(e.target.value)}
                      placeholder="Your budget for this build"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="req-purpose">Purpose</label>
                    <input
                      id="req-purpose"
                      type="text"
                      className="form-input"
                      value={requestPurpose}
                      onChange={(e) => setRequestPurpose(e.target.value)}
                      placeholder="e.g., Gaming, Workstation"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="req-notes">Notes</label>
                    <textarea
                      id="req-notes"
                      className="form-input"
                      rows="3"
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      placeholder="Any additional details for the builder"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="req-preferred-builder">Preferred Builder (optional)</label>
                    <select
                      id="req-preferred-builder"
                      className="form-input"
                      value={requestPreferredBuilder}
                      onChange={(e) => setRequestPreferredBuilder(e.target.value)}
                    >
                      <option value="">No preference</option>
                      {builders.map(b => (
                        <option key={b.id} value={b.id}>{b.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn--primary btn--block">
                    Submit Request
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Inquiries for builder owner */}
          {isOwner && inquiries.length > 0 && (
            <div className="card" style={{marginBottom: '2rem'}}>
              <div className="card__header">
                <h3 className="card__title">Inquiries ({inquiries.length})</h3>
              </div>
              <div className="card__body">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} style={{ borderBottom: '1px solid var(--color-border, #eee)', padding: '0.75rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '0.9rem' }}>
                        {inquiry.user_id ? (
                          <Link to={`/profile/${inquiry.user_id}`}>{inquiry.user_display_name || 'Unknown'}</Link>
                        ) : (
                          'Unknown'
                        )}
                      </strong>
                      <span className={`badge ${
                        inquiry.status === 'accepted' ? 'badge--success' :
                        inquiry.status === 'declined' ? 'badge--error' :
                        'badge--warning'
                      }`} style={{ fontSize: '0.75rem' }}>
                        {inquiry.status}
                      </span>
                    </div>
                    {inquiry.message && <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>{inquiry.message}</p>}
                    <span className="text--muted" style={{ fontSize: '0.75rem' }}>
                      {formatDate(inquiry.created_at)}
                    </span>
                    {inquiry.status === 'pending' && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
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

          <div className="card">
            <div className="card__body">
              <h3 className="card__title">Share</h3>
              <p className="card__text">
                Share this build with others by copying the URL from your browser address bar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
