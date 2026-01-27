const express = require("express");
const router = express.Router();
const { getCategories } = require("../controllers/category.controller");
const auth = require("../middleware/auth.middleware")

router.get("/categories", auth, getCategories);

module.exports = router;
