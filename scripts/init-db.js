require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  console.error('Usage: set DATABASE_URL=your_connection_string && node scripts/init-db.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDb() {
  const client = await pool.connect();
  try {
    console.log('Connected to database...');
    
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema migration...');
    await client.query(schemaSql);
    
    console.log('✅ Database initialized successfully!');
    console.log('Tables created: users, expenses, expense_categories, audit_logs');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDb();
