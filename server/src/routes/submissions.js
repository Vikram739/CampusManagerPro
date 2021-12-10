const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendStoredFile } = require('../middleware/upload');
const { HttpError, asyncHandler, toId } = require('../utils/http');

router.use(authenticate);

async function getSubmissionWithClass(submissionId) {
  const { rows } = await db.query(
    `SELECT s.*, a.max_points, c.teacher_id
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN classes c ON c.id = a.class_id
      WHERE s.id = $1`,
    [submissionId]
  );
  return rows[0];
}

router.put(
  '/:id/grade',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const submission = await getSubmissionWithClass(toId(req.params.id));
    if (!submission || submission.teacher_id !== req.user.id) throw new HttpError(404, 'Submission not found');

    const score = Number(req.body.score);
    const feedback = (req.body.feedback || '').trim();
    if (req.body.score === '' || req.body.score === null || Number.isNaN(score)) {
      throw new HttpError(400, 'Score is required');
    }
    if (score < 0 || score > submission.max_points) {
      throw new HttpError(400, `Score must be between 0 and ${submission.max_points}`);
    }

    const { rows } = await db.query(
      `UPDATE submissions
          SET score = $1, feedback = $2, status = 'graded', graded_at = NOW(), graded_by = $3
        WHERE id = $4
        RETURNING id, assignment_id, student_id, content, file_name, status, is_late,
                  score, feedback, submitted_at, graded_at`,
      [Math.round(score * 100) / 100, feedback || null, req.user.id, submission.id]
    );
    res.json({ submission: rows[0] });
  })
);

// Lets a teacher reopen a graded submission so the student can resubmit
router.put(
  '/:id/return',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const submission = await getSubmissionWithClass(toId(req.params.id));
    if (!submission || submission.teacher_id !== req.user.id) throw new HttpError(404, 'Submission not found');

    const { rows } = await db.query(
      `UPDATE submissions
          SET status = 'submitted', score = NULL, graded_at = NULL, graded_by = NULL
        WHERE id = $1
        RETURNING id, assignment_id, student_id, content, file_name, status, is_late,
                  score, feedback, submitted_at, graded_at`,
      [submission.id]
    );
    res.json({ submission: rows[0] });
  })
);

router.get(
  '/:id/file',
  asyncHandler(async (req, res) => {
    const submission = await getSubmissionWithClass(toId(req.params.id));
    const allowed =
      submission &&
      (submission.teacher_id === req.user.id || submission.student_id === req.user.id);
    if (!allowed || !submission.file_path) throw new HttpError(404, 'File not found');
    sendStoredFile(res, submission.file_path, submission.file_name);
  })
);

module.exports = router;
