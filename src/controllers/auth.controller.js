const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const query = require("../db/query");
const logAudit = require("../services/audit.service");



exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const hashedPassword = await bcrypt.hash(password, 10);

    
    const result = await query(
      `INSERT INTO users (email, password)
       VALUES ($1, $2)
       RETURNING id, email, role`,
      [email, hashedPassword]
    );

    res.status(201).json({
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Email already exists",
      });
    }

    console.error(error);
    res.status(500).json({
      error: "Signup failed",
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const result = await query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    await logAudit(user.id, "LOGIN_SUCCESS", "user", user.id);

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error(error); 
    res.status(500).json({
      error: "Login failed",
    });
  }
};
