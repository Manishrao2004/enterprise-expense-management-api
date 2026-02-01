const query = require("../db/query");
const logAudit = require("../services/audit.service");

/**
 * APPROVE EXPENSE
 * - Managers approve Employees
 */
exports.approveExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const approverId = req.user.id;
    const { expectedAmount } = req.body;

    // Strict Hierarchy: Manager executes on Employee expense
    let sql = `
      UPDATE expenses e
      SET status = 'APPROVED',
          approved_at = now()
      FROM users u
      WHERE e.id = $1
        AND e.user_id = u.id
        AND e.status = 'PENDING'
        AND e.user_id != $2
        AND u.role = 'EMPLOYEE'
    `;
    
    // Note: 'MANAGER' role check is enforced by middleware, so we just ensure target is EMPLOYEE
    
    const params = [expenseId, approverId];

    if (expectedAmount !== undefined) {
        sql += ` AND e.amount = $3`;
        params.push(expectedAmount);
    }

    sql += ` RETURNING e.*`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      // Diagnostic Check
      const check = await query(`
         SELECT e.*, u.role as owner_role 
         FROM expenses e 
         JOIN users u ON e.user_id = u.id 
         WHERE e.id = $1`, 
         [expenseId]
      );
      
      if (check.rows.length === 0) return res.status(404).json({ error: "Expense not found" });

      const exp = check.rows[0];
      if (exp.status !== 'PENDING') return res.status(409).json({ error: `Expense is already ${exp.status}` });
      if (Number(exp.amount) !== Number(expectedAmount)) return res.status(409).json({ error: "Expense modified. Refresh required." });
      if (exp.user_id === approverId) return res.status(403).json({ error: "Cannot process your own expense" });

      if (exp.owner_role !== 'EMPLOYEE') {
          return res.status(403).json({ error: "Managers only approve Employee expenses" });
      }

      return res.status(403).json({ error: "Authorization failed" });
    }

    const expense = result.rows[0];
    await logAudit(approverId, "APPROVE_EXPENSE", "expense", expense.id);

    res.json({ message: "Expense approved", expense });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to approve expense" });
  }
};

/**
 * REJECT EXPENSE
 * - Managers reject Employees
 */
exports.rejectExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const approverId = req.user.id;
    const { expectedAmount } = req.body;

    let sql = `
      UPDATE expenses e
      SET status = 'REJECTED'
      FROM users u
      WHERE e.id = $1
        AND e.user_id = u.id
        AND e.status = 'PENDING'
        AND e.user_id != $2
        AND u.role = 'EMPLOYEE'
    `;
    
    const params = [expenseId, approverId];

    if (expectedAmount !== undefined) {
        sql += ` AND e.amount = $3`;
        params.push(expectedAmount);
    }

    sql += ` RETURNING e.*`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      // Diagnostic
      const check = await query(`
         SELECT e.*, u.role as owner_role 
         FROM expenses e 
         JOIN users u ON e.user_id = u.id 
         WHERE e.id = $1`, 
         [expenseId]
      );
      
      if (check.rows.length === 0) return res.status(404).json({ error: "Expense not found" });

      const exp = check.rows[0];
      if (exp.status !== 'PENDING') return res.status(409).json({ error: `Expense is already ${exp.status}` });
      if (Number(exp.amount) !== Number(expectedAmount)) return res.status(409).json({ error: "Expense modified. Refresh required." });
      
      if (exp.owner_role !== 'EMPLOYEE') {
          return res.status(403).json({ error: "Managers only reject Employee expenses" });
      }

      return res.status(403).json({ error: "Authorization failed" });
    }

    const expense = result.rows[0];
    await logAudit(approverId, "REJECT_EXPENSE", "expense", expense.id);

    res.json({ message: "Expense rejected", expense });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to reject expense" });
  }
};
