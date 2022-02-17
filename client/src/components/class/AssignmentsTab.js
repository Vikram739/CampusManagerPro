import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AssignmentForm from '../AssignmentForm';
import EmptyState from '../EmptyState';
import StatusBadge, { ScoreBadge } from '../StatusBadge';
import { formatDateTime, fromNow, isPast } from '../../utils/format';

export default function AssignmentsTab({ classId, assignments, studentCount, onChanged }) {
  const { isTeacher } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <>
      {isTeacher &&
        (creating ? (
          <AssignmentForm
            classId={classId}
            onCancel={() => setCreating(false)}
            onSaved={(assignment) => {
              setCreating(false);
              onChanged();
              navigate(`/assignments/${assignment.id}`);
            }}
          />
        ) : (
          <button type="button" className="btn btn-primary mb-3" onClick={() => setCreating(true)}>
            <i className="bi bi-plus-lg me-1" /> New assignment
          </button>
        ))}

      <div className="card">
        {assignments.length === 0 ? (
          <EmptyState icon="file-earmark" title="No assignments yet">
            {isTeacher ? 'Create an assignment to get started.' : 'Your teacher has not posted any work yet.'}
          </EmptyState>
        ) : (
          <div className="list-group list-group-flush">
            {assignments.map((a) => (
              <Link
                key={a.id}
                to={`/assignments/${a.id}`}
                className="list-group-item list-group-item-action py-3"
              >
                <div className="d-flex flex-wrap justify-content-between gap-2">
                  <div>
                    <div className="fw-semibold">
                      <i className="bi bi-file-earmark-text text-primary me-2" />
                      {a.title}
                    </div>
                    <small className={isPast(a.due_date) ? 'text-danger' : 'text-muted'}>
                      Due {formatDateTime(a.due_date)} ({fromNow(a.due_date)}) · {a.max_points} pts
                      {!a.allow_late && ' · no late work'}
                    </small>
                  </div>
                  <div className="text-end">
                    {isTeacher ? (
                      <>
                        <span className="badge bg-light text-dark border me-1">
                          {a.submission_count}/{studentCount} turned in
                        </span>
                        <span className="badge bg-light text-dark border">{a.graded_count} graded</span>
                      </>
                    ) : (
                      <>
                        <StatusBadge status={a.submission_status} dueDate={a.due_date} isLate={a.is_late} />
                        {a.submission_status === 'graded' && (
                          <div className="mt-1">
                            <ScoreBadge score={a.score} maxPoints={a.max_points} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
