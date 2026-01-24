const express = require("express")
const router = express.Router()

const auth = require("../middleware/auth.middleware")

const {addExpense,getExpenses,deleteExpense,updateExpense} = require("../controllers/expense.controller")

router.post("/expenses",auth,addExpense)
router.get("/expenses",auth,getExpenses)
router.delete("/expenses/:id",auth,deleteExpense)
router.put("/expenses/:id",auth,updateExpense)

module.exports=router;