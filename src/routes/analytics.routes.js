const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth.middleware")

const {getTotalExpense, getCategoryBreakdown, getMonthlyExpense}= require("../controllers/analytics.controller")

router.get("/analytics/total",auth,getTotalExpense)
router.get("/analytics/category",auth,getCategoryBreakdown)
router.get("/analytics/monthly",auth, getMonthlyExpense)

module.exports=router