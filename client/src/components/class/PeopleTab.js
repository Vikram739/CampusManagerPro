import React from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../../api';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../EmptyState';
import { formatDate } from '../../utils/format';

export default function PeopleTab({ cls, students, onChanged }) {
  const { isTeacher } = useAuth();

  const removeStudent = async (student) => {
    if (!window.confirm(`Remove ${student.name} from this class? Their submissions are kept.`)) return;
    try {
      await api.delete(`/classes/${cls.id}/students/${student.id}`);
      toast.success(`${student.name} removed`);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="row g-4">
      <div className="col-lg-4">
        <div className="card">
          <div className="card-header bg-white fw-semibold">Teacher</div>
          <div className="card-body d-flex align-items-center">
            <i className="bi bi-person-badge fs-3 text-primary me-3" />
            <strong>{cls.teacher_name}</strong>
          </div>
        </div>
        {isTeacher && (
          <div className="alert alert-info mt-3 small">
            Students join by entering the code <strong className="join-code">{cls.join_code}</strong> on their
            Classes page.
          </div>
        )}
      </div>
      <div className="col-lg-8">
        <div className="card">
          <div className="card-header bg-white fw-semibold">Students ({students.length})</div>
          {students.length === 0 ? (
            <EmptyState icon="people" title="No students enrolled yet" />
          ) : (
            <ul className="list-group list-group-flush">
              {students.map((s) => (
                <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <i className="bi bi-person-circle text-secondary me-2" />
                    {s.name}
                    {isTeacher && <div className="small text-muted ms-4">{s.email}</div>}
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <small className="text-muted d-none d-sm-inline">Joined {formatDate(s.enrolled_at)}</small>
                    {isTeacher && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeStudent(s)}
                        title="Remove from class"
                      >
                        <i className="bi bi-person-dash" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
