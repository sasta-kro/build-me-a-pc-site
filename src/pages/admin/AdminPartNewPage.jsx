import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const SPEC_FIELDS = {
  cpu: [
    { key: 'socket', label: 'Socket', type: 'text' },
    { key: 'cores', label: 'Cores', type: 'number' },
    { key: 'threads', label: 'Threads', type: 'number' },
    { key: 'base_clock_ghz', label: 'Base Clock (GHz)', type: 'number', step: 0.1 },
    { key: 'boost_clock_ghz', label: 'Boost Clock (GHz)', type: 'number', step: 0.1 },
    { key: 'tdp_watts', label: 'TDP (Watts)', type: 'number' },
    { key: 'integrated_graphics', label: 'Integrated Graphics', type: 'checkbox' },
  ],
  gpu: [
    { key: 'interface', label: 'Interface', type: 'text' },
    { key: 'vram_gb', label: 'VRAM (GB)', type: 'number' },
    { key: 'vram_type', label: 'VRAM Type', type: 'text' },
    { key: 'length_mm', label: 'Length (mm)', type: 'number' },
    { key: 'tdp_watts', label: 'TDP (Watts)', type: 'number' },
    { key: 'recommended_psu_watts', label: 'Recommended PSU (Watts)', type: 'number' },
    { key: 'slots_occupied', label: 'Slots Occupied', type: 'number', step: 0.5 },
  ],
  motherboard: [
    { key: 'socket', label: 'Socket', type: 'text' },
    { key: 'form_factor', label: 'Form Factor', type: 'select', options: ['ATX', 'mATX', 'ITX'] },
    { key: 'chipset', label: 'Chipset', type: 'text' },
    { key: 'ram_type', label: 'RAM Type', type: 'select', options: ['DDR4', 'DDR5'] },
    { key: 'ram_slots', label: 'RAM Slots', type: 'number' },
    { key: 'max_ram_gb', label: 'Max RAM (GB)', type: 'number' },
    { key: 'm2_slots', label: 'M.2 Slots', type: 'number' },
    { key: 'pcie_x16_slots', label: 'PCIe x16 Slots', type: 'number' },
  ],
  ram: [
    { key: 'type', label: 'Type', type: 'select', options: ['DDR4', 'DDR5'] },
    { key: 'speed_mhz', label: 'Speed (MHz)', type: 'number' },
    { key: 'capacity_gb', label: 'Capacity per Module (GB)', type: 'number' },
    { key: 'modules', label: 'Modules', type: 'number' },
    { key: 'total_capacity_gb', label: 'Total Capacity (GB)', type: 'number' },
    { key: 'cas_latency', label: 'CAS Latency', type: 'number' },
  ],
  storage: [
    { key: 'type', label: 'Type', type: 'select', options: ['NVMe', 'SATA'] },
    { key: 'interface', label: 'Interface', type: 'select', options: ['M.2', '2.5"'] },
    { key: 'capacity_gb', label: 'Capacity (GB)', type: 'number' },
    { key: 'read_speed_mbps', label: 'Read Speed (MB/s)', type: 'number' },
    { key: 'write_speed_mbps', label: 'Write Speed (MB/s)', type: 'number' },
    { key: 'form_factor', label: 'Form Factor', type: 'text' },
  ],
  psu: [
    { key: 'wattage', label: 'Wattage', type: 'number' },
    { key: 'efficiency_rating', label: 'Efficiency Rating', type: 'text' },
    { key: 'modular', label: 'Modular', type: 'select', options: ['Full', 'Semi', 'None'] },
    { key: 'form_factor', label: 'Form Factor', type: 'select', options: ['ATX', 'SFX'] },
  ],
  case: [
    { key: 'form_factor', label: 'Form Factor', type: 'select', options: ['ATX', 'mATX', 'ITX'] },
    { key: 'supported_motherboards', label: 'Supported Motherboards (comma-separated)', type: 'text', isArray: true },
    { key: 'max_gpu_length_mm', label: 'Max GPU Length (mm)', type: 'number' },
    { key: 'max_cooler_height_mm', label: 'Max Cooler Height (mm)', type: 'number' },
    { key: 'max_psu_length_mm', label: 'Max PSU Length (mm)', type: 'number' },
    { key: 'drive_bays_3_5', label: '3.5" Drive Bays', type: 'number' },
    { key: 'drive_bays_2_5', label: '2.5" Drive Bays', type: 'number' },
    { key: 'included_fans', label: 'Included Fans', type: 'number' },
    { key: 'radiator_support', label: 'Radiator Support (comma-separated)', type: 'text', isArray: true },
  ],
  cooling: [
    { key: 'type', label: 'Type', type: 'select', options: ['Air', 'AIO'] },
    { key: 'socket_compatibility', label: 'Socket Compatibility (comma-separated)', type: 'text', isArray: true },
    { key: 'radiator_size_mm', label: 'Radiator Size (mm)', type: 'number', nullIf: 'Air' },
    { key: 'height_mm', label: 'Height (mm)', type: 'number', nullIf: 'AIO' },
    { key: 'fan_count', label: 'Fan Count', type: 'number' },
    { key: 'tdp_rating_watts', label: 'TDP Rating (Watts)', type: 'number' },
  ],
};

export default function AdminPartNewPage() {
  const { getCategories, createItem } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [specs, setSpecs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getCategories]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categorySlug = selectedCategory ? selectedCategory.category_name?.toLowerCase().replace(/\s+/g, '-') : '';
  const specFields = SPEC_FIELDS[categorySlug] || [];

  const handleSpecChange = (key, value) => {
    setSpecs((prev) => ({ ...prev, [key]: value }));
  };

  const handleCategoryChange = (newCategoryId) => {
    setCategoryId(newCategoryId);
    setSpecs({});
  };

  const buildSpecifications = () => {
    const specifications = {};
    for (const field of specFields) {
      let value = specs[field.key];

      if (field.type === 'checkbox') {
        specifications[field.key] = !!value;
        continue;
      }

      if (field.type === 'number') {
        // Handle nullIf logic for cooling fields
        if (field.nullIf && specs.type === field.nullIf) {
          specifications[field.key] = null;
          continue;
        }
        specifications[field.key] = value !== '' && value !== undefined ? parseFloat(value) : null;
        continue;
      }

      if (field.isArray) {
        specifications[field.key] = value
          ? String(value).split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        continue;
      }

      specifications[field.key] = value || '';
    }
    return specifications;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const specifications = buildSpecifications();

    try {
      await createItem('parts', {
        category_id: categoryId,
        name,
        brand,
        model,
        specifications,
        price: parseFloat(price),
        image_url: imageUrl || null,
        is_active: isActive,
        created_by: user.id,
      });

      navigate('/admin/parts');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const renderSpecField = (field) => {
    const value = specs[field.key] !== undefined ? specs[field.key] : '';

    // Hide fields based on nullIf
    if (field.nullIf && specs.type === field.nullIf) {
      return null;
    }

    if (field.type === 'checkbox') {
      return (
        <div className="form-group" key={field.key}>
          <label className="form-label">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleSpecChange(field.key, e.target.checked)}
            />{' '}
            {field.label}
          </label>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div className="form-group" key={field.key}>
          <label className="form-label">{field.label}</label>
          <select
            className="form-select"
            value={value}
            onChange={(e) => handleSpecChange(field.key, e.target.value)}
          >
            <option value="">-- Select --</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <div className="form-group" key={field.key}>
          <label className="form-label">{field.label}</label>
          <input
            type="number"
            className="form-input"
            value={value}
            step={field.step || 1}
            onChange={(e) => handleSpecChange(field.key, e.target.value)}
          />
        </div>
      );
    }

    return (
      <div className="form-group" key={field.key}>
        <label className="form-label">{field.label}</label>
        <input
          type="text"
          className="form-input"
          value={value}
          onChange={(e) => handleSpecChange(field.key, e.target.value)}
        />
      </div>
    );
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1>Add New Part</h1>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            className="form-select"
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            required
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.category_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Name</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Brand</label>
          <input
            type="text"
            className="form-input"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Model</label>
          <input
            type="text"
            className="form-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Price</label>
          <input
            type="number"
            className="form-input"
            value={price}
            step="0.01"
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Image URL</label>
          <input
            type="text"
            className="form-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />{' '}
            Is Active
          </label>
        </div>

        {categorySlug && (
          <>
            <hr />
            <h2>Specifications</h2>
            {specFields.map((field) => renderSpecField(field))}
          </>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            Create Part
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => navigate('/admin/parts')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
