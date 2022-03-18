import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { ScoreBadge } from '../components/StatusBadge';
import { formatDateTime, fromNow, gradeVariant, isPast } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <Loader />;

  return (
    <>
      <div className="mb-4">
        <h3 className="fw-bold mb-0">Welcome back, {user.name.split(' ')[0]}</h3>
        <p className="text-muted mb-0">
          {user.role === 'teacher'
            ? "Here's what's happening across your classes."
            : "Here's what you need to work on."}
        </p>
      </div>
      {user.role === 'teacher' ? <TeacherDashboard data={data} /> : <StudentDashboard data={data} />}
    </>
  );
}

function TeacherDashboard({ data }) {
  const { stats, toGrade, upcoming } = data;
  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard icon="journal-bookmark" label="Classes" value={stats.class_count} />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="people" label="Students" value={stats.student_count} variant="info" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="file-earmark-text" label="Assignments" value={stats.assignment_count} variant="success" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="hourglass-split" label="Waiting to grade" value={stats.pending_grading} variant="warning" />
        </div>
      </div>

      {stats.class_count === 0 && (
        <div className="alert alert-info">
          You haven't created any classes yet. <Link to="/classes">Create your first class</Link> and share its join
          code with students.
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-inbox me-2" />
              Submissions to grade
            </div>
            {toGrade.length === 0 ? (
              <EmptyState icon="check2-circle" title="You're all caught up" />
            ) : (
              <div className="list-group list-group-flush">
                {toGrade.map((s) => (
                  <Link key={s.id} to={`/assignments/${s.assignment_id}`} className="list-group-item list-group-item-action">
                    <div className="d-flex justify-content-between">
                      <strong>{s.student_name}</strong>
                      <small className="text-muted">{fromNow(s.submitted_at)}</small>
                    </div>
                    <div className="small text-muted">
                      {s.assignment_title} · {s.class_name}
                      {s.is_late && <span className="badge bg-warning text-dark ms-2">Late</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-calendar-event me-2" />
              Upcoming deadlines
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon="calendar-x" title="No upcoming deadlines" />
            ) : (
              <div className="list-group list-group-flush">
                {upcoming.map((a) => {
                  const pct = a.student_count ? Math.round((a.submission_count / a.student_count) * 100) : 0;
                  return (
                    <Link key={a.id} to={`/assignments/${a.id}`} className="list-group-item list-group-item-action">
                      <div className="d-flex justify-content-between">
                        <strong>{a.title}</strong>
                        <small className="text-muted">{fromNow(a.due_date)}</small>
                      </div>
                      <div className="small text-muted mb-1">{a.class_name}</div>
                      <div className="progress" style={{ height: 6 }}>
                        <div className="progress-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <small className="text-muted">
                        {a.submission_count}/{a.student_count} submitted
                      </small>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function StudentDashboard({ data }) {
  const { stats, todo, recentGrades } = data;
  const overall = stats.overall;
  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard icon="journal-bookmark" label="Classes" value={stats.class_count} />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="clock" label="Due soon" value={stats.pending_count} variant="info" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="exclamation-triangle" label="Missing" value={stats.missing_count} variant="danger" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon="award"
            label="Overall grade"
            value={overall.percent === null ? '-' : `${overall.percent}%`}
            hint={overall.letter ? `Grade ${overall.letter}` : 'No grades yet'}
            variant={gradeVariant(overall.percent)}
          />
        </div>
      </div>

      {stats.class_count === 0 && (
        <div className="alert alert-info">
          You're not in any classes yet. <Link to="/classes">Join a class</Link> with the code your teacher gave you.
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-list-check me-2" />
              To do
            </div>
            {todo.length === 0 ? (
              <EmptyState icon="emoji-smile" title="Nothing to do right now" />
            ) : (
              <div className="list-group list-group-flush">
                {todo.map((a) => {
                  const overdue = isPast(a.due_date);
                  return (
                    <Link key={a.id} to={`/assignments/${a.id}`} className="list-group-item list-group-item-action">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>{a.title}</strong>
                          <div className="small text-muted">{a.class_name}</div>
                        </div>
                        <span className={`badge ${overdue ? 'bg-danger' : 'bg-light text-dark border'}`}>
                          {overdue ? 'Overdue' : `Due ${fromNow(a.due_date)}`}
                        </span>
                      </div>
                      <small className="text-muted">
                        {formatDateTime(a.due_date)} · {a.max_points} pts
                        {overdue && !a.allow_late && ' · closed'}
                      </small>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold d-flex justify-content-between">
              <span>
                <i className="bi bi-award me-2" />
                Recent grades
              </span>
              <Link to="/grades" className="small">
                View all
              </Link>
            </div>
            {recentGrades.length === 0 ? (
              <EmptyState icon="hourglass" title="No graded work yet" />
            ) : (
              <div className="list-group list-group-flush">
                {recentGrades.map((g) => (
                  <Link key={g.id} to={`/assignments/${g.assignment_id}`} className="list-group-item list-group-item-action">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{g.title}</strong>
                        <div className="small text-muted">{g.class_name}</div>
                      </div>
                      <ScoreBadge score={g.score} maxPoints={g.max_points} />
                    </div>
                    {g.feedback && <div className="small text-muted fst-italic text-truncate">"{g.feedback}"</div>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
