const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload, removeFile, cleanupOnError, sendStoredFile } = require('../middleware/upload');
const { HttpError, asyncHandler, toId } = require('../utils/http');
const { getClassForUser, getAssignmentForUser } = require('../utils/access');

const PUBLIC_COLUMNS = `a.id, a.class_id, a.title, a.description, a.due_date, a.max_points,
  a.allow_late, a.attachment_name, a.created_at, a.updated_at`;

function readAssignmentFields(body) {
  const title = (body.title || '').trim();
  const description = (body.description || '').trim();
  const dueDate = new Date(body.due_date);
  const maxPoints = Number(body.max_points);
  // Multipart fields arrive as strings
  const allowLate = String(body.allow_late) !== 'false';

  if (!title) throw new HttpError(400, 'Title is required');
  if (title.length > 200) throw new HttpError(400, 'Title is too long');
  if (Number.isNaN(dueDate.getTime())) throw new HttpError(400, 'A valid due date is required');
  if (!Number.isInteger(maxPoints) || maxPoints < 1 || maxPoints > 1000) {
    throw new HttpError(400, 'Max points must be a whole number between 1 and 1000');
  }
  return { title, description: description || null, dueDate, maxPoints, allowLate };
}

function stripFilePath(submission) {
  if (!submission) return null;
  const { file_path: _omit, ...rest } = submission;
  return rest;
}

router.use(authenticate);

router.post(
  '/',
  requireRole('teacher'),
  upload.single('attachment'),
  cleanupOnError(async (req, res) => {
    const classId = toId(req.body.class_id);
    await getClassForUser(classId, req.user);
    const f = readAssignmentFields(req.body);

    const { rows } = await db.query(
      `INSERT INTO assignments
         (class_id, title, description, due_date, max_points, allow_late, attachment_path, attachment_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        classId,
        f.title,
        f.description,
        f.dueDate,
        f.maxPoints,
        f.allowLate,
        req.file ? req.file.filename : null,
        req.file ? req.file.originalname : null,
      ]
    );
    res.status(201).json({ assignment: { id: rows[0].id } });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const assignmentId = toId(req.params.id);
    const assignment = await getAssignmentForUser(assignmentId, req.user);
    const { attachment_path: _omit, ...publicAssignment } = assignment;

    if (req.user.role === 'teacher') {
      // Every enrolled student, with their submission if they have one
      const { rows } = await db.query(
        `SELECT u.id AS student_id, u.name AS student_name, u.email AS student_email,
                s.id, s.content, s.file_name, s.status, s.is_late, s.score, s.feedback,
                s.submitted_at, s.graded_at
           FROM enrollments e
           JOIN users u ON u.id = e.student_id
           LEFT JOIN submissions s ON s.student_id = u.id AND s.assignment_id = $1
          WHERE e.class_id = $2
          ORDER BY u.name`,
        [assignmentId, assignment.class_id]
      );
      const graded = rows.filter((r) => r.status === 'graded');
      const stats = {
        enrolled: rows.length,
        submitted: rows.filter((r) => r.id).length,
        graded: graded.length,
        average: graded.length
          ? Math.round((graded.reduce((sum, r) => sum + r.score, 0) / graded.length) * 10) / 10
          : null,
      };
      return res.json({ assignment: publicAssignment, submissions: rows, stats });
    }

    const { rows } = await db.query('SELECT * FROM submissions WHERE assignment_id = $1 AND student_id = $2', [
      assignmentId,
      req.user.id,
    ]);
    const submission = rows[0] || null;
    const pastDue = new Date() > new Date(assignment.due_date);
    const canSubmit = (!submission || submission.status !== 'graded') && (!pastDue || assignment.allow_late);
    return res.json({ assignment: publicAssignment, submission: stripFilePath(submission), canSubmit });
  })
);

router.put(
  '/:id',
  requireRole('teacher'),
  upload.single('attachment'),
  cleanupOnError(async (req, res) => {
    const assignmentId = toId(req.params.id);
    const existing = await getAssignmentForUser(assignmentId, req.user);
    const f = readAssignmentFields(req.body);

    let attachmentPath = existing.attachment_path;
    let attachmentName = existing.attachment_name;
    if (req.file || req.body.remove_attachment === 'true') {
      removeFile(existing.attachment_path);
      attachmentPath = req.file ? req.file.filename : null;
      attachmentName = req.file ? req.file.originalname : null;
    }

    const { rows } = await db.query(
      `UPDATE assignments a
          SET title = $1, description = $2, due_date = $3, max_points = $4, allow_late = $5,
              attachment_path = $6, attachment_name = $7, updated_at = NOW()
        WHERE a.id = $8
        RETURNING ${PUBLIC_COLUMNS}`,
      [f.title, f.description, f.dueDate, f.maxPoints, f.allowLate, attachmentPath, attachmentName, assignmentId]
    );
    res.json({ assignment: rows[0] });
  })
);

router.delete(
  '/:id',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const assignmentId = toId(req.params.id);
    const assignment = await getAssignmentForUser(assignmentId, req.user);
    const files = await db.query(
      'SELECT file_path FROM submissions WHERE assignment_id = $1 AND file_path IS NOT NULL',
      [assignmentId]
    );
    await db.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
    removeFile(assignment.attachment_path);
    files.rows.forEach((f) => removeFile(f.file_path));
    res.status(204).end();
  })
);

router.get(
  '/:id/attachment',
  asyncHandler(async (req, res) => {
    const assignment = await getAssignmentForUser(toId(req.params.id), req.user);
    if (!assignment.attachment_path) throw new HttpError(404, 'This assignment has no attachment');
    sendStoredFile(res, assignment.attachment_path, assignment.attachment_name);
  })
);

// ---- Student submission ----

router.post(
  '/:id/submit',
  requireRole('student'),
  upload.single('file'),
  cleanupOnError(async (req, res) => {
    const assignmentId = toId(req.params.id);
    const assignment = await getAssignmentForUser(assignmentId, req.user);
    const content = (req.body.content || '').trim();

    const { rows } = await db.query('SELECT * FROM submissions WHERE assignment_id = $1 AND student_id = $2', [
      assignmentId,
      req.user.id,
    ]);
    const existing = rows[0];

    if (existing && existing.status === 'graded') {
      throw new HttpError(400, 'This submission has already been graded and can no longer be changed');
    }
    const isLate = new Date() > new Date(assignment.due_date);
    if (isLate && !assignment.allow_late) {
      throw new HttpError(400, 'The deadline has passed and late submissions are not accepted');
    }
    const keepsExistingFile = existing && existing.file_path && req.body.remove_file !== 'true';
    if (!content && !req.file && !keepsExistingFile) {
      throw new HttpError(400, 'Add an answer or attach a file before submitting');
    }

    let result;
    if (existing) {
      let filePath = existing.file_path;
      let fileName = existing.file_name;
      if (req.file || req.body.remove_file === 'true') {
        removeFile(existing.file_path);
        filePath = req.file ? req.file.filename : null;
        fileName = req.file ? req.file.originalname : null;
      }
      result = await db.query(
        `UPDATE submissions
            SET content = $1, file_path = $2, file_name = $3, is_late = $4, submitted_at = NOW()
          WHERE id = $5 RETURNING *`,
        [content || null, filePath, fileName, isLate, existing.id]
      );
    } else {
      result = await db.query(
        `INSERT INTO submissions (assignment_id, student_id, content, file_path, file_name, is_late)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          assignmentId,
          req.user.id,
          content || null,
          req.file ? req.file.filename : null,
          req.file ? req.file.originalname : null,
          isLate,
        ]
      );
    }
    res.status(existing ? 200 : 201).json({ submission: stripFilePath(result.rows[0]) });
  })
);

router.delete(
  '/:id/submission',
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const assignmentId = toId(req.params.id);
    await getAssignmentForUser(assignmentId, req.user);
    const { rows } = await db.query('SELECT * FROM submissions WHERE assignment_id = $1 AND student_id = $2', [
      assignmentId,
      req.user.id,
    ]);
    const submission = rows[0];
    if (!submission) throw new HttpError(404, 'Nothing to unsubmit');
    if (submission.status === 'graded') throw new HttpError(400, 'Graded submissions cannot be withdrawn');

    await db.query('DELETE FROM submissions WHERE id = $1', [submission.id]);
    removeFile(submission.file_path);
    res.status(204).end();
  })
);

module.exports = router;
