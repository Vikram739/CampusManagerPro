import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api, { downloadFile, errorMessage } from '../api';
import EmptyState from './EmptyState';
import StatusBadge, { ScoreBadge } from './StatusBadge';
import { formatDateTime } from '../utils/format';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ungraded', label: 'To grade' },
  { key: 'graded', label: 'Graded' },
  { key: 'missing', label: 'Not turned in' },
];

function matchesFilter(row, filter) {
  if (filter === 'ungraded') return row.status === 'submitted';
  if (filter === 'graded') return row.status === 'graded';
  if (filter === 'missing') return !row.id;
  return true;
}

export default function SubmissionsTable({ assignment, submissions, onChanged }) {
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);

  const rows = submissions.filter((r) => matchesFilter(r, filter));

  return (
    <div className="card">
      <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span className="fw-semibold">Student submissions</span>
        <div className="btn-group btn-group-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`btn ${filter === f.key ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} ({submissions.filter((r) => matchesFilter(r, f.key)).length})
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="people" title="No students in this view" />
      ) : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Score</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <React.Fragment key={row.student_id}>
                  <tr>
                    <td>
                      <div className="fw-semibold">{row.student_name}</div>
                      <div className="small text-muted">{row.student_email}</div>
                    </td>
                    <td>
                      <StatusBadge status={row.status} dueDate={assignment.due_date} isLate={row.is_late} />
                    </td>
                    <td className="small">{row.submitted_at ? formatDateTime(row.submitted_at) : '-'}</td>
                    <td>
                      <ScoreBadge score={row.score} maxPoints={assignment.max_points} />
                    </td>
                    <td className="text-end">
                      {row.id && (
                        <button
                          type="button"
                          className={`btn btn-sm ${row.status === 'graded' ? 'btn-outline-secondary' : 'btn-primary'}`}
                          onClick={() => setOpenId(openId === row.id ? null : row.id)}
                        >
                          {openId === row.id ? 'Close' : row.status === 'graded' ? 'Review' : 'Grade'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {openId === row.id && row.id && (
                    <tr>
                      <td colSpan={5} className="bg-light">
                        <GradePanel
                          assignment={assignment}
                          submission={row}
                          onSaved={() => {
                            setOpenId(null);
                            onChanged();
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GradePanel({ assignment, submission, onSaved }) {
  const [score, setScore] = useState(submission.score === null ? '' : submission.score);
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [saving, setSaving] = useState(false);

  const saveGrade = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/submissions/${submission.id}/grade`, { score, feedback });
      toast.success(`Graded ${submission.student_name}`);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  const returnForResubmission = async () => {
    if (!window.confirm('Clear the grade so the student can resubmit?')) return;
    try {
      await api.put(`/submissions/${submission.id}/return`);
      toast.info('Returned to student');
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const download = () =>
    downloadFile(`/submissions/${submission.id}/file`, submission.file_name).catch((err) =>
      toast.error(errorMessage(err, 'Download failed'))
    );

  return (
    <div className="row g-3 py-2">
      <div className="col-lg-7">
        <div className="small fw-semibold mb-1">Answer</div>
        {submission.content ? (
          <div className="border rounded p-3 bg-white pre-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {submission.content}
          </div>
        ) : (
          <p className="text-muted fst-italic">No written answer.</p>
        )}
        {submission.file_name && (
          <button type="button" className="btn btn-sm btn-light border mt-2" onClick={download}>
            <i className="bi bi-paperclip me-1" />
            {submission.file_name}
          </button>
        )}
      </div>
      <div className="col-lg-5">
        <form onSubmit={saveGrade}>
          <label className="form-label small fw-semibold">Score</label>
          <div className="input-group mb-2">
            <input
              type="number"
              className="form-control"
              min={0}
              max={assignment.max_points}
              step="0.5"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
              autoFocus
            />
            <span className="input-group-text">/ {assignment.max_points}</span>
          </div>
          <label className="form-label small fw-semibold">Feedback</label>
          <textarea
            className="form-control mb-2"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional comments for the student"
          />
          <div className="d-flex flex-wrap gap-2">
            <button type="submit" className="btn btn-success btn-sm" disabled={saving}>
              <i className="bi bi-check2 me-1" />
              {saving ? 'Saving...' : 'Save grade'}
            </button>
            {submission.status === 'graded' && (
              <button type="button" className="btn btn-outline-warning btn-sm" onClick={returnForResubmission}>
                <i className="bi bi-arrow-counterclockwise me-1" /> Return for resubmission
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
