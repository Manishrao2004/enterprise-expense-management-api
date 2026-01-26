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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT e.*, c.name AS category
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      WHERE e.user_id = $1
    `;
    const values = [userId];

    // filter by category
    if (req.query.category_id) {
      sql += ` AND e.category_id = $${values.length + 1}`;
      values.push(req.query.category_id);
    }

    // filter by status
    if (req.query.status) {
      sql += ` AND e.status = $${values.length + 1}`;
      values.push(req.query.status);
    }

    // date filters
    if (req.query.from) {
      sql += ` AND e.created_at >= $${values.length + 1}`;
      values.push(req.query.from);
    }

    if (req.query.to) {
      sql += ` AND e.created_at <= $${values.length + 1}`;
      values.push(req.query.to);
    }

    // pagination
    sql += ` ORDER BY e.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
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
      `UPDATE expenses
       SET amount = $1, category_id = $2
       WHERE id = $3
         AND user_id = $4
         AND status = 'PENDING'
       RETURNING *`,
      [amount, category_id, expenseId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Expense not found, not authorized, or already approved",
      });
    }

    const expense = result.rows[0];

    await logAudit(userId, "UPDATE_EXPENSE", "expense", expense.id);

    res.json({
      message: "Expense updated",
      expense,
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
