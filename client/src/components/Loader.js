import React from 'react';

export default function Loader({ fullPage = false, text = 'Loading...' }) {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-muted"
      style={{ minHeight: fullPage ? '100vh' : 200 }}
    >
      <div className="spinner-border text-primary mb-2" role="status" />
      <small>{text}</small>
    </div>
  );
}
