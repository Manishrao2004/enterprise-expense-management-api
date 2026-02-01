require("dotenv").config();
const { Client } = require("pg");
const bcrypt = require("bcrypt");

// Usage: node scripts/create-user.js <email> <password> <role>
// Example: node scripts/create-user.js admin@corp.com secret123 MANAGER

const args = process.argv.slice(2);
if (args.length < 3) {
  console.log("Usage: node scripts/create-user.js <email> <password> <role>");
  console.log("Roles: EMPLOYEE, MANAGER");
  process.exit(1);
}

const [email, password, role] = args;

(async () => {
    // Connect directly to DB
    const dbConfig = process.env.DATABASE_URL 
        ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
        : {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        };

    const client = new Client(dbConfig);

    try {
        await client.connect();
        console.log("Connected to Database...");

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert with explicit ROLE
        const res = await client.query(
            `INSERT INTO users (email, password, role) 
             VALUES ($1, $2, $3) 
             RETURNING id, email, role`,
            [email, hashedPassword, role.toUpperCase()]
        );
        
        console.log("✅ User Created Successfully:");
        console.table(res.rows[0]);

    } catch(err) {
        if (err.code === '23505') {
            console.error("❌ Error: User with this email already exists.");
        } else {
            console.error("❌ Error creating user:", err.message);
        }
    } finally {
        await client.end();
        process.exit();
    }
})();
