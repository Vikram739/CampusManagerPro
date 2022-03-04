import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api, { downloadFile, errorMessage } from '../api';
import StatusBadge, { ScoreBadge } from './StatusBadge';
import { formatDateTime, isPast, letterGrade, percent } from '../utils/format';

export default function StudentSubmission({ assignment, submission, canSubmit, onChanged }) {
  const [editing, setEditing] = useState(!submission);
  const [content, setContent] = useState(submission ? submission.content || '' : '');
  const [file, setFile] = useState(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [saving, setSaving] = useState(false);

  const graded = submission && submission.status === 'graded';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('content', content);
    if (file) data.append('file', file);
    if (removeFile) data.append('remove_file', 'true');

    setSaving(true);
    try {
      await api.post(`/assignments/${assignment.id}/submit`, data);
      toast.success(submission ? 'Submission updated' : 'Homework submitted');
      setFile(null);
      setRemoveFile(false);
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const unsubmit = async () => {
    if (!window.confirm('Withdraw your submission? Your answer and file will be deleted.')) return;
    try {
      await api.delete(`/assignments/${assignment.id}/submission`);
      toast.info('Submission withdrawn');
      setContent('');
      setEditing(true);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const downloadOwnFile = () =>
    downloadFile(`/submissions/${submission.id}/file`, submission.file_name).catch((err) =>
      toast.error(errorMessage(err, 'Download failed'))
    );

  const pct = graded ? percent(submission.score, assignment.max_points) : null;

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="card">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Your work</span>
            <StatusBadge
              status={submission && submission.status}
              dueDate={assignment.due_date}
              isLate={submission && submission.is_late}
            />
          </div>
          <div className="card-body">
            {!submission && !canSubmit && (
              <div className="alert alert-danger mb-0">
                The deadline has passed and this assignment no longer accepts submissions.
              </div>
            )}

            {submission && !editing && (
              <>
                <div className="small text-muted mb-2">Submitted {formatDateTime(submission.submitted_at)}</div>
                {submission.content ? (
                  <div className="border rounded p-3 bg-light pre-wrap mb-3">{submission.content}</div>
                ) : (
                  <p className="text-muted fst-italic">No written answer.</p>
                )}
                {submission.file_name && (
                  <button type="button" className="btn btn-light border mb-3" onClick={downloadOwnFile}>
                    <i className="bi bi-paperclip me-1" />
                    {submission.file_name}
                  </button>
                )}
                {canSubmit && (
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-primary" onClick={() => setEditing(true)}>
                      <i className="bi bi-pencil me-1" /> Edit &amp; resubmit
                    </button>
                    <button type="button" className="btn btn-outline-danger" onClick={unsubmit}>
                      <i className="bi bi-x-circle me-1" /> Unsubmit
                    </button>
                  </div>
                )}
              </>
            )}

            {editing && canSubmit && (
              <form onSubmit={handleSubmit}>
                {isPast(assignment.due_date) && (
                  <div className="alert alert-warning py-2">
                    The due date has passed. This submission will be marked late.
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Answer</label>
                  <textarea
                    className="form-control"
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type your answer here, or attach a file below."
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Attach file</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={(e) => setFile(e.target.files[0] || null)}
                  />
                  <div className="form-text">PDF, Word, images, ZIP, code files. Max 10 MB.</div>
                  {submission && submission.file_name && !file && (
                    <div className="form-check mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="removeFile"
                        checked={removeFile}
                        onChange={(e) => setRemoveFile(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="removeFile">
                        Remove current file ({submission.file_name})
                      </label>
                    </div>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="bi bi-upload me-1" />
                    {saving ? 'Submitting...' : submission ? 'Resubmit' : 'Turn in'}
                  </button>
                  {submission && (
                    <button type="button" className="btn btn-light" onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="card">
          <div className="card-header bg-white fw-semibold">Grade</div>
          <div className="card-body text-center">
            {graded ? (
              <>
                <div className="display-6 fw-bold">
                  {Number(submission.score)}
                  <span className="fs-5 text-muted">/{assignment.max_points}</span>
                </div>
                <div className="my-2">
                  <ScoreBadge score={submission.score} maxPoints={assignment.max_points} />
                  <span className="badge bg-dark ms-1">{letterGrade(pct)}</span>
                </div>
                <div className="small text-muted">Graded {formatDateTime(submission.graded_at)}</div>
              </>
            ) : (
              <p className="text-muted mb-0">
                {submission ? 'Waiting for your teacher to grade this.' : 'Not graded yet.'}
              </p>
            )}
          </div>
          {submission && submission.feedback && (
            <div className="card-footer bg-white">
              <div className="small fw-semibold mb-1">
                <i className="bi bi-chat-left-text me-1" /> Teacher feedback
              </div>
              <div className="pre-wrap small">{submission.feedback}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
