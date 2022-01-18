import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'student' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const { confirm, ...fields } = form;
      await register(fields);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Unable to create account'));
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card shadow">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i className="bi bi-mortarboard-fill text-primary display-5" />
            <h3 className="fw-bold mt-2 mb-0">Create account</h3>
            <p className="text-muted">Join CampusManagerPro</p>
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label d-block">I am a</label>
              <div className="btn-group w-100" role="group">
                {['student', 'teacher'].map((role) => (
                  <React.Fragment key={role}>
                    <input
                      type="radio"
                      className="btn-check"
                      name="role"
                      id={`role-${role}`}
                      value={role}
                      checked={form.role === role}
                      onChange={update('role')}
                    />
                    <label className="btn btn-outline-primary text-capitalize" htmlFor={`role-${role}`}>
                      <i className={`bi bi-${role === 'student' ? 'person' : 'easel'} me-1`} />
                      {role}
                    </label>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Full name</label>
              <input className="form-control" value={form.name} onChange={update('name')} maxLength={120} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                required
              />
            </div>
            <div className="row g-3 mb-4">
              <div className="col-sm-6">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={update('password')}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="col-sm-6">
                <label className="form-label">Confirm</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.confirm}
                  onChange={update('confirm')}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p className="text-center mt-4 mb-0">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
