const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/role.middleware");
const {
  approveExpense,
  rejectExpense,
} = require("../controllers/approval.controller");

router.patch(
  "/expenses/:id/approve",
  auth,
  authorizeRoles("MANAGER"),
  approveExpense
);

router.patch(
  "/expenses/:id/reject",
  auth,
  authorizeRoles("MANAGER"),
  rejectExpense
);

module.exports = router;
