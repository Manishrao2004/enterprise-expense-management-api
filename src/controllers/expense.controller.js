const pool = require("../config/db")

exports.addExpense= async(req,res)=>{
    try{
        const{amount, category}=req.body;
        const userId= req.user.userId;
        const result = await pool.query(
            "insert into expenses(user_id,amount,category) values ($1,$2,$3) returning *",[userId,amount,category])
        res.status(201).json({
            message:"Expense added",
            expense: result.rows[0],
        })
    }
    catch(error){
        console.error(error);
    res.status(500).json({ error: "Failed to add expense" });
    }
}


exports.getExpenses= async (req,res)=>{
    try{
        const userId = req.user.userId

        const page = parseInt(req.query.page)||1;
        const limit = parseInt(req.query.limit)|| 10;
        const offset = (page -1)*limit;

        let query=`
        select * from expenses where user_id=$1
        `;
        let values =[userId];


        const category = req.query.category;

        if(category){
            query += ` and category = $${values.length+1}`;
            values.push(category);
        }


        const {from,to}= req.query;
        if(from){
            query+= ` and created_at >= $${values.length+1}`;
            values.push(from)
        }

        if(to){
            query+=` and created_at <= $${values.length+1}`;
            values.push(to)
        }

        query += ` order by created_at desc limit $${values.length+1} offset $${values.length+2}`;

        

        values.push(limit,offset)
        const result = await pool.query(query,values)

        res.json({
            page,
            limit,
            expenses: result.rows,
        })
    }
    catch (error){
        console.error(error);
        res.status(500).json({
            error:"Failed to fetch expenses"
        })
    }
    }


exports.deleteExpense = async(req,res)=>{
    try {
        const userId=req.user.userId
        const expenseId = req.params.id

        const result = await pool.query(`delete from expenses where id=$1 and user_id=$2 returning *`,[expenseId,userId])
        
        if (result.rows.length===0){
            return res.status(404).json({
                error: "Expense not found or not authorized",
            })
        }

        res.json({
            message:"Expense deleted",
            expense: result.rows[0],
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Failed to delete expense"})
    }
}

exports.updateExpense= async (req,res)=>{
try {
    const userId= req.user.userId
    const expenseId= req.params.id
    const {amount, category}=req.body;

    const result = await pool.query(
        `update expenses set amount=$1, category=$2 where id=$3 and user_id=$4 returning *
        `,[amount,category,expenseId,userId]
    )

    if (result.rows.length===0){
        return res.status(404).json({
            error:"Expense not found or not authorized",
        })
    }

    res.json({
        message:"Expense updated",
        expense: result.rows[0],
    })

} catch (error) {
    console.error(error);
    res.status(500).json({error: "Failed to update expense"})
}
}