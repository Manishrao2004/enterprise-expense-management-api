const query = require("../db/query");

/**
 * TOTAL APPROVED EXPENSE
 */
exports.getTotalExpense = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = $1
         AND status = 'APPROVED'`,
      [userId]
    );

    res.json({
      totalExpense: result.rows[0].total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch total expense",
    });
  }
};

/**
 * CATEGORY-WISE BREAKDOWN
 */
exports.getCategoryBreakdown = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT
         c.name AS category,
         SUM(e.amount) AS total
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       WHERE e.user_id = $1
         AND e.status = 'APPROVED'
       GROUP BY c.name
       ORDER BY total DESC`,
      [userId]
    );

    res.json({
      categories: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch category breakdown",
    });
  }
};

/**
 * CURRENT MONTH APPROVED EXPENSE
 */
exports.getMonthlyExpense = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = $1
         AND status = 'APPROVED'
         AND date_trunc('month', created_at) =
             date_trunc('month', CURRENT_DATE)`,
      [userId]
    );

    res.json({
      monthlyExpense: result.rows[0].total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch monthly expense",
    });
  }
};

/**
 * MONTHLY TREND (LAST 6 MONTHS) – OPTIONAL BUT STRONG
 */
exports.getMonthlyTrend = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT
         date_trunc('month', created_at) AS month,
         SUM(amount) AS total
       FROM expenses
       WHERE user_id = $1
         AND status = 'APPROVED'
       GROUP BY month
       ORDER BY month DESC
       LIMIT 6`,
      [userId]
    );

    res.json({
      trend: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch monthly trend",
    });
  }
};

/**
 * STATUS SUMMARY (WORKFLOW INSIGHT)
 */
exports.getStatusSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT status, COUNT(*) AS count
       FROM expenses
       WHERE user_id = $1
       GROUP BY status`,
      [userId]
    );

    res.json({
      statusSummary: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch status summary",
    });
  }
};
