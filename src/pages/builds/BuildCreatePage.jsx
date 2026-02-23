import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/helpers';

const REQUIRED_PARTS = ['cpu', 'motherboard', 'ram', 'psu', 'case'];

function getMissingParts(selectedParts) {
  const present = Object.keys(selectedParts).filter(k => selectedParts[k]);
  return REQUIRED_PARTS.filter(p => !present.includes(p));
}

export default function BuildCreatePage() {
  const { getCategories, getParts, saveBuild, createItem, checkCompatibility } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRequestMode = searchParams.get('request') === 'true';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');

  // Request-specific fields
  const [budget, setBudget] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [selectedParts, setSelectedParts] = useState({});
  const [categories, setCategories] = useState([]);
  const [partsByCategory, setPartsByCategory] = useState({});
  const [compatibilityIssues, setCompatibilityIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load categories and parts on mount
  useEffect(() => {
    const load = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);

        const partsMap = {};
        await Promise.all(
          cats.map(async (cat) => {
            partsMap[cat.id] = await getParts(cat.id);
          })
        );
        setPartsByCategory(partsMap);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getCategories, getParts]);

  // Build a map of category slug -> full part object for compatibility checking
  const selectedPartObjects = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      const slug = cat.category_name?.toLowerCase().replace(/\s+/g, '-') || '';
      const partId = selectedParts[slug];
      if (partId) {
        const parts = partsByCategory[cat.id] || [];
        const part = parts.find((p) => p.id === partId);
        if (part) map[slug] = part;
      }
    });
    return map;
  }, [selectedParts, categories, partsByCategory]);

  // Run compatibility checks via API
  useEffect(() => {
    const keys = Object.keys(selectedPartObjects);
    if (keys.length < 2) {
      setCompatibilityIssues([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const issues = await checkCompatibility(selectedPartObjects);
        if (!cancelled) setCompatibilityIssues(issues || []);
      } catch (err) {
        console.error('Compatibility check failed:', err);
        if (!cancelled) {
          setCompatibilityIssues([{
            severity: 'warning',
            message: 'Could not verify compatibility. Please check your connection.',
          }]);
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [selectedPartObjects, checkCompatibility]);

  const hasErrors = compatibilityIssues.some((i) => i.severity === 'error');

  const missingParts = getMissingParts(selectedParts);
  const canSave = title.trim() && missingParts.length === 0 && !hasErrors;

  // Calculate total price
  const totalPrice = useMemo(() => {
    return Object.values(selectedPartObjects).reduce(
      (sum, part) => sum + (Number(part.price) || 0),
      0
    );
  }, [selectedPartObjects]);

  const handlePartSelect = (slug, partId) => {
    setSelectedParts((prev) => ({
      ...prev,
      [slug]: partId || null,
    }));
  };

  const handleSave = async (e, status) => {
    e.preventDefault();

    if (!title.trim() || saving) return;

    const missingParts = getMissingParts(selectedParts);
    if (missingParts.length > 0) {
      setError(`Missing required parts: ${missingParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}`);
      return;
    }

    if (status === 'published') {
      try {
        const issues = await checkCompatibility(selectedPartObjects);
        const errors = (issues || []).filter(i => i.severity === 'error');
        if (errors.length > 0) {
          setCompatibilityIssues(issues);
          setError('Cannot publish build with compatibility errors. Please fix the issues above.');
          return;
        }
      } catch {
        setError('Could not verify compatibility. Please check your connection and try again.');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const buildData = {
        title: title.trim(),
        description: description.trim(),
        purpose: purpose.trim(),
        total_price: totalPrice,
        status,
        build_type: 'personal',
        availability_status: null,
        image_urls: [],
        specs_summary: null,
        like_count: 0,
        rating_avg: 0,
        rating_count: 0,
      };

      const build = await saveBuild(buildData, selectedParts);

      if (isRequestMode) {
        await createItem('build_requests', {
          build_id: build.id,
          budget: Number(budget) || 0,
          purpose: purpose.trim() || null,
          notes: requestNotes.trim() || null,
          preferred_builder_id: null,
          status: 'open',
        });
        navigate('/requests');
      } else {
        navigate(`/builds/${build.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1>{isRequestMode ? 'Post a Build Request' : 'Create a New Build'}</h1>
        <p>
          {isRequestMode
            ? 'Select the parts you want, then submit your request for a builder to assemble it.'
            : 'Select parts across all categories to assemble your PC build.'}
        </p>
      </div>

      <div className="part-picker">
        <div className="part-picker__categories">
          <form onSubmit={(e) => handleSave(e, 'published')}>
            <div className="form-group">
              <label className="form-label" htmlFor="build-title">
                Build Title
              </label>
              <input
                id="build-title"
                className="form-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ultimate Gaming Rig"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="build-description">
                Description
              </label>
              <textarea
                id="build-description"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your build..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="build-purpose">
                Purpose
              </label>
              <input
                id="build-purpose"
                className="form-input"
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Gaming, Content Creation, Workstation"
              />
            </div>

            {isRequestMode && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="build-budget">
                    Budget ($)
                  </label>
                  <input
                    id="build-budget"
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Your total budget for this build"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="build-notes">
                    Notes for Builder
                  </label>
                  <textarea
                    id="build-notes"
                    className="form-input"
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="Any additional details or preferences for the builder..."
                    rows={3}
                  />
                </div>
              </>
            )}

            <hr />

            {categories.map((cat) => {
              const slug = cat.category_name?.toLowerCase().replace(/\s+/g, '-') || '';
              const parts = partsByCategory[cat.id] || [];
              const selectedId = selectedParts[slug] || '';
              const selectedPart = parts.find((p) => p.id === selectedId);

              return (
                <div className="part-category" key={cat.id}>
                  <label className="part-category__label">{cat.category_name}</label>
                  <select
                    className="form-select part-category__select"
                    value={selectedId}
                    onChange={(e) => handlePartSelect(slug, e.target.value)}
                  >
                    <option value="">-- Select {cat.category_name} --</option>
                    {parts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.name} - {formatCurrency(part.price)}
                      </option>
                    ))}
                  </select>
                  <span className="part-category__price">
                    {selectedPart ? formatCurrency(selectedPart.price) : ''}
                  </span>
                </div>
              );
            })}
          </form>
        </div>

        <div className="part-picker__sidebar">
          <div className="summary-panel">
            <img
              className="summary-panel__image"
              src="https://www.shutterstock.com/image-vector/gaming-pc-wireframe-drawing-line-600nw-2588972631.jpg"
              alt="PC Build"
            />
            <h2>Build Summary</h2>

            {categories.map((cat) => {
              const slug = cat.category_name?.toLowerCase().replace(/\s+/g, '-') || '';
              const partId = selectedParts[slug];
              const parts = partsByCategory[cat.id] || [];
              const part = parts.find((p) => p.id === partId);
              if (!part) return null;

              return (
                <div className="summary-panel__item" key={cat.id}>
                  <span>{cat.category_name}:</span>
                  <span>
                    {part.name} — {formatCurrency(part.price)}
                  </span>
                </div>
              );
            })}

            <div className="summary-panel__total">
              <strong>Total:</strong> {formatCurrency(totalPrice)}
            </div>

            {compatibilityIssues.length > 0 && (
              <div className="compat-panel">
                <h3>Compatibility</h3>
                {compatibilityIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`compat-alert compat-alert--${issue.severity}`}
                  >
                    <span className="compat-alert__icon">
                      {issue.severity === 'error' ? '\u2718' : '\u26A0'}
                    </span>
                    {issue.message}
                  </div>
                ))}
              </div>
            )}

            {missingParts.length > 0 && (
              <div className="compat-panel">
                <h3>Required Parts</h3>
                <div className="compat-alert compat-alert--error">
                  <span className="compat-alert__icon">{'\u2718'}</span>
                  Missing: {missingParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                </div>
              </div>
            )}

            <div className="summary-panel__actions">
              {isRequestMode ? (
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={(e) => handleSave(e, 'published')}
                  disabled={!canSave || hasErrors || saving}
                >
                  {saving ? 'Submitting...' : 'Submit Request'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn--outline btn--block"
                    onClick={(e) => handleSave(e, 'draft')}
                    disabled={!canSave || saving}
                  >
                    {saving ? 'Saving...' : 'Save as Draft'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--block"
                    onClick={(e) => handleSave(e, 'published')}
                    disabled={!canSave || hasErrors || saving}
                  >
                    {saving ? 'Publishing...' : 'Publish Build'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
