const db = require('../db');
const { HttpError } = require('./http');

// Returns the class if the user teaches it or is enrolled in it, otherwise throws 404
async function getClassForUser(classId, user) {
  const sql =
    user.role === 'teacher'
      ? `SELECT c.*, u.name AS teacher_name
           FROM classes c JOIN users u ON u.id = c.teacher_id
          WHERE c.id = $1 AND c.teacher_id = $2`
      : `SELECT c.*, u.name AS teacher_name
           FROM classes c
           JOIN users u ON u.id = c.teacher_id
           JOIN enrollments e ON e.class_id = c.id
          WHERE c.id = $1 AND e.student_id = $2`;
  const { rows } = await db.query(sql, [classId, user.id]);
  if (!rows[0]) throw new HttpError(404, 'Class not found');
  return rows[0];
}

// Returns the assignment (with class info) if the user can see it, otherwise throws 404
async function getAssignmentForUser(assignmentId, user) {
  const sql =
    user.role === 'teacher'
      ? `SELECT a.*, c.name AS class_name, c.teacher_id
           FROM assignments a JOIN classes c ON c.id = a.class_id
          WHERE a.id = $1 AND c.teacher_id = $2`
      : `SELECT a.*, c.name AS class_name, c.teacher_id
           FROM assignments a
           JOIN classes c ON c.id = a.class_id
           JOIN enrollments e ON e.class_id = c.id
          WHERE a.id = $1 AND e.student_id = $2`;
  const { rows } = await db.query(sql, [assignmentId, user.id]);
  if (!rows[0]) throw new HttpError(404, 'Assignment not found');
  return rows[0];
}

module.exports = { getClassForUser, getAssignmentForUser };
