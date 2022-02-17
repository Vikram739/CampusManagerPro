import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api';
import { toInputDateTime } from '../utils/format';

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 0, 0);
  return d;
}

export default function AssignmentForm({ classId, assignment, onSaved, onCancel }) {
  const editing = Boolean(assignment);
  const [form, setForm] = useState({
    title: assignment ? assignment.title : '',
    description: assignment ? assignment.description || '' : '',
    due_date: toInputDateTime(assignment ? assignment.due_date : defaultDueDate()),
    max_points: assignment ? assignment.max_points : 100,
    allow_late: assignment ? assignment.allow_late : true,
  });
  const [file, setFile] = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', form.title);
    data.append('description', form.description);
    data.append('due_date', new Date(form.due_date).toISOString());
    data.append('max_points', form.max_points);
    data.append('allow_late', String(form.allow_late));
    if (file) data.append('attachment', file);
    if (editing) {
      data.append('remove_attachment', String(removeAttachment));
    } else {
      data.append('class_id', classId);
    }

    setSaving(true);
    try {
      const res = editing
        ? await api.put(`/assignments/${assignment.id}`, data)
        : await api.post('/assignments', data);
      toast.success(editing ? 'Assignment updated' : 'Assignment created');
      onSaved(res.data.assignment);
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card card-body mb-3">
      <h5 className="mb-3">{editing ? 'Edit assignment' : 'New assignment'}</h5>
      <div className="mb-3">
        <label className="form-label">Title</label>
        <input className="form-control" value={form.title} onChange={update('title')} maxLength={200} required />
      </div>
      <div className="mb-3">
        <label className="form-label">Instructions</label>
        <textarea
          className="form-control"
          rows={4}
          value={form.description}
          onChange={update('description')}
          placeholder="What should students do?"
        />
      </div>
      <div className="row g-3 mb-3">
        <div className="col-md-5">
          <label className="form-label">Due date</label>
          <input
            type="datetime-local"
            className="form-control"
            value={form.due_date}
            onChange={update('due_date')}
            required
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Points</label>
          <input
            type="number"
            className="form-control"
            min={1}
            max={1000}
            value={form.max_points}
            onChange={update('max_points')}
            required
          />
        </div>
        <div className="col-md-4 d-flex align-items-end">
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="allowLate"
              checked={form.allow_late}
              onChange={update('allow_late')}
            />
            <label className="form-check-label" htmlFor="allowLate">
              Accept late submissions
            </label>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Attachment (optional)</label>
        <input type="file" className="form-control" onChange={(e) => setFile(e.target.files[0] || null)} />
        {editing && assignment.attachment_name && !file && (
          <div className="form-check mt-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="removeAttachment"
              checked={removeAttachment}
              onChange={(e) => setRemoveAttachment(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="removeAttachment">
              Remove current attachment ({assignment.attachment_name})
            </label>
          </div>
        )}
      </div>
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Create assignment'}
        </button>
        <button type="button" className="btn btn-light" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
