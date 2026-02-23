import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatDate } from '../../utils/helpers';

export default function AdminApplicationsPage() {
  const { getApplications, reviewApplication } = useData();

  const [tab, setTab] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [adminNotes, setAdminNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadApplications = async () => {
    try {
      const data = await getApplications({ status: tab });
      setApplications(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleNotesChange = (appId, value) => {
    setAdminNotes((prev) => ({ ...prev, [appId]: value }));
  };

  const handleApprove = async (app) => {
    const notes = adminNotes[app.id] || '';
    try {
      await reviewApplication(app.id, 'approved', notes);
      await loadApplications();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleReject = async (app) => {
    const notes = adminNotes[app.id] || '';
    try {
      await reviewApplication(app.id, 'rejected', notes);
      await loadApplications();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const tabs = ['pending', 'approved', 'rejected'];

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1>Builder Applications</h1>
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={`tabs__tab ${tab === t ? 'tabs__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          <p>No {tab} applications found.</p>
        </div>
      ) : (
        <div className="grid grid--2">
          {applications.map((app) => (
            <div key={app.id} className="card">
              <div className="card__body">
                <h3 className="card__title">
                  {app.user_display_name || 'Unknown User'}
                </h3>
                <span className="badge badge--secondary">
                  {app.application_type || 'N/A'}
                </span>

                <div className="card__details">
                  {app.business_name && (
                    <p><strong>Business Name:</strong> {app.business_name}</p>
                  )}
                  {app.registration_number && (
                    <p><strong>Registration Number:</strong> {app.registration_number}</p>
                  )}
                  {app.website && (
                    <p><strong>Website:</strong> {app.website}</p>
                  )}
                  {app.portfolio_url && (
                    <p><strong>Portfolio:</strong> {app.portfolio_url}</p>
                  )}
                  {app.years_of_experience != null && (
                    <p><strong>Years of Experience:</strong> {app.years_of_experience}</p>
                  )}
                  {app.specialization && (
                    <p><strong>Specialization:</strong> {app.specialization}</p>
                  )}
                  <p><strong>Submitted:</strong> {formatDate(app.created_at)}</p>
                </div>

                {tab === 'pending' && (
                  <div className="card__actions">
                    <div className="form-group">
                      <label className="form-label">Admin Notes</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={adminNotes[app.id] || ''}
                        onChange={(e) => handleNotesChange(app.id, e.target.value)}
                        placeholder="Optional notes for this application..."
                      />
                    </div>
                    <button
                      className="btn btn--success"
                      onClick={() => handleApprove(app)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn--danger"
                      onClick={() => handleReject(app)}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {(tab === 'approved' || tab === 'rejected') && (
                  <div className="card__review">
                    {app.admin_notes && (
                      <p><strong>Admin Notes:</strong> {app.admin_notes}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
