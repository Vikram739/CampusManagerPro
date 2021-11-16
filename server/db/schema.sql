-- CampusManagerPro schema (PostgreSQL 14)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id          SERIAL PRIMARY KEY,
  teacher_id  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  subject     VARCHAR(100),
  description TEXT,
  join_code   VARCHAR(10)  NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  class_id    INTEGER     NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id              SERIAL PRIMARY KEY,
  class_id        INTEGER      NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  due_date        TIMESTAMPTZ  NOT NULL,
  max_points      INTEGER      NOT NULL DEFAULT 100 CHECK (max_points > 0),
  allow_late      BOOLEAN      NOT NULL DEFAULT TRUE,
  attachment_path VARCHAR(255),
  attachment_name VARCHAR(255),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id            SERIAL PRIMARY KEY,
  assignment_id INTEGER     NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT,
  file_path     VARCHAR(255),
  file_name     VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded')),
  is_late       BOOLEAN     NOT NULL DEFAULT FALSE,
  score         NUMERIC(7, 2),
  feedback      TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at     TIMESTAMPTZ,
  graded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id         SERIAL PRIMARY KEY,
  class_id   INTEGER      NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  author_id  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  body       TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher        ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student    ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class      ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due        ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_student    ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status     ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_announcements_class    ON announcements(class_id);
