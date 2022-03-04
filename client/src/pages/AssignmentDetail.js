import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { downloadFile, errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import AssignmentForm from '../components/AssignmentForm';
import StudentSubmission from '../components/StudentSubmission';
import SubmissionsTable from '../components/SubmissionsTable';
import StatCard from '../components/StatCard';
import { formatDateTime, fromNow, isPast } from '../utils/format';

export default function AssignmentDetail() {
  const { id } = useParams();
  const { isTeacher } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/assignments/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  useEffect(load, [load]);

  if (error) {
    return (
      <div className="alert alert-danger">
        {error} <Link to="/">Back to dashboard</Link>
      </div>
    );
  }
  if (!data) return <Loader />;

  const { assignment } = data;
  const overdue = isPast(assignment.due_date);

  const deleteAssignment = async () => {
    if (!window.confirm(`Delete "${assignment.title}" and all its submissions?`)) return;
    try {
      await api.delete(`/assignments/${assignment.id}`);
      toast.success('Assignment deleted');
      navigate(`/classes/${assignment.class_id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const downloadAttachment = () =>
    downloadFile(`/assignments/${assignment.id}/attachment`, assignment.attachment_name).catch((err) =>
      toast.error(errorMessage(err, 'Download failed'))
    );

  return (
    <>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/classes">Classes</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={`/classes/${assignment.class_id}`}>{assignment.class_name}</Link>
          </li>
          <li className="breadcrumb-item active">{assignment.title}</li>
        </ol>
      </nav>

      {editing ? (
        <AssignmentForm
          assignment={assignment}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      ) : (
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <div>
                <h3 className="fw-bold mb-1">{assignment.title}</h3>
                <div className="text-muted">
                  <span className={overdue ? 'text-danger' : ''}>
                    <i className="bi bi-calendar-event me-1" />
                    Due {formatDateTime(assignment.due_date)} ({fromNow(assignment.due_date)})
                  </span>
                  <span className="mx-2">·</span>
                  {assignment.max_points} points
                  <span className="mx-2">·</span>
                  {assignment.allow_late ? 'Late work accepted' : 'No late submissions'}
                </div>
              </div>
              {isTeacher && (
                <div className="d-flex gap-2 align-items-start">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setEditing(true)}>
                    <i className="bi bi-pencil me-1" /> Edit
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={deleteAssignment}>
                    <i className="bi bi-trash me-1" /> Delete
                  </button>
                </div>
              )}
            </div>
            <hr />
            {assignment.description ? (
              <p className="pre-wrap mb-0">{assignment.description}</p>
            ) : (
              <p className="text-muted fst-italic mb-0">No instructions provided.</p>
            )}
            {assignment.attachment_name && (
              <button type="button" className="btn btn-light border mt-3" onClick={downloadAttachment}>
                <i className="bi bi-paperclip me-1" />
                {assignment.attachment_name}
              </button>
            )}
          </div>
        </div>
      )}

      {isTeacher ? (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <StatCard
                icon="inbox"
                label="Turned in"
                value={`${data.stats.submitted}/${data.stats.enrolled}`}
              />
            </div>
            <div className="col-md-4">
              <StatCard
                icon="check2-square"
                label="Graded"
                value={`${data.stats.graded}/${data.stats.submitted}`}
                variant="success"
              />
            </div>
            <div className="col-md-4">
              <StatCard
                icon="bar-chart"
                label="Average score"
                value={data.stats.average === null ? '-' : `${data.stats.average}/${assignment.max_points}`}
                variant="info"
              />
            </div>
          </div>
          <SubmissionsTable assignment={assignment} submissions={data.submissions} onChanged={load} />
        </>
      ) : (
        <StudentSubmission
          assignment={assignment}
          submission={data.submission}
          canSubmit={data.canSubmit}
          onChanged={load}
        />
      )}
    </>
  );
}
