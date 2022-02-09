import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';

export default function Classes() {
  const { isTeacher } = useAuth();
  const [classes, setClasses] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    api
      .get('/classes')
      .then((res) => setClasses(res.data.classes))
      .catch((err) => toast.error(errorMessage(err)));
  }, []);

  useEffect(load, [load]);

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h3 className="fw-bold mb-0">{isTeacher ? 'My classes' : 'Enrolled classes'}</h3>
          <p className="text-muted mb-0">
            {isTeacher ? 'Create classes and share the join code with your students.' : 'Classes you are enrolled in.'}
          </p>
        </div>
        {isTeacher && !showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg me-1" /> New class
          </button>
        )}
      </div>

      {isTeacher && showForm && (
        <ClassForm
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
      {!isTeacher && <JoinClassForm onJoined={load} />}

      {!classes ? (
        <Loader />
      ) : classes.length === 0 ? (
        <div className="card">
          <EmptyState icon="journal-plus" title="No classes yet">
            {isTeacher ? 'Create a class to start assigning homework.' : 'Enter a join code above to join a class.'}
          </EmptyState>
        </div>
      ) : (
        <div className="row g-4">
          {classes.map((c) => (
            <div key={c.id} className="col-md-6 col-lg-4">
              <Link to={`/classes/${c.id}`} className="text-decoration-none text-reset">
                <div className="card class-card h-100">
                  <div className="card-header border-0">
                    <h5 className="mb-1">{c.name}</h5>
                    <div className="small opacity-75">{c.subject || 'General'}</div>
                  </div>
                  <div className="card-body">
                    <p className="text-muted small text-truncate-2 mb-3">{c.description || 'No description'}</p>
                    <div className="d-flex justify-content-between small text-muted">
                      <span>
                        <i className="bi bi-people me-1" />
                        {c.student_count} students
                      </span>
                      <span>
                        <i className="bi bi-file-earmark-text me-1" />
                        {c.assignment_count} assignments
                      </span>
                    </div>
                  </div>
                  <div className="card-footer bg-white small text-muted">
                    {isTeacher ? (
                      <>
                        Join code: <span className="join-code fw-bold text-dark">{c.join_code}</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-badge me-1" />
                        {c.teacher_name}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function ClassForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: initial ? initial.name : '',
    subject: initial ? initial.subject || '' : '',
    description: initial ? initial.description || '' : '',
  });
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = initial ? await api.put(`/classes/${initial.id}`, form) : await api.post('/classes', form);
      toast.success(initial ? 'Class updated' : 'Class created');
      onSaved(res.data.class);
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card card-body mb-4">
      <h5 className="mb-3">{initial ? 'Edit class' : 'New class'}</h5>
      <div className="row g-3 mb-3">
        <div className="col-md-7">
          <label className="form-label">Class name</label>
          <input
            className="form-control"
            value={form.name}
            onChange={update('name')}
            placeholder="e.g. Mathematics - Grade 10"
            maxLength={150}
            required
          />
        </div>
        <div className="col-md-5">
          <label className="form-label">Subject</label>
          <input
            className="form-control"
            value={form.subject}
            onChange={update('subject')}
            placeholder="e.g. Mathematics"
            maxLength={100}
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea className="form-control" rows={3} value={form.description} onChange={update('description')} />
      </div>
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : initial ? 'Save changes' : 'Create class'}
        </button>
        <button type="button" className="btn btn-light" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function JoinClassForm({ onJoined }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setJoining(true);
    try {
      const res = await api.post('/classes/join', { code });
      toast.success(`Joined ${res.data.class.name}`);
      setCode('');
      onJoined();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setJoining(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card card-body mb-4">
      <label className="form-label fw-semibold">Join a class</label>
      <div className="input-group" style={{ maxWidth: 420 }}>
        <input
          className="form-control join-code text-uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CLASS CODE"
          maxLength={10}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={joining}>
          {joining ? 'Joining...' : 'Join'}
        </button>
      </div>
    </form>
  );
}
