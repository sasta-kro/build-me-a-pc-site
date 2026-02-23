import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, timeAgo, formatRating } from '../../utils/helpers';

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
  const {
    getItemById, getBuildParts, getRatings, getComments,
    isLiked, toggleLike, addRating, addComment, createItem,
    updateBuild, getBuilders, getRequests, getUserRating,
    checkCompatibility,
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

  // Rating form
  const [newScore, setNewScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [newReview, setNewReview] = useState('');
  const [hasRated, setHasRated] = useState(false);

  // Comment form
  const [newComment, setNewComment] = useState('');
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
  }, [id, user, getItemById, getBuildParts, getRatings, getComments, isLiked, getBuilders, getRequests, getUserRating, checkCompatibility]);

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

  const handleSubmitComment = useCallback(async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    try {
      await addComment(id, { content: newComment.trim(), parent_id: null });
      setNewComment('');
      const updatedComments = await getComments(id);
      setComments(updatedComments);
    } catch (err) {
      console.error('Failed to submit comment:', err);
    }
  }, [user, id, newComment, addComment, getComments]);

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
  const totalPrice = parts.reduce((sum, bp) => sum + (bp.part ? bp.part.price : 0), 0);
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
          <div className="build-detail__header">
            <h1>{build.title}</h1>
            {build.purpose && (
              <span className="badge badge--secondary">{build.purpose}</span>
            )}
            <p className="build-detail__author">
              by{' '}
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

          {/* Parts Table */}
          <div className="build-detail__parts">
            <h2>Parts List</h2>
            <table className="parts-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Part</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((bp) => (
                  <tr key={bp.id}>
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
                  <td colSpan="2"><strong>Total</strong></td>
                  <td><strong>{formatCurrency(totalPrice)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Compatibility */}
          {compatIssues.length > 0 && (
            <div className="build-detail__compatibility">
              <h2>Compatibility Check</h2>
              {errors.length > 0 && (
                <div className="compat-issues compat-issues--error">
                  <h3>Errors ({errors.length})</h3>
                  <ul>
                    {errors.map((issue, i) => (
                      <li key={i}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {warnings.length > 0 && (
                <div className="compat-issues compat-issues--warning">
                  <h3>Warnings ({warnings.length})</h3>
                  <ul>
                    {warnings.map((issue, i) => (
                      <li key={i}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {compatIssues.length === 0 && parts.length > 0 && (
            <div className="build-detail__compatibility">
              <div className="compat-issues compat-issues--success">
                <p>All parts are compatible!</p>
              </div>
            </div>
          )}

          {/* Social Actions */}
          <div className="social-actions">
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
          {ratings.length > 0 && (
            <div className="build-detail__ratings">
              <h2>Reviews ({ratings.length})</h2>
              <div className="ratings-list">
                {ratings.map(r => (
                  <div key={r.id} className="rating-item">
                    <div className="rating-item__header">
                      <span className="rating-item__user">
                        {r.creator_display_name || 'Unknown User'}
                      </span>
                      <StarDisplay score={r.score} />
                      <span className="rating-item__date">{formatDate(r.created_at)}</span>
                    </div>
                    {r.review_text && (
                      <p className="rating-item__review">{r.review_text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="build-detail__comments">
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

            {/* New comment form */}
            {isAuthenticated && (
              <form className="comment-form" onSubmit={handleSubmitComment}>
                <h3>Add a Comment</h3>
                <textarea
                  className="form__textarea"
                  placeholder="Share your thoughts on this build..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <button type="submit" className="btn btn--primary" disabled={!newComment.trim()}>
                  Post Comment
                </button>
              </form>
            )}
            {!isAuthenticated && (
              <p className="comments-login">
                <Link to="/login">Log in</Link> to leave a comment or rating.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="build-detail__sidebar">
          <div className="card">
            <div className="card__body">
              <h3 className="card__title">Build Info</h3>
              <dl className="info-list">
                <dt>Creator</dt>
                <dd>
                  {build.creator_display_name ? (
                    <Link to={`/profile/${build.creator_id}`}>{build.creator_display_name}</Link>
                  ) : (
                    'Unknown'
                  )}
                </dd>
                <dt>Created</dt>
                <dd>{formatDate(build.created_at)}</dd>
                <dt>Status</dt>
                <dd>
                  <span className="badge">{build.status}</span>
                </dd>
                <dt>Total Price</dt>
                <dd>{formatCurrency(totalPrice)}</dd>
              </dl>

              {isOwner && (
                <div className="card__actions">
                  <Link to={`/builds/${build.id}/edit`} className="btn btn--secondary btn--block">
                    Edit Build
                  </Link>
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
            <div className="card">
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
