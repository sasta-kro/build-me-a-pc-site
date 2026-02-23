import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';

export default function BuilderApplyPage() {
  const { user, isAuthenticated, isBuilder } = useAuth();
  const { createItem, getMyApplications } = useData();
  const navigate = useNavigate();

  const [hasPending, setHasPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [specialization, setSpecialization] = useState('');

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const pending = await getMyApplications();
        if (pending.some((app) => app.status === 'pending')) {
          setHasPending(true);
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, getMyApplications]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isBuilder) {
    return <Navigate to="/builder/dashboard" replace />;
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (hasPending) {
    return (
      <div className="auth-page">
        <div className="card">
          <h1>Application Pending</h1>
          <div className="alert alert--info">
            You already have a pending builder application. An admin will review it shortly.
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="card">
          <h1>Application Submitted</h1>
          <div className="alert alert--success">
            Application submitted! An admin will review it shortly.
          </div>
          <button
            className="btn btn--primary btn--block"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!businessName.trim()) {
      setError('Business name is required');
      return;
    }

    setSubmitting(true);
    try {
      await createItem('builder_apps', {
        user_id: user.id,
        business_name: businessName.trim(),
        registration_number: registrationNumber.trim() || null,
        address: address.trim() || null,
        website: website.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : null,
        specialization: specialization.trim() || null,
        application_type: 'business',
        status: 'pending',
        admin_notes: null,
        reviewed_by: null,
      });

      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card">
        <h1>Apply as Builder</h1>

        <div className="alert alert--info" style={{ marginBottom: '1rem' }}>
          <strong>Registered businesses only.</strong> Fill out this form only if you are a registered business.
          If you are a hobbyist builder, please contact the admins privately and provide a valid ID for verification.
        </div>

        <p>Submit your business details to become a verified builder on Build Me a PC.</p>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="businessName">Business Name *</label>
            <input
              id="businessName"
              type="text"
              className="form-input"
              placeholder="Your business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="registrationNumber">Registration Number</label>
            <input
              id="registrationNumber"
              type="text"
              className="form-input"
              placeholder="Business registration number"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Business Address</label>
            <input
              id="address"
              type="text"
              className="form-input"
              placeholder="Business address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website URL</label>
            <input
              id="website"
              type="url"
              className="form-input"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="portfolioUrl">Portfolio URL</label>
            <input
              id="portfolioUrl"
              type="url"
              className="form-input"
              placeholder="https://portfolio.example.com"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="yearsOfExperience">Years of Experience</label>
            <input
              id="yearsOfExperience"
              type="number"
              className="form-input"
              placeholder="e.g. 5"
              min="0"
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="specialization">Specialization</label>
            <input
              id="specialization"
              type="text"
              className="form-input"
              placeholder="e.g. Gaming PCs, Workstations, Custom Water Cooling"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
