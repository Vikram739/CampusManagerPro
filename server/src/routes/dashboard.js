const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const { summarize } = require('../utils/grades');

router.use(authenticate);

async function teacherDashboard(teacherId) {
  const stats = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM classes WHERE teacher_id = $1)::int AS class_count,
       (SELECT COUNT(DISTINCT e.student_id)
          FROM enrollments e JOIN classes c ON c.id = e.class_id
         WHERE c.teacher_id = $1)::int AS student_count,
       (SELECT COUNT(*)
          FROM assignments a JOIN classes c ON c.id = a.class_id
         WHERE c.teacher_id = $1)::int AS assignment_count,
       (SELECT COUNT(*)
          FROM submissions s
          JOIN assignments a ON a.id = s.assignment_id
          JOIN classes c ON c.id = a.class_id
         WHERE c.teacher_id = $1 AND s.status = 'submitted')::int AS pending_grading`,
    [teacherId]
  );

  const toGrade = await db.query(
    `SELECT s.id, s.submitted_at, s.is_late, u.name AS student_name,
            a.id AS assignment_id, a.title AS assignment_title, c.name AS class_name
       FROM submissions s
       JOIN users u ON u.id = s.student_id
       JOIN assignments a ON a.id = s.assignment_id
       JOIN classes c ON c.id = a.class_id
      WHERE c.teacher_id = $1 AND s.status = 'submitted'
      ORDER BY s.submitted_at ASC
      LIMIT 8`,
    [teacherId]
  );

  const upcoming = await db.query(
    `SELECT a.id, a.title, a.due_date, c.name AS class_name,
            (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id)::int AS submission_count,
            (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id)::int AS student_count
       FROM assignments a JOIN classes c ON c.id = a.class_id
      WHERE c.teacher_id = $1 AND a.due_date >= NOW()
      ORDER BY a.due_date ASC
      LIMIT 6`,
    [teacherId]
  );

  return { stats: stats.rows[0], toGrade: toGrade.rows, upcoming: upcoming.rows };
}

async function studentDashboard(studentId) {
  const stats = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM enrollments WHERE student_id = $1)::int AS class_count,
       (SELECT COUNT(*)
          FROM assignments a
          JOIN enrollments e ON e.class_id = a.class_id AND e.student_id = $1
          LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
         WHERE s.id IS NULL AND a.due_date >= NOW())::int AS pending_count,
       (SELECT COUNT(*)
          FROM assignments a
          JOIN enrollments e ON e.class_id = a.class_id AND e.student_id = $1
          LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
         WHERE s.id IS NULL AND a.due_date < NOW())::int AS missing_count,
       (SELECT COUNT(*) FROM submissions WHERE student_id = $1)::int AS submitted_count`,
    [studentId]
  );

  const todo = await db.query(
    `SELECT a.id, a.title, a.due_date, a.max_points, a.allow_late, c.name AS class_name
       FROM assignments a
       JOIN classes c ON c.id = a.class_id
       JOIN enrollments e ON e.class_id = a.class_id AND e.student_id = $1
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
      WHERE s.id IS NULL
      ORDER BY a.due_date ASC
      LIMIT 10`,
    [studentId]
  );

  const graded = await db.query(
    `SELECT s.id, s.score, s.feedback, s.graded_at, a.id AS assignment_id, a.title,
            a.max_points, c.name AS class_name
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN classes c ON c.id = a.class_id
       JOIN enrollments e ON e.class_id = c.id AND e.student_id = s.student_id
      WHERE s.student_id = $1 AND s.status = 'graded'
      ORDER BY s.graded_at DESC`,
    [studentId]
  );

  return {
    stats: { ...stats.rows[0], overall: summarize(graded.rows) },
    todo: todo.rows,
    recentGrades: graded.rows.slice(0, 5),
  };
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const data =
      req.user.role === 'teacher' ? await teacherDashboard(req.user.id) : await studentDashboard(req.user.id);
    res.json(data);
  })
);

// Every assignment across the student's classes, with their submission and grade
router.get(
  '/grades',
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(
      `SELECT c.id AS class_id, c.name AS class_name, c.subject,
              a.id AS assignment_id, a.title, a.due_date, a.max_points,
              s.id AS submission_id, s.status, s.score, s.feedback, s.is_late,
              s.submitted_at, s.graded_at
         FROM enrollments e
         JOIN classes c ON c.id = e.class_id
         JOIN assignments a ON a.class_id = c.id
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.student_id
        WHERE e.student_id = $1
        ORDER BY c.name, a.due_date`,
      [req.user.id]
    );

    const classes = [];
    const byId = {};
    rows.forEach((row) => {
      if (!byId[row.class_id]) {
        byId[row.class_id] = { id: row.class_id, name: row.class_name, subject: row.subject, items: [] };
        classes.push(byId[row.class_id]);
      }
      byId[row.class_id].items.push(row);
    });
    classes.forEach((cls) => {
      cls.summary = summarize(cls.items.filter((i) => i.status === 'graded'));
    });

    const overall = summarize(rows.filter((r) => r.status === 'graded'));
    res.json({ classes, overall });
  })
);

module.exports = router;
