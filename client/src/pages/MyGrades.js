import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import StatusBadge, { ScoreBadge } from '../components/StatusBadge';
import { formatDate, gradeVariant } from '../utils/format';

export default function MyGrades() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/grades')
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <Loader />;

  const { classes, overall } = data;
  const allItems = classes.flatMap((c) => c.items);

  return (
    <>
      <h3 className="fw-bold mb-4">My grades</h3>
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <StatCard
            icon="award"
            label="Overall"
            value={overall.percent === null ? '-' : `${overall.percent}%`}
            hint={overall.letter ? `Grade ${overall.letter}` : 'No grades yet'}
            variant={gradeVariant(overall.percent)}
          />
        </div>
        <div className="col-md-4">
          <StatCard
            icon="check2-square"
            label="Graded assignments"
            value={allItems.filter((i) => i.status === 'graded').length}
            variant="success"
          />
        </div>
        <div className="col-md-4">
          <StatCard
            icon="collection"
            label="Points earned"
            value={`${overall.earned}/${overall.possible}`}
            variant="info"
          />
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="card">
          <EmptyState icon="award" title="No assignments yet">
            Once your teachers post and grade work, it will show up here.
          </EmptyState>
        </div>
      ) : (
        classes.map((cls) => (
          <div key={cls.id} className="card mb-4">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <div>
                <Link to={`/classes/${cls.id}`} className="fw-semibold text-reset">
                  {cls.name}
                </Link>
                <div className="small text-muted">{cls.subject}</div>
              </div>
              {cls.summary.percent === null ? (
                <span className="text-muted small">No grades yet</span>
              ) : (
                <span className={`badge fs-6 bg-${gradeVariant(cls.summary.percent)}`}>
                  {cls.summary.percent}% · {cls.summary.letter}
                </span>
              )}
            </div>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Assignment</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {cls.items.map((item) => (
                    <tr key={item.assignment_id}>
                      <td>
                        <Link to={`/assignments/${item.assignment_id}`}>{item.title}</Link>
                      </td>
                      <td className="small">{formatDate(item.due_date)}</td>
                      <td>
                        <StatusBadge status={item.status} dueDate={item.due_date} isLate={item.is_late} />
                      </td>
                      <td>
                        {item.status === 'graded' ? (
                          <ScoreBadge score={item.score} maxPoints={item.max_points} />
                        ) : (
                          <span className="text-muted small">/{item.max_points}</span>
                        )}
                      </td>
                      <td className="small text-muted" style={{ maxWidth: 260 }}>
                        <div className="text-truncate">{item.feedback || '-'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  );
}
