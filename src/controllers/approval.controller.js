const query = require("../db/query");
const logAudit = require("../services/audit.service");

/**
 * APPROVE EXPENSE (MANAGER only)
 */
exports.approveExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const approverId = req.user.id;

    const result = await query(
      `UPDATE expenses
       SET status = 'APPROVED',
           approved_at = now()
       WHERE id = $1
         AND status = 'PENDING'
         AND user_id != $2
       RETURNING *`,
      [expenseId, approverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Expense not found, already processed, or self-approval not allowed",
      });
    }

    const expense = result.rows[0];

    await logAudit(approverId, "APPROVE_EXPENSE", "expense", expense.id);

    res.json({
      message: "Expense approved",
      expense,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to approve expense",
    });
  }
};

/**
 * REJECT EXPENSE (MANAGER only)
 */
exports.rejectExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const approverId = req.user.id;

    const result = await query(
      `UPDATE expenses
       SET status = 'REJECTED'
       WHERE id = $1
         AND status = 'PENDING'
         AND user_id != $2
       RETURNING *`,
      [expenseId, approverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Expense not found, already processed, or self-rejection not allowed",
      });
    }

    const expense = result.rows[0];

    await logAudit(approverId, "REJECT_EXPENSE", "expense", expense.id);

    res.json({
      message: "Expense rejected",
      expense,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to reject expense",
    });
  }
};
