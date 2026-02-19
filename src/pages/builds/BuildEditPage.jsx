import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/helpers';

export default function BuildEditPage() {
  const { user } = useAuth();
  const { getCategories, getParts, saveBuild, getItemById, getBuildParts, checkCompatibility } =
    useData();
  const navigate = useNavigate();
  const { id } = useParams();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedParts, setSelectedParts] = useState({});
  const [categories, setCategories] = useState([]);
  const [partsByCategory, setPartsByCategory] = useState({});
  const [compatibilityIssues, setCompatibilityIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load categories, parts, and existing build data on mount
  useEffect(() => {
    const load = async () => {
      try {
        const build = await getItemById('builds', id);

        if (!build) {
          navigate('/builds', { replace: true });
          return;
        }

        // Only the build owner can edit
        if (user?.id !== build.creator_id) {
          navigate(`/builds/${id}`, { replace: true });
          return;
        }

        // Populate form fields from existing build
        setTitle(build.title || '');
        setDescription(build.description || '');
        setPurpose(build.purpose || '');

        // Load categories and parts
        const cats = await getCategories();
        setCategories(cats);

        const partsMap = {};
        await Promise.all(
          cats.map(async (cat) => {
            partsMap[cat.id] = await getParts(cat.id);
          })
        );
        setPartsByCategory(partsMap);

        // Load existing build parts and map them to category slugs
        const existingBuildParts = await getBuildParts(id);
        const partsSelection = {};
        existingBuildParts.forEach((bp) => {
          if (bp.category) {
            const slug = bp.category.name?.toLowerCase().replace(/\s+/g, '-') || '';
            partsSelection[slug] = bp.part_id;
          }
        });
        setSelectedParts(partsSelection);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user, navigate, getCategories, getParts, getItemById, getBuildParts]);

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
        if (!cancelled) setCompatibilityIssues(issues);
      } catch {
        if (!cancelled) setCompatibilityIssues([]);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [selectedPartObjects, checkCompatibility]);

  const hasErrors = compatibilityIssues.some((i) => i.severity === 'error');

  // Calculate total price
  const totalPrice = useMemo(() => {
    return Object.values(selectedPartObjects).reduce(
      (sum, part) => sum + (part.price || 0),
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
    setSaving(true);

    try {
      const buildData = {
        id,
        title: title.trim(),
        description: description.trim(),
        purpose: purpose.trim(),
        total_price: totalPrice,
        status,
      };

      const build = await saveBuild(buildData, selectedParts);
      navigate(`/builds/${build.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Edit Build</h1>
        <p>Modify parts and details for your PC build.</p>
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

            <div className="summary-panel__actions">
              <button
                type="button"
                className="btn btn--outline btn--block"
                onClick={(e) => handleSave(e, 'draft')}
                disabled={!title.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={(e) => handleSave(e, 'published')}
                disabled={!title.trim() || hasErrors || saving}
              >
                {saving ? 'Publishing...' : 'Publish Build'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
