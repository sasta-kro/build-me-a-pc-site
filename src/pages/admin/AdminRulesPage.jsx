import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';

const RULE_TYPES = [
  { value: 'field_match', label: 'Field Match', description: 'Check if two fields are equal' },
  { value: 'field_lte', label: 'Field ≤', description: 'Check if field A is less than or equal to field B' },
  { value: 'array_contains', label: 'Array Contains', description: 'Check if field A value is in field B array' },
  { value: 'array_contains_formatted', label: 'Array Contains (Formatted)', description: 'Check if formatted field A value is in field B array' },
  { value: 'sum_gte', label: 'Sum ≥ Target', description: 'Check if sum of fields is at least target value' },
  { value: 'pair_mismatch', label: 'Pair Mismatch', description: 'Check for specific value pair combinations' },
];

const PART_SLUGS = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling'];

const PART_FIELDS = {
  cpu: ['socket', 'cores', 'threads', 'base_clock_ghz', 'boost_clock_ghz', 'tdp_watts', 'integrated_graphics'],
  gpu: ['interface', 'vram_gb', 'vram_type', 'length_mm', 'tdp_watts', 'recommended_psu_watts', 'slots_occupied'],
  motherboard: ['socket', 'form_factor', 'chipset', 'ram_type', 'ram_slots', 'max_ram_gb', 'm2_slots', 'pcie_x16_slots'],
  ram: ['type', 'speed_mhz', 'capacity_gb', 'modules', 'total_capacity_gb', 'cas_latency'],
  storage: ['type', 'interface', 'capacity_gb', 'read_speed_mbps', 'write_speed_mbps', 'form_factor'],
  psu: ['wattage', 'efficiency_rating', 'modular', 'form_factor'],
  case: ['form_factor', 'supported_motherboards', 'max_gpu_length_mm', 'max_cooler_height_mm', 'max_psu_length_mm', 'drive_bays_3_5', 'drive_bays_2_5', 'included_fans', 'radiator_support'],
  cooling: ['type', 'socket_compatibility', 'radiator_size_mm', 'height_mm', 'fan_count', 'tdp_rating_watts'],
};

const EMPTY_RULE = {
  rule_number: '',
  name: '',
  description: '',
  severity: 'error',
  rule_config: { type: 'field_match', part_a: '', part_b: '', field_a: '', field_b: '' },
  message_template: '',
  is_active: true,
};

export default function AdminRulesPage() {
  const { getCompatibilityRules, createCompatibilityRule, updateCompatibilityRule, deleteCompatibilityRule } = useData();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingRule, setViewingRule] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRule, setNewRule] = useState(EMPTY_RULE);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCompatibilityRules]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await getCompatibilityRules();
      setRules(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      const updated = await updateCompatibilityRule(rule.id, { is_active: !rule.is_active });
      setRules(rules.map(r => r.id === rule.id ? updated : r));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSeverityChange = async (rule, newSeverity) => {
    try {
      const updated = await updateCompatibilityRule(rule.id, { severity: newSeverity });
      setRules(rules.map(r => r.id === rule.id ? updated : r));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleDelete = async (rule) => {
    try {
      await deleteCompatibilityRule(rule.id);
      setRules(rules.filter(r => r.id !== rule.id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const created = await createCompatibilityRule({
        ...newRule,
        rule_number: parseInt(newRule.rule_number, 10),
      });
      setRules([...rules, created].sort((a, b) => a.rule_number - b.rule_number));
      setShowCreateModal(false);
      setNewRule(EMPTY_RULE);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEditRule = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updated = await updateCompatibilityRule(editingRule.id, {
        rule_number: parseInt(editingRule.rule_number, 10),
        name: editingRule.name,
        description: editingRule.description,
        severity: editingRule.severity,
        message_template: editingRule.message_template,
        rule_config: editingRule.rule_config,
        is_active: editingRule.is_active,
      });
      setRules(rules.map(r => r.id === editingRule.id ? updated : r).sort((a, b) => a.rule_number - b.rule_number));
      setEditingRule(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateRuleConfig = (key, value) => {
    setNewRule(prev => ({
      ...prev,
      rule_config: { ...prev.rule_config, [key]: value },
    }));
  };

  const renderRuleConfigFields = (rule, onConfigChange) => {
    const type = rule.rule_config.type;

    switch (type) {
      case 'field_match':
      case 'field_lte':
      case 'array_contains':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Part A</label>
              <select
                className="form-select"
                value={rule.rule_config.part_a || ''}
                onChange={(e) => onConfigChange('part_a', e.target.value)}
              >
                <option value="">Select part</option>
                {PART_SLUGS.map(slug => <option key={slug} value={slug}>{slug.charAt(0).toUpperCase() + slug.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Field A</label>
              <select
                className="form-select"
                value={rule.rule_config.field_a || ''}
                onChange={(e) => onConfigChange('field_a', e.target.value)}
                disabled={!rule.rule_config.part_a}
              >
                <option value="">Select field</option>
                {(PART_FIELDS[rule.rule_config.part_a] || []).map(field => <option key={field} value={field}>{field}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Part B</label>
              <select
                className="form-select"
                value={rule.rule_config.part_b || ''}
                onChange={(e) => onConfigChange('part_b', e.target.value)}
              >
                <option value="">Select part</option>
                {PART_SLUGS.map(slug => <option key={slug} value={slug}>{slug.charAt(0).toUpperCase() + slug.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Field B</label>
              <select
                className="form-select"
                value={rule.rule_config.field_b || ''}
                onChange={(e) => onConfigChange('field_b', e.target.value)}
                disabled={!rule.rule_config.part_b}
              >
                <option value="">Select field</option>
                {(PART_FIELDS[rule.rule_config.part_b] || []).map(field => <option key={field} value={field}>{field}</option>)}
              </select>
            </div>
          </>
        );

      case 'array_contains_formatted':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Part A</label>
              <select
                className="form-select"
                value={rule.rule_config.part_a || ''}
                onChange={(e) => onConfigChange('part_a', e.target.value)}
              >
                <option value="">Select part</option>
                {PART_SLUGS.map(slug => <option key={slug} value={slug}>{slug.charAt(0).toUpperCase() + slug.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Field A</label>
              <select
                className="form-select"
                value={rule.rule_config.field_a || ''}
                onChange={(e) => onConfigChange('field_a', e.target.value)}
                disabled={!rule.rule_config.part_a}
              >
                <option value="">Select field</option>
                {(PART_FIELDS[rule.rule_config.part_a] || []).map(field => <option key={field} value={field}>{field}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Part B</label>
              <select
                className="form-select"
                value={rule.rule_config.part_b || ''}
                onChange={(e) => onConfigChange('part_b', e.target.value)}
              >
                <option value="">Select part</option>
                {PART_SLUGS.map(slug => <option key={slug} value={slug}>{slug.charAt(0).toUpperCase() + slug.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Field B</label>
              <select
                className="form-select"
                value={rule.rule_config.field_b || ''}
                onChange={(e) => onConfigChange('field_b', e.target.value)}
                disabled={!rule.rule_config.part_b}
              >
                <option value="">Select field</option>
                {(PART_FIELDS[rule.rule_config.part_b] || []).map(field => <option key={field} value={field}>{field}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Format String</label>
              <input
                className="form-input"
                type="text"
                value={rule.rule_config.format || ''}
                onChange={(e) => onConfigChange('format', e.target.value)}
                placeholder="e.g., {value}mm"
              />
              <small style={{ color: 'var(--color-text-muted)' }}>Use {'{value}'} as placeholder</small>
            </div>
          </>
        );

      case 'sum_gte':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Target Part</label>
              <select
                className="form-select"
                value={rule.rule_config.target_part || ''}
                onChange={(e) => onConfigChange('target_part', e.target.value)}
              >
                <option value="">Select part</option>
                {PART_SLUGS.map(slug => <option key={slug} value={slug}>{slug.charAt(0).toUpperCase() + slug.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target Field</label>
              <select
                className="form-select"
                value={rule.rule_config.target_field || ''}
                onChange={(e) => onConfigChange('target_field', e.target.value)}
                disabled={!rule.rule_config.target_part}
              >
                <option value="">Select field</option>
                {(PART_FIELDS[rule.rule_config.target_part] || []).map(field => <option key={field} value={field}>{field}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Multiplier</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                value={rule.rule_config.multiplier || ''}
                onChange={(e) => onConfigChange('multiplier', parseFloat(e.target.value) || 1)}
                placeholder="e.g., 1.2 for 120%"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sum Fields (JSON)</label>
              <textarea
                className="form-input"
                value={JSON.stringify(rule.rule_config.sum_fields || [], null, 2)}
                onChange={(e) => {
                  try {
                    onConfigChange('sum_fields', JSON.parse(e.target.value));
                  } catch { /* ignore invalid JSON */ }
                }}
                rows={4}
                placeholder='[{"part":"cpu","field":"tdp_watts"},{"part":"gpu","field":"tdp_watts"}]'
              />
            </div>
          </>
        );

      case 'pair_mismatch':
        return (
          <>
            <div className="form-group">
              <label className="form-label">Part A</label>
              <select
                className="form-select"
                value={rule.rule_config.part_a || ''}
                onChange={(e) => onConfigChange('part_a', e.target.value)}
              >
                <option value="">Select part</option>
                {PART_SLUGS.map(slug => <option key={slug} value={slug}>{slug.charAt(0).toUpperCase() + slug.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Field A</label>
              <select
                className="form-select"
                value={rule.rule_config.field_a || ''}
                onChange={(e) => onConfigChange('field_a', e.target.value)}
                disabled={!rule.rule_config.part_a}
              >
                <option value="">Select field</option>
                {(PART_FIELDS[rule.rule_config.part_a] || []).map(field => <option key={field} value={field}>{field}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Part B</label>
              <select
                className="form-select"
                value={rule.rule_config.part_b || ''}
                onChange={(e) => onConfigChange('part_b', e.target.value)}
              >
                <option value="">Select part</option>
                {PART_SLUGS.map(slug => <option key={slug} value={slug}>{slug.charAt(0).toUpperCase() + slug.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Field B</label>
              <select
                className="form-select"
                value={rule.rule_config.field_b || ''}
                onChange={(e) => onConfigChange('field_b', e.target.value)}
                disabled={!rule.rule_config.part_b}
              >
                <option value="">Select field</option>
                {(PART_FIELDS[rule.rule_config.part_b] || []).map(field => <option key={field} value={field}>{field}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Pairs (JSON)</label>
              <textarea
                className="form-input"
                value={JSON.stringify(rule.rule_config.pairs || [], null, 2)}
                onChange={(e) => {
                  try {
                    onConfigChange('pairs', JSON.parse(e.target.value));
                  } catch { /* ignore invalid JSON */ }
                }}
                rows={4}
                placeholder='[{"a":"ATX","b":"ITX","msg":"ATX PSU may not fit"}]'
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1>Compatibility Rules</h1>
        <p>Manage PC part compatibility validation rules. Rules are checked when users create or edit builds.</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn--primary" onClick={() => setShowCreateModal(true)}>
          + Add New Rule
        </button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '50px' }}>#</th>
            <th>Name</th>
            <th style={{ width: '120px' }}>Severity</th>
            <th style={{ width: '100px' }}>Status</th>
            <th style={{ width: '220px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td><strong>{rule.rule_number}</strong></td>
              <td>
                <div>{rule.name}</div>
                {rule.description && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {rule.description}
                  </div>
                )}
              </td>
              <td>
                <select
                  className="form-select"
                  value={rule.severity}
                  onChange={(e) => handleSeverityChange(rule, e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                </select>
              </td>
              <td>
                <span className={rule.is_active ? 'badge badge--success' : 'badge badge--danger'}>
                  {rule.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <button
                  className="btn btn--small btn--outline"
                  onClick={() => handleToggleActive(rule)}
                >
                  {rule.is_active ? 'Disable' : 'Enable'}
                </button>
                <button
                  className="btn btn--small btn--ghost"
                  onClick={() => setViewingRule(rule)}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Details
                </button>
                <button
                  className="btn btn--small btn--secondary"
                  onClick={() => setEditingRule({ ...rule, rule_config: { ...rule.rule_config } })}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Edit
                </button>
                <button
                  className="btn btn--small btn--danger"
                  onClick={() => setDeleteConfirm(rule)}
                  style={{ marginLeft: '0.5rem' }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* View Rule Modal */}
      {viewingRule && (
        <div className="modal-overlay" onClick={() => setViewingRule(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal__header">
              <h2>Rule #{viewingRule.rule_number}: {viewingRule.name}</h2>
              <button className="modal__close" onClick={() => setViewingRule(null)}>&times;</button>
            </div>
            <div className="modal__body">
              {viewingRule.description && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Description:</strong>
                  <p>{viewingRule.description}</p>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <strong>Severity:</strong>
                <span className={viewingRule.severity === 'error' ? 'badge badge--danger' : 'badge badge--warning'} style={{ marginLeft: '0.5rem' }}>
                  {viewingRule.severity}
                </span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <strong>Status:</strong>
                <span className={viewingRule.is_active ? 'badge badge--success' : 'badge badge--danger'} style={{ marginLeft: '0.5rem' }}>
                  {viewingRule.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <strong>Message Template:</strong>
                <div style={{ 
                  background: 'var(--color-bg-secondary, #f5f5f5)', 
                  padding: '0.75rem', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  marginTop: '0.5rem'
                }}>
                  {viewingRule.message_template}
                </div>
              </div>

              <div>
                <strong>Rule Configuration:</strong>
                <pre style={{ 
                  background: 'var(--color-bg-secondary, #f5f5f5)', 
                  padding: '0.75rem', 
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  overflow: 'auto',
                  marginTop: '0.5rem'
                }}>
                  {JSON.stringify(viewingRule.rule_config, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="modal-overlay" onClick={() => setEditingRule(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal__header">
              <h2>Edit Rule #{editingRule.rule_number}</h2>
              <button className="modal__close" onClick={() => setEditingRule(null)}>&times;</button>
            </div>
            <form onSubmit={handleEditRule}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Rule Number *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={editingRule.rule_number}
                    onChange={(e) => setEditingRule({ ...editingRule, rule_number: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    value={editingRule.description}
                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Severity *</label>
                  <select
                    className="form-select"
                    value={editingRule.severity}
                    onChange={(e) => setEditingRule({ ...editingRule, severity: e.target.value })}
                  >
                    <option value="error">Error (blocks save)</option>
                    <option value="warning">Warning (shows warning only)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Message Template *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={editingRule.message_template}
                    onChange={(e) => setEditingRule({ ...editingRule, message_template: e.target.value })}
                    required
                  />
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    Use {'{a}'} and {'{b}'} as placeholders for compared values
                  </small>
                </div>

                <hr style={{ margin: '1.5rem 0' }} />

                <h3>Rule Configuration</h3>

                <div className="form-group">
                  <label className="form-label">Rule Type *</label>
                  <select
                    className="form-select"
                    value={editingRule.rule_config.type}
                    onChange={(e) => setEditingRule({
                      ...editingRule,
                      rule_config: { type: e.target.value }
                    })}
                  >
                    {RULE_TYPES.map(rt => (
                      <option key={rt.value} value={rt.value}>{rt.label}</option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    {RULE_TYPES.find(rt => rt.value === editingRule.rule_config.type)?.description}
                  </small>
                </div>

                {renderRuleConfigFields(editingRule, (key, value) => {
                  setEditingRule(prev => ({
                    ...prev,
                    rule_config: { ...prev.rule_config, [key]: value },
                  }));
                })}
              </div>

              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setEditingRule(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal__header">
              <h2>Create New Compatibility Rule</h2>
              <button className="modal__close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateRule}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label">Rule Number *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={newRule.rule_number}
                    onChange={(e) => setNewRule({ ...newRule, rule_number: e.target.value })}
                    placeholder="e.g., 13"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="e.g., CPU-Motherboard Socket Match"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="Optional description of this rule"
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Severity *</label>
                  <select
                    className="form-select"
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value })}
                  >
                    <option value="error">Error (blocks save)</option>
                    <option value="warning">Warning (shows warning only)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Message Template *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={newRule.message_template}
                    onChange={(e) => setNewRule({ ...newRule, message_template: e.target.value })}
                    placeholder="e.g., CPU socket ({a}) does not match motherboard socket ({b})"
                    required
                  />
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    Use {'{a}'} and {'{b}'} as placeholders for compared values
                  </small>
                </div>

                <hr style={{ margin: '1.5rem 0' }} />

                <h3>Rule Configuration</h3>

                <div className="form-group">
                  <label className="form-label">Rule Type *</label>
                  <select
                    className="form-select"
                    value={newRule.rule_config.type}
                    onChange={(e) => setNewRule({ 
                      ...newRule, 
                      rule_config: { type: e.target.value } 
                    })}
                  >
                    {RULE_TYPES.map(rt => (
                      <option key={rt.value} value={rt.value}>{rt.label}</option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--color-text-muted)' }}>
                    {RULE_TYPES.find(rt => rt.value === newRule.rule_config.type)?.description}
                  </small>
                </div>

                {renderRuleConfigFields(newRule, updateRuleConfig)}
              </div>

              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal__header">
              <h2>Delete Rule?</h2>
              <button className="modal__close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <div className="modal__body">
              <p>Are you sure you want to delete rule <strong>#{deleteConfirm.rule_number}: {deleteConfirm.name}</strong>?</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>This action cannot be undone.</p>
            </div>
            <div className="modal__footer">
              <button className="btn btn--outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn--danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}