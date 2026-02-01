const query = require("../db/query");
const logAudit = require("../services/audit.service");

/**
 * ADD EXPENSE
 */
exports.addExpense = async (req, res) => {
  try {
    const { amount, category_id } = req.body;
    const userId = req.user.id;

    const result = await query(
      `INSERT INTO expenses (user_id, category_id, amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, category_id, amount]
    );

    const expense = result.rows[0];

    await logAudit(userId, "CREATE_EXPENSE", "expense", expense.id);

    res.status(201).json({
      message: "Expense added",
      expense,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add expense" });
  }
};

/**
 * GET EXPENSES (filters + pagination)
 */
exports.getExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        e.*,
        c.name AS category,
        u.email AS employee_email
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      JOIN users u ON e.user_id = u.id
    `;

    const values = [];
    let whereAdded = false;

    /**
     * ROLE-BASED VISIBILITY
     * view param: 'team' | 'personal' (default depends on role)
     */
    const view = req.query.view || (role === 'MANAGER' ? 'team' : 'personal');

    if (view === "personal") {
      // Personal mode: See only my own expenses
      sql += ` WHERE e.user_id = $1`;
      values.push(userId);
      whereAdded = true;
    } 
    else if (role === "MANAGER") { 
      // Team mode (Manager): See expenses from EMPLOYEES
      sql += ` WHERE u.role = 'EMPLOYEE'`;
      whereAdded = true;
      
      // Default to PENDING if not specified
      if (!req.query.status) {
         sql += ` AND e.status = 'PENDING'`;
      }
    } 
    else {
        // Fallback
        sql += ` WHERE e.user_id = $1`;
        values.push(userId);
        whereAdded = true;
    }

    /**
     * OPTIONAL FILTERS
     */
    if (req.query.category_id) {
      sql += whereAdded ? " AND" : " WHERE";
      sql += ` e.category_id = $${values.length + 1}`;
      values.push(req.query.category_id);
      whereAdded = true;
    }

    if (req.query.status) {
      sql += whereAdded ? " AND" : " WHERE";
      sql += ` e.status = $${values.length + 1}`;
      values.push(req.query.status);
      whereAdded = true;
    }

    if (req.query.from) {
      sql += whereAdded ? " AND" : " WHERE";
      sql += ` e.created_at >= $${values.length + 1}`;
      values.push(req.query.from);
      whereAdded = true;
    }

    if (req.query.to) {
      sql += whereAdded ? " AND" : " WHERE";
      sql += ` e.created_at <= $${values.length + 1}`;
      values.push(req.query.to);
      whereAdded = true;
    }

    /**
     * SEARCH (Category Name or Employee Email)
     */
    if (req.query.search) {
        sql += whereAdded ? " AND" : " WHERE";
        // Search in category name or user email
        // ILIKE is case-insensitive pattern matching in PostgreSQL
        sql += ` (c.name ILIKE $${values.length + 1} OR u.email ILIKE $${values.length + 1})`;
        values.push(`%${req.query.search}%`);
        whereAdded = true;
    }

    /**
     * SORTING
     * Default: created_at DESC
     */
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = (req.query.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Whitelist sortable columns to prevent SQL injection
    const sortableCols = {
        'date': 'e.created_at',
        'amount': 'e.amount',
        'category': 'c.name',
        'status': 'e.status'
    };
    const orderClause = sortableCols[sortBy] || 'e.created_at';

    sql += ` ORDER BY ${orderClause} ${sortOrder} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await query(sql, values);

    res.json({
      page,
      limit,
      expenses: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

/**
 * UPDATE EXPENSE (only if PENDING)
 */
exports.updateExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;
    const { amount, category_id } = req.body;

    const result = await query(
      `
      UPDATE expenses
      SET
        amount = COALESCE($1, amount),
        category_id = COALESCE($2, category_id)
      WHERE id = $3
        AND user_id = $4
        AND status = 'PENDING'
      RETURNING *
      `,
      [amount, category_id, expenseId, userId]
    );

    if (result.rows.length === 0) {
      // Check why failure occurred (Stale Data Check)
      const check = await query(
        "SELECT status FROM expenses WHERE id = $1 AND user_id = $2", 
        [expenseId, userId]
      );
      
      if (check.rows.length > 0 && check.rows[0].status !== 'PENDING') {
          return res.status(409).json({ 
            error: `Expense is already ${check.rows[0].status}. Please reload.` 
          });
      }

      return res.status(404).json({
        error: "Expense not found or cannot be updated",
      });
    }

    res.json({
      message: "Expense updated",
      expense: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update expense" });
  }
};


/**
 * DELETE EXPENSE (only if PENDING)
 */
exports.deleteExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const expenseId = req.params.id;

    const result = await query(
      `DELETE FROM expenses
       WHERE id = $1
         AND user_id = $2
         AND status = 'PENDING'
       RETURNING *`,
      [expenseId, userId]
    );

    if (result.rows.length === 0) {
       // Check why failure occurred (Stale Data Check)
       const check = await query(
        "SELECT status FROM expenses WHERE id = $1 AND user_id = $2", 
        [expenseId, userId]
      );
      
      if (check.rows.length > 0 && check.rows[0].status !== 'PENDING') {
          return res.status(409).json({ 
            error: `Expense is already ${check.rows[0].status}. Please reload.` 
          });
      }

      return res.status(404).json({
        error: "Expense not found, not authorized, or already approved",
      });
    }

    const expense = result.rows[0];

    await logAudit(userId, "DELETE_EXPENSE", "expense", expense.id);

    res.json({
      message: "Expense deleted",
      expense,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
};
