const query = require("../db/query");

/**
 * TOTAL APPROVED EXPENSE
 */
exports.getTotalExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let sql = `SELECT COALESCE(SUM(amount), 0) AS "totalExpense" FROM expenses WHERE status = 'APPROVED'`;
    const params = [];

    if (role === 'EMPLOYEE') {
        sql += ` AND user_id = $1`;
        params.push(userId);
    } else {
        // Manager sees total approved for the company (or everyone else)
        // If you want "Team Spend", usually it excludes the manager's own expense or includes it
        // Following the existing pattern: Manager manages *others*.
        sql += ` AND user_id != $1`;
        params.push(userId);
    }

    const result = await query(sql, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch total expense" });
  }
};

/**
 * CURRENT MONTH EXPENSE (KPI)
 */
exports.getCurrentMonthExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let sql = `
      SELECT COALESCE(SUM(amount), 0) AS "monthlyExpense"
      FROM expenses
      WHERE status = 'APPROVED'
        AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
    `;
    const params = [];

    if (role === 'EMPLOYEE') {
        sql += ` AND user_id = $1`;
        params.push(userId);
    } else {
        sql += ` AND user_id != $1`;
        params.push(userId);
    }

    const result = await query(sql, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch monthly expense" });
  }
};

/**
 * CATEGORY BREAKDOWN (PIE CHART)
 */
exports.getCategoryBreakdown = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let sql = `
      SELECT
        c.name AS category,
        SUM(e.amount)::float AS "totalExpense"
      FROM expenses e
      INNER JOIN expense_categories c
        ON c.id = e.category_id
      WHERE e.status = 'APPROVED'
    `;
    const params = [];

    if (role === 'EMPLOYEE') {
        sql += ` AND e.user_id = $1`;
        params.push(userId);
    } else {
        sql += ` AND e.user_id != $1`;
        params.push(userId);
    }

    sql += ` GROUP BY c.name ORDER BY "totalExpense" DESC`;

    const result = await query(sql, params);
    res.json({ categories: result.rows });
  } catch (err) {
    console.error("CATEGORY ANALYTICS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};


/**
 * MONTHLY TREND (LINE CHART)
 */
exports.getMonthlyTrend = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let sql = `
       SELECT
         TO_CHAR(date_trunc('month', created_at), 'Mon YYYY') AS month,
         SUM(amount) AS "totalExpense"
       FROM expenses
       WHERE status = 'APPROVED'
    `;
    const params = [];

    if (role === 'EMPLOYEE') {
        sql += ` AND user_id = $1`;
        params.push(userId);
    } else {
        sql += ` AND user_id != $1`;
        params.push(userId);
    }

    sql += ` GROUP BY month ORDER BY MIN(created_at) ASC`;

    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch monthly trend" });
  }
};

/**
 * APPROVAL STATS (MANAGER ONLY)
 */
exports.getApprovalStats = async (req, res) => {
    try {
        const userId = req.user.id;
        // Check only expenses from others
        const result = await query(
            `SELECT 
                COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
                COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
                COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
                COUNT(*) as total
             FROM expenses
             WHERE user_id != $1`,
            [userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch approval stats" });
    }
};
