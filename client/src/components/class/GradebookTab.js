import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Loader';
import EmptyState from '../EmptyState';
import { formatDate, gradeVariant, isPast } from '../../utils/format';

function cellText(submission, assignment) {
  if (!submission) return isPast(assignment.due_date) ? 'Missing' : '';
  if (submission.status === 'graded') return String(submission.score);
  return 'Ungraded';
}

function exportCsv(classTitle, assignments, rows) {
  const escape = (value) => `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
  const header = ['Student', 'Email', ...assignments.map((a) => `${a.title} (/${a.max_points})`), 'Percent', 'Grade'];
  const lines = rows.map((r) => [
    r.student.name,
    r.student.email,
    ...assignments.map((a) => cellText(r.submissions[a.id], a)),
    r.summary.percent === null ? '' : r.summary.percent,
    r.summary.letter || '',
  ]);
  const csv = [header, ...lines].map((line) => line.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `${classTitle.replace(/[^a-z0-9]+/gi, '_')}_gradebook.csv`;
  link.click();
  URL.revokeObjectURL(href);
}

export default function GradebookTab({ classId, classTitle }) {
  const { isTeacher } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get(`/classes/${classId}/gradebook`)
      .then((res) => setData(res.data))
      .catch((err) => toast.error(errorMessage(err)));
  }, [classId]);

  if (!data) return <Loader />;
  const { assignments, rows } = data;

  if (assignments.length === 0 || rows.length === 0) {
    return (
      <div className="card">
        <EmptyState icon="table" title="Nothing to show yet">
          The gradebook fills in once there are students and assignments.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <span className="fw-semibold">
          {isTeacher ? 'Class gradebook' : 'Your grades in this class'}
        </span>
        {isTeacher && (
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => exportCsv(classTitle, assignments, rows)}
          >
            <i className="bi bi-download me-1" /> Export CSV
          </button>
        )}
      </div>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 gradebook">
          <thead className="table-light">
            <tr>
              <th>Student</th>
              {assignments.map((a) => (
                <th key={a.id} className="text-center">
                  <Link to={`/assignments/${a.id}`} className="text-reset">
                    {a.title.length > 22 ? `${a.title.slice(0, 22)}...` : a.title}
                  </Link>
                  <div className="small text-muted fw-normal">
                    {formatDate(a.due_date)} · /{a.max_points}
                  </div>
                </th>
              ))}
              <th className="text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.student.id}>
                <td>
                  <div className="fw-semibold">{r.student.name}</div>
                  {isTeacher && <div className="small text-muted">{r.student.email}</div>}
                </td>
                {assignments.map((a) => {
                  const s = r.submissions[a.id];
                  const text = cellText(s, a);
                  let cls = 'text-muted';
                  if (text === 'Missing') cls = 'text-danger small';
                  else if (text === 'Ungraded') cls = 'text-primary small';
                  else if (s) cls = 'fw-semibold';
                  return (
                    <td key={a.id} className={`text-center ${cls}`}>
                      {text || '-'}
                      {s && s.is_late && <span className="badge bg-warning text-dark ms-1">L</span>}
                    </td>
                  );
                })}
                <td className="text-center">
                  {r.summary.percent === null ? (
                    <span className="text-muted">-</span>
                  ) : (
                    <span className={`badge bg-${gradeVariant(r.summary.percent)}`}>
                      {r.summary.percent}% · {r.summary.letter}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {isTeacher && (
            <tfoot className="table-light">
              <tr>
                <td className="fw-semibold">Class average</td>
                {assignments.map((a) => (
                  <td key={a.id} className="text-center small">
                    {a.average === null ? '-' : `${a.average} (${a.graded_count} graded)`}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="card-footer bg-white small text-muted">
        Totals are points-weighted across graded work only. Grade scale: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, F &lt; 60.
      </div>
    </div>
  );
}
