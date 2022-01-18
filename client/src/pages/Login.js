import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state && location.state.from && location.state.from.pathname) || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Unable to log in'));
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card shadow">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i className="bi bi-mortarboard-fill text-primary display-5" />
            <h3 className="fw-bold mt-2 mb-0">CampusManagerPro</h3>
            <p className="text-muted">Sign in to your account</p>
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="text-center mt-4 mb-0">
            New here? <Link to="/register">Create an account</Link>
          </p>
          <div className="alert alert-light border small mt-4 mb-0">
            <strong>Demo accounts</strong> (password <code>password123</code>):
            <br />
            Teacher: <code>teacher@campus.test</code>
            <br />
            Student: <code>student@campus.test</code>
          </div>
        </div>
      </div>
    </div>
  );
}
