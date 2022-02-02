import React from 'react';
import { gradeVariant, isPast, percent } from '../utils/format';

// Status of one student's work on one assignment
export default function StatusBadge({ status, dueDate, isLate }) {
  if (status === 'graded') {
    return <span className="badge bg-success">Graded</span>;
  }
  if (status === 'submitted') {
    return (
      <>
        <span className="badge bg-primary">Submitted</span>
        {isLate && <span className="badge bg-warning text-dark ms-1">Late</span>}
      </>
    );
  }
  if (dueDate && isPast(dueDate)) {
    return <span className="badge bg-danger">Missing</span>;
  }
  return <span className="badge bg-secondary">Assigned</span>;
}

export function ScoreBadge({ score, maxPoints }) {
  const pct = percent(score, maxPoints);
  if (pct === null) return <span className="text-muted">-</span>;
  return (
    <span className={`badge bg-${gradeVariant(pct)}`}>
      {Number(score)}/{maxPoints} ({pct}%)
    </span>
  );
}
