import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Loader';
import EmptyState from '../EmptyState';
import { formatDateTime } from '../../utils/format';

export default function AnnouncementsTab({ classId }) {
  const { isTeacher } = useAuth();
  const [announcements, setAnnouncements] = useState(null);
  const [form, setForm] = useState({ title: '', body: '' });
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/classes/${classId}/announcements`)
      .then((res) => setAnnouncements(res.data.announcements))
      .catch((err) => toast.error(errorMessage(err)));
  }, [classId]);

  useEffect(load, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      const res = await api.post(`/classes/${classId}/announcements`, form);
      setAnnouncements((list) => [res.data.announcement, ...list]);
      setForm({ title: '', body: '' });
      toast.success('Announcement posted');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/classes/${classId}/announcements/${id}`);
      setAnnouncements((list) => list.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      {isTeacher && (
        <form onSubmit={handleSubmit} className="card card-body mb-3">
          <input
            className="form-control mb-2"
            placeholder="Announcement title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={200}
            required
          />
          <textarea
            className="form-control mb-2"
            rows={3}
            placeholder="Share something with your class..."
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            required
          />
          <div>
            <button type="submit" className="btn btn-primary" disabled={posting}>
              <i className="bi bi-send me-1" />
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {!announcements ? (
        <Loader />
      ) : announcements.length === 0 ? (
        <div className="card">
          <EmptyState icon="megaphone" title="No announcements yet" />
        </div>
      ) : (
        announcements.map((a) => (
          <div key={a.id} className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="fw-bold mb-0">{a.title}</h6>
                  <small className="text-muted">
                    {a.author_name} · {formatDateTime(a.created_at)}
                  </small>
                </div>
                {isTeacher && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger"
                    onClick={() => remove(a.id)}
                    title="Delete"
                  >
                    <i className="bi bi-trash" />
                  </button>
                )}
              </div>
              <p className="mb-0 mt-2 pre-wrap">{a.body}</p>
            </div>
          </div>
        ))
      )}
    </>
  );
}
