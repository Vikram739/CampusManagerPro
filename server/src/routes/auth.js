const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_COLUMNS = 'id, name, email, role, created_at';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const { password, role } = req.body;

    if (!name) throw new HttpError(400, 'Name is required');
    if (name.length > 120) throw new HttpError(400, 'Name is too long');
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required');
    validatePassword(password);
    if (!['teacher', 'student'].includes(role)) throw new HttpError(400, 'Role must be teacher or student');

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount) throw new HttpError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING ${USER_COLUMNS}`,
      [name, email, passwordHash, role]
    );
    res.status(201).json({ token: signToken(rows[0]), user: rows[0] });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    const { password_hash: _omit, ...publicUser } = user;
    res.json({ token: signToken(user), user: publicUser });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [req.user.id]);
    if (!rows[0]) throw new HttpError(401, 'Account no longer exists');
    res.json({ user: rows[0] });
  })
);

router.put(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const name = (req.body.name || '').trim();
    const { currentPassword, newPassword } = req.body;
    if (!name) throw new HttpError(400, 'Name is required');

    if (newPassword) {
      validatePassword(newPassword);
      const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (!(await bcrypt.compare(currentPassword || '', rows[0].password_hash))) {
        throw new HttpError(400, 'Current password is incorrect');
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
    }

    const { rows } = await db.query(
      `UPDATE users SET name = $1 WHERE id = $2 RETURNING ${USER_COLUMNS}`,
      [name, req.user.id]
    );
    res.json({ user: rows[0], token: signToken(rows[0]) });
  })
);

module.exports = router;
