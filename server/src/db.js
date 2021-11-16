const { Pool, types } = require('pg');

// Return NUMERIC columns (scores, averages) as JS numbers instead of strings
types.setTypeParser(1700, (value) => (value === null ? null : parseFloat(value)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
