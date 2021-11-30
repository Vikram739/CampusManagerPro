const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { removeFile } = require('../middleware/upload');
const { HttpError, asyncHandler, toId } = require('../utils/http');
const { getClassForUser } = require('../utils/access');
const { summarize } = require('../utils/grades');

// No 0/O/1/I so codes are easy to read aloud
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateJoinCode() {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function readClassFields(body) {
  const name = (body.name || '').trim();
  const subject = (body.subject || '').trim();
  const description = (body.description || '').trim();
  if (!name) throw new HttpError(400, 'Class name is required');
  if (name.length > 150) throw new HttpError(400, 'Class name is too long');
  if (subject.length > 100) throw new HttpError(400, 'Subject is too long');
  return { name, subject: subject || null, description: description || null };
}

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const sql =
      req.user.role === 'teacher'
        ? `SELECT c.*,
                  (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id)::int AS student_count,
                  (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id)::int AS assignment_count
             FROM classes c
            WHERE c.teacher_id = $1
            ORDER BY c.created_at DESC`
        : `SELECT c.id, c.name, c.subject, c.description, c.created_at, u.name AS teacher_name,
                  (SELECT COUNT(*) FROM enrollments e2 WHERE e2.class_id = c.id)::int AS student_count,
                  (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id)::int AS assignment_count
             FROM classes c
             JOIN enrollments e ON e.class_id = c.id
             JOIN users u ON u.id = c.teacher_id
            WHERE e.student_id = $1
            ORDER BY e.enrolled_at DESC`;
    const { rows } = await db.query(sql, [req.user.id]);
    res.json({ classes: rows });
  })
);

router.post(
  '/',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const { name, subject, description } = readClassFields(req.body);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const { rows } = await db.query(
          `INSERT INTO classes (teacher_id, name, subject, description, join_code)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [req.user.id, name, subject, description, generateJoinCode()]
        );
        return res.status(201).json({ class: { ...rows[0], student_count: 0, assignment_count: 0 } });
      } catch (err) {
        if (err.code !== '23505') throw err; // retry only on join_code collision
      }
    }
    throw new HttpError(500, 'Could not generate a unique join code, please try again');
  })
);

router.post(
  '/join',
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const code = (req.body.code || '').trim().toUpperCase();
    if (!code) throw new HttpError(400, 'Join code is required');

    const { rows } = await db.query('SELECT id, name FROM classes WHERE join_code = $1', [code]);
    if (!rows[0]) throw new HttpError(404, 'No class found with that code');

    const result = await db.query(
      `INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [rows[0].id, req.user.id]
    );
    if (!result.rowCount) throw new HttpError(409, 'You are already enrolled in this class');
    res.status(201).json({ class: rows[0] });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    const cls = await getClassForUser(classId, req.user);
    const isTeacher = req.user.role === 'teacher';

    const assignmentsSql = isTeacher
      ? `SELECT a.id, a.title, a.due_date, a.max_points, a.allow_late, a.created_at,
                COUNT(s.id)::int AS submission_count,
                (COUNT(s.id) FILTER (WHERE s.status = 'graded'))::int AS graded_count
           FROM assignments a
           LEFT JOIN submissions s ON s.assignment_id = a.id
          WHERE a.class_id = $1
          GROUP BY a.id
          ORDER BY a.due_date DESC`
      : `SELECT a.id, a.title, a.due_date, a.max_points, a.allow_late, a.created_at,
                s.id AS submission_id, s.status AS submission_status, s.score,
                s.submitted_at, s.is_late
           FROM assignments a
           LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $2
          WHERE a.class_id = $1
          ORDER BY a.due_date DESC`;
    const assignments = await db.query(assignmentsSql, isTeacher ? [classId] : [classId, req.user.id]);

    const students = await db.query(
      `SELECT u.id, u.name, ${isTeacher ? 'u.email, ' : ''}e.enrolled_at
         FROM enrollments e JOIN users u ON u.id = e.student_id
        WHERE e.class_id = $1
        ORDER BY u.name`,
      [classId]
    );

    if (!isTeacher) delete cls.join_code;
    res.json({ class: cls, assignments: assignments.rows, students: students.rows });
  })
);

router.put(
  '/:id',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    await getClassForUser(classId, req.user);
    const { name, subject, description } = readClassFields(req.body);
    const { rows } = await db.query(
      'UPDATE classes SET name = $1, subject = $2, description = $3 WHERE id = $4 RETURNING *',
      [name, subject, description, classId]
    );
    res.json({ class: rows[0] });
  })
);

router.post(
  '/:id/regenerate-code',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    await getClassForUser(classId, req.user);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const { rows } = await db.query('UPDATE classes SET join_code = $1 WHERE id = $2 RETURNING join_code', [
          generateJoinCode(),
          classId,
        ]);
        return res.json({ join_code: rows[0].join_code });
      } catch (err) {
        if (err.code !== '23505') throw err;
      }
    }
    throw new HttpError(500, 'Could not generate a unique join code, please try again');
  })
);

router.delete(
  '/:id',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    await getClassForUser(classId, req.user);

    // Collect uploaded files before the cascade delete removes their rows
    const files = await db.query(
      `SELECT a.attachment_path AS path FROM assignments a WHERE a.class_id = $1 AND a.attachment_path IS NOT NULL
       UNION ALL
       SELECT s.file_path FROM submissions s JOIN assignments a ON a.id = s.assignment_id
        WHERE a.class_id = $1 AND s.file_path IS NOT NULL`,
      [classId]
    );
    await db.query('DELETE FROM classes WHERE id = $1', [classId]);
    files.rows.forEach((f) => removeFile(f.path));
    res.status(204).end();
  })
);

router.delete(
  '/:id/students/:studentId',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    await getClassForUser(classId, req.user);
    await db.query('DELETE FROM enrollments WHERE class_id = $1 AND student_id = $2', [
      classId,
      toId(req.params.studentId),
    ]);
    res.status(204).end();
  })
);

router.delete(
  '/:id/leave',
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    await getClassForUser(classId, req.user);
    await db.query('DELETE FROM enrollments WHERE class_id = $1 AND student_id = $2', [classId, req.user.id]);
    res.status(204).end();
  })
);

// ---- Announcements ----

router.get(
  '/:id/announcements',
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    await getClassForUser(classId, req.user);
    const { rows } = await db.query(
      `SELECT an.*, u.name AS author_name
         FROM announcements an JOIN users u ON u.id = an.author_id
        WHERE an.class_id = $1
        ORDER BY an.created_at DESC`,
      [classId]
    );
    res.json({ announcements: rows });
  })
);

router.post(
  '/:id/announcements',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    await getClassForUser(classId, req.user);
    const title = (req.body.title || '').trim();
    const body = (req.body.body || '').trim();
    if (!title || !body) throw new HttpError(400, 'Title and message are required');
    if (title.length > 200) throw new HttpError(400, 'Title is too long');

    const { rows } = await db.query(
      `INSERT INTO announcements (class_id, author_id, title, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [classId, req.user.id, title, body]
    );
    res.status(201).json({ announcement: { ...rows[0], author_name: req.user.name } });
  })
);

router.delete(
  '/:id/announcements/:announcementId',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    await getClassForUser(classId, req.user);
    await db.query('DELETE FROM announcements WHERE id = $1 AND class_id = $2', [
      toId(req.params.announcementId),
      classId,
    ]);
    res.status(204).end();
  })
);

// ---- Gradebook ----
// Teachers get every enrolled student; students get only their own row.

router.get(
  '/:id/gradebook',
  asyncHandler(async (req, res) => {
    const classId = toId(req.params.id);
    await getClassForUser(classId, req.user);
    const isTeacher = req.user.role === 'teacher';

    const assignments = await db.query(
      `SELECT id, title, due_date, max_points FROM assignments
        WHERE class_id = $1 ORDER BY due_date ASC`,
      [classId]
    );
    const students = await db.query(
      `SELECT u.id, u.name, u.email
         FROM enrollments e JOIN users u ON u.id = e.student_id
        WHERE e.class_id = $1 ${isTeacher ? '' : 'AND u.id = $2'}
        ORDER BY u.name`,
      isTeacher ? [classId] : [classId, req.user.id]
    );
    const submissions = await db.query(
      `SELECT s.id, s.assignment_id, s.student_id, s.status, s.score, s.is_late, a.max_points
         FROM submissions s JOIN assignments a ON a.id = s.assignment_id
        WHERE a.class_id = $1 ${isTeacher ? '' : 'AND s.student_id = $2'}`,
      isTeacher ? [classId] : [classId, req.user.id]
    );

    const byStudent = {};
    submissions.rows.forEach((s) => {
      byStudent[s.student_id] = byStudent[s.student_id] || {};
      byStudent[s.student_id][s.assignment_id] = s;
    });

    const rows = students.rows.map((student) => {
      const cells = byStudent[student.id] || {};
      const graded = Object.values(cells).filter((s) => s.status === 'graded');
      return { student, submissions: cells, summary: summarize(graded) };
    });

    const assignmentStats = assignments.rows.map((a) => {
      const graded = submissions.rows.filter((s) => s.assignment_id === a.id && s.status === 'graded');
      const average = graded.length
        ? Math.round((graded.reduce((sum, s) => sum + s.score, 0) / graded.length) * 10) / 10
        : null;
      return { ...a, graded_count: graded.length, average };
    });

    res.json({ assignments: assignmentStats, rows });
  })
);

module.exports = router;
