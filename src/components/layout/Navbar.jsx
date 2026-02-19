import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, isBuilder, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__brand">Build Me a PC</Link>
        <div className="navbar__links">
          {isAuthenticated && <Link to="/builds">My Builds</Link>}
          <Link to="/requests">Requests</Link>
          <Link to="/showcase">Showcase</Link>

          {isAuthenticated ? (
            <>
              <Link to="/builds/new">Create Build</Link>
              {!isBuilder && <Link to="/builder/apply">Become a Builder</Link>}
              {isBuilder && <Link to="/builder/dashboard">Builder Dashboard</Link>}
              {isAdmin && (
                <>
                  <Link to="/admin/dashboard">Admin</Link>
                  <Link to="/admin/rules">Rules</Link>
                </>
              )}
              <div className="navbar__user">
                <Link to={`/profile/${user.id}`}>{user.display_name}</Link>
                <button onClick={handleLogout} className="btn btn--sm btn--outline">Logout</button>
              </div>
            </>
          ) : (
            <div className="navbar__auth">
              <Link to="/login" className="btn btn--sm btn--outline">Login</Link>
              <Link to="/register" className="btn btn--sm btn--primary">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
