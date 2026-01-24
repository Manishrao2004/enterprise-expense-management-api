const pool= require("../config/db")
exports.getTotalExpense = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1",
      [userId]
    );

    res.json({
      totalExpense: result.rows[0].total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch total expense" });
  }
};

exports.getCategoryBreakdown= async (req,res)=>{
  try {
    const userId = req.user.userId
    const result = await pool.query("select category, sum(amount) as total from expenses where user_id = $1 group by category",[userId])
    res.json({
      categories: result.rows,
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({error:"failed to fetch category analytics"})
  }
}

exports.getMonthlyExpense = async (req,res)=>{
  try {
    const userId= req.user.userId;
    const result = pool.query("select coalesce(sum(amount),0) as total from expenses where user_id=$1 and date_trunc('month',created_at) = date_trunc('month',current_date)",[userId])
    res.json({
      monthlyExpense: (await result).rows[0].total,
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({error: "failed to fetch monthly expense"})
  }
}