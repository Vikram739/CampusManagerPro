require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n) => new Date(Date.now() + n * DAY);

async function insert(client, sql, params) {
  const { rows } = await client.query(sql, params);
  return rows[0];
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'TRUNCATE announcements, submissions, assignments, enrollments, classes, users RESTART IDENTITY CASCADE'
    );

    const passwordHash = await bcrypt.hash('password123', 10);
    const addUser = (name, email, role) =>
      insert(
        client,
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, email, passwordHash, role]
      );

    const teacher = await addUser('Anita Rao', 'teacher@campus.test', 'teacher');
    const teacher2 = await addUser('David Fernandes', 'teacher2@campus.test', 'teacher');
    const students = [
      await addUser('Rahul Verma', 'student@campus.test', 'student'),
      await addUser('Sneha Patil', 'sneha@campus.test', 'student'),
      await addUser('Arjun Mehta', 'arjun@campus.test', 'student'),
      await addUser('Meera Nair', 'meera@campus.test', 'student'),
    ];

    const addClass = (teacherId, name, subject, description, code) =>
      insert(
        client,
        `INSERT INTO classes (teacher_id, name, subject, description, join_code)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [teacherId, name, subject, description, code]
      );

    const math = await addClass(teacher.id, 'Mathematics - Grade 10', 'Mathematics',
      'Algebra, geometry and trigonometry for the 2021-22 academic year.', 'MATH10');
    const physics = await addClass(teacher.id, 'Physics - Grade 10', 'Physics',
      'Motion, forces, energy and electricity.', 'PHYS10');
    const english = await addClass(teacher2.id, 'English Literature', 'English',
      'Poetry, prose and essay writing.', 'ENGL10');

    for (const s of students) {
      await client.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2)', [math.id, s.id]);
      await client.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2)', [english.id, s.id]);
    }
    for (const s of students.slice(0, 3)) {
      await client.query('INSERT INTO enrollments (class_id, student_id) VALUES ($1, $2)', [physics.id, s.id]);
    }

    const addAssignment = (classId, title, description, dueInDays, maxPoints, allowLate = true) =>
      insert(
        client,
        `INSERT INTO assignments (class_id, title, description, due_date, max_points, allow_late, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [classId, title, description, daysFromNow(dueInDays), maxPoints, allowLate, daysFromNow(dueInDays - 7)]
      );

    const quadratics = await addAssignment(math.id, 'Quadratic Equations - Worksheet 1',
      'Solve problems 1-20 from chapter 4. Show all working.', -14, 50);
    const triangles = await addAssignment(math.id, 'Similar Triangles',
      'Complete the exercise on similarity criteria (AA, SSS, SAS).', -5, 40);
    await addAssignment(math.id, 'Trigonometry Basics',
      'Find sin, cos and tan for the given right triangles. Upload a scanned PDF.', 4, 30);
    await addAssignment(math.id, 'Statistics Project',
      'Collect data from 20 classmates and compute mean, median and mode.', 12, 100, false);

    const motion = await addAssignment(physics.id, 'Laws of Motion - Lab Report',
      'Write up the trolley experiment: aim, apparatus, observations, conclusion.', -7, 25);
    await addAssignment(physics.id, 'Work, Energy and Power',
      'Numericals 1-15 from the textbook.', 3, 30, false);

    const essay = await addAssignment(english.id, 'Essay: A Journey I Remember',
      '500-700 words, narrative style.', -3, 20);
    await addAssignment(english.id, 'Poem Analysis',
      'Analyse the literary devices in "The Road Not Taken".', 6, 20);

    const addSubmission = (assignmentId, studentId, content, daysAgo, score, feedback, late = false) =>
      client.query(
        `INSERT INTO submissions
           (assignment_id, student_id, content, submitted_at, is_late, status, score, feedback, graded_at, graded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          assignmentId,
          studentId,
          content,
          daysFromNow(-daysAgo),
          late,
          score === null ? 'submitted' : 'graded',
          score,
          feedback,
          score === null ? null : daysFromNow(-daysAgo + 1),
          score === null ? null : teacher.id,
        ]
      );

    const [rahul, sneha, arjun, meera] = students;
    await addSubmission(quadratics.id, rahul.id, 'Solutions attached in the answer box: x = 3, x = -2 ...', 15, 44, 'Good work. Check Q17 sign error.');
    await addSubmission(quadratics.id, sneha.id, 'All 20 problems solved using factorisation and the formula.', 15, 49, 'Excellent!');
    await addSubmission(quadratics.id, arjun.id, 'Solved 1-15, will finish rest later.', 13, 30, 'Incomplete and late.', true);
    await addSubmission(quadratics.id, meera.id, 'Completed worksheet.', 16, 41, 'Well presented.');

    await addSubmission(triangles.id, rahul.id, 'Used AA criterion for Q1-Q6, SSS for Q7-Q10.', 6, null, null);
    await addSubmission(triangles.id, sneha.id, 'Answers with diagrams described in text.', 6, 36, 'Nice diagrams.');
    await addSubmission(triangles.id, meera.id, 'Done.', 4, null, null, true);

    await addSubmission(motion.id, rahul.id, 'Aim: verify F = ma. Observations table ...', 8, 21, 'Add error analysis next time.');
    await addSubmission(motion.id, sneha.id, 'Lab report on trolley experiment.', 8, null, null);

    await addSubmission(essay.id, rahul.id, 'The summer we drove to Goa ...', 4, null, null);

    await client.query(
      `INSERT INTO announcements (class_id, author_id, title, body, created_at) VALUES
        ($1, $2, 'Welcome to Grade 10 Maths!', 'Please join using the class code and check the assignments tab every week.', $4),
        ($1, $2, 'Unit test next Friday', 'The test covers quadratic equations and similar triangles.', $5),
        ($3, $2, 'Lab safety', 'Closed-toe shoes are mandatory for all lab sessions.', $5)`,
      [math.id, teacher.id, physics.id, daysFromNow(-20), daysFromNow(-2)]
    );

    await client.query('COMMIT');
    console.log('Seed data inserted. All accounts use the password "password123":');
    console.log('  teacher@campus.test   (teacher)');
    console.log('  teacher2@campus.test  (teacher)');
    console.log('  student@campus.test   (student)');
    console.log('  sneha@campus.test, arjun@campus.test, meera@campus.test (students)');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
