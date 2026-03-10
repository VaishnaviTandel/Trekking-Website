const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

router.post("/", async (req,res)=>{

  const { email, message } = req.body;

  try{

    const transporter = nodemailer.createTransport({

      service:"gmail",

      auth:{
        user:"yourgmail@gmail.com",
        pass:"your_app_password"
      }

    });

    await transporter.sendMail({

      from:"yourgmail@gmail.com",
      to:email,
      subject:"Reply from Trek Admin",
      text:message

    });

    res.json({message:"Email sent successfully"});

  }catch(err){

    console.log(err);

    res.status(500).json({error:"Email failed"});

  }

});

module.exports = router;