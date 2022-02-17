import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { ClassForm } from './Classes';
import AssignmentsTab from '../components/class/AssignmentsTab';
import AnnouncementsTab from '../components/class/AnnouncementsTab';
import PeopleTab from '../components/class/PeopleTab';
import GradebookTab from '../components/class/GradebookTab';

const TABS = [
  { key: 'assignments', label: 'Assignments', icon: 'file-earmark-text' },
  { key: 'announcements', label: 'Announcements', icon: 'megaphone' },
  { key: 'people', label: 'People', icon: 'people' },
  { key: 'grades', label: 'Grades', icon: 'table' },
];

export default function ClassDetail() {
  const { id } = useParams();
  const { isTeacher } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const tab = TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'assignments';

  const load = useCallback(() => {
    api
      .get(`/classes/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  useEffect(load, [load]);

  if (error) {
    return (
      <div className="alert alert-danger">
        {error} <Link to="/classes">Back to classes</Link>
      </div>
    );
  }
  if (!data) return <Loader />;

  const cls = data.class;

  const copyCode = () => {
    navigator.clipboard.writeText(cls.join_code).then(() => toast.info('Join code copied'));
  };

  const regenerateCode = async () => {
    if (!window.confirm('Generate a new join code? The old code will stop working.')) return;
    try {
      const res = await api.post(`/classes/${cls.id}/regenerate-code`);
      setData((d) => ({ ...d, class: { ...d.class, join_code: res.data.join_code } }));
      toast.success('New join code generated');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const deleteClass = async () => {
    if (!window.confirm(`Delete "${cls.name}"? All assignments, submissions and grades will be lost.`)) return;
    try {
      await api.delete(`/classes/${cls.id}`);
      toast.success('Class deleted');
      navigate('/classes');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const leaveClass = async () => {
    if (!window.confirm(`Leave "${cls.name}"?`)) return;
    try {
      await api.delete(`/classes/${cls.id}/leave`);
      toast.success('You left the class');
      navigate('/classes');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/classes">Classes</Link>
          </li>
          <li className="breadcrumb-item active">{cls.name}</li>
        </ol>
      </nav>

      {editing ? (
        <ClassForm
          initial={cls}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      ) : (
        <div className="card mb-4">
          <div className="card-body d-flex flex-wrap justify-content-between gap-3">
            <div>
              <h3 className="fw-bold mb-1">{cls.name}</h3>
              <div className="text-muted mb-2">
                {cls.subject || 'General'} · <i className="bi bi-person-badge" /> {cls.teacher_name} ·{' '}
                {data.students.length} students
              </div>
              {cls.description && <p className="mb-0 pre-wrap">{cls.description}</p>}
            </div>
            <div className="text-md-end">
              {isTeacher ? (
                <>
                  <div className="small text-muted">Join code</div>
                  <div className="d-flex align-items-center gap-2 mb-3 justify-content-md-end">
                    <span className="fs-4 fw-bold join-code">{cls.join_code}</span>
                    <button type="button" className="btn btn-sm btn-light" onClick={copyCode} title="Copy">
                      <i className="bi bi-clipboard" />
                    </button>
                    <button type="button" className="btn btn-sm btn-light" onClick={regenerateCode} title="New code">
                      <i className="bi bi-arrow-repeat" />
                    </button>
                  </div>
                  <div className="d-flex gap-2 justify-content-md-end">
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setEditing(true)}>
                      <i className="bi bi-pencil me-1" /> Edit
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={deleteClass}>
                      <i className="bi bi-trash me-1" /> Delete
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={leaveClass}>
                  <i className="bi bi-box-arrow-left me-1" /> Leave class
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        {TABS.map((t) => (
          <li key={t.key} className="nav-item">
            <button
              type="button"
              className={`nav-link${tab === t.key ? ' active' : ''}`}
              onClick={() => setSearchParams({ tab: t.key })}
            >
              <i className={`bi bi-${t.icon} me-1`} />
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'assignments' && (
        <AssignmentsTab
          classId={cls.id}
          assignments={data.assignments}
          studentCount={data.students.length}
          onChanged={load}
        />
      )}
      {tab === 'announcements' && <AnnouncementsTab classId={cls.id} />}
      {tab === 'people' && <PeopleTab cls={cls} students={data.students} onChanged={load} />}
      {tab === 'grades' && <GradebookTab classId={cls.id} classTitle={cls.name} />}
    </>
  );
}
