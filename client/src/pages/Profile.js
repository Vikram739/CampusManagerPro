import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

export default function Profile() {
  const { user, saveSession } = useAuth();
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', { name, currentPassword, newPassword: newPassword || undefined });
      saveSession(data);
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-lg-6">
        <div className="card">
          <div className="card-body p-4">
            <div className="d-flex align-items-center mb-4">
              <i className="bi bi-person-circle display-5 text-primary me-3" />
              <div>
                <h4 className="fw-bold mb-0">{user.name}</h4>
                <div className="text-muted">
                  {user.email} · <span className="text-capitalize">{user.role}</span> · member since{' '}
                  {formatDate(user.created_at)}
                </div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Full name</label>
                <input
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <h6 className="fw-semibold mt-4">Change password</h6>
              <p className="small text-muted">Leave blank to keep your current password.</p>
              <div className="row g-3 mb-4">
                <div className="col-sm-6">
                  <label className="form-label">Current password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required={Boolean(newPassword)}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label">New password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
