import React from 'react';

export default function EmptyState({ icon = 'inbox', title, children }) {
  return (
    <div className="text-center text-muted py-5">
      <i className={`bi bi-${icon} display-5 d-block mb-2`} />
      <h6 className="fw-semibold">{title}</h6>
      {children && <div className="small">{children}</div>}
    </div>
  );
}
