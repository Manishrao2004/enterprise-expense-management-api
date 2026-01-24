const jwt= require("jsonwebtoken")
const bcrypt = require('bcrypt')
const pool = require('../config/db')

exports.signup= async (req,res)=>{
    try{
    const {email, password}= req.body
    const hashedPassword = await bcrypt.hash(password,10)
    const result = await pool.query(
        "insert into users(email,password) values ($1,$2) returning id, email",[email,hashedPassword]
    )
    res.status(201).json({
        message:"user created",
        user: result.rows[0]
    })
}
catch(error){
    if (error.code === "23505"){
        return res.status(409).json({
            error:"Email already exists",
        })
    }
    console.error(error);
    res.status(500).json({error: "signup failed"});
}
} 

exports.login= async (req,res)=>{
    try{
        const {email,password}= req.body;
        const result= await pool.query("select * from users where email= $1",[email])

        if(result.rows.length==0){
          return  res.status(401).json({
                error:"Invalid email or Password",
            })
        }

        const user= result.rows[0]
        const isMatch = await bcrypt.compare(password,user.password);

        if(!isMatch){
            return res.status(401).json({
                error:"Invalid email or password",
            })
        }

        const token= jwt.sign(
            {userId: user.id, email:user.email},
            process.env.JWT_SECRET,
            {expiresIn:"1h"}
        )
        res.json({
            message:"Login successful",
            token,
        })
    }
    
    catch(error){
        console.log.error(error)
        res.status(500).json({
            error:"Login failed"
        })
    }
}