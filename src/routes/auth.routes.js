const express= require("express")
const router=express.Router()
const {signup,login}= require('../controllers/auth.controller')

// Enterprise Mode: Signup is disabled for public access. 
// Use 'npm run create-user' on the server to provision users.
// router.post("/signup",signup) 

router.post("/login",login)
module.exports=router;