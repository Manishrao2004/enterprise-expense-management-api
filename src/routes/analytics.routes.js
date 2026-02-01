const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/analytics.controller");
const auth = require("../middleware/auth.middleware");

router.get("/total", auth, ctrl.getTotalExpense);
router.get("/current-month", auth, ctrl.getCurrentMonthExpense);
router.get("/category", auth, ctrl.getCategoryBreakdown);
router.get("/monthly", auth, ctrl.getMonthlyTrend);
router.get("/stats", auth, ctrl.getApprovalStats);

module.exports = router;
