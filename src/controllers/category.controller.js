const query = require("../db/query");

exports.getCategories = async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name FROM expense_categories ORDER BY name"
    );

    res.json({
      categories: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};
