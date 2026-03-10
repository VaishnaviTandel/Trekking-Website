const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");


// SAVE CONTACT MESSAGE
router.post("/", async (req,res)=>{

  try{

    const contact = new Contact(req.body);

    await contact.save();

    res.json({message:"Message saved"});

  }catch(err){

    res.status(500).json({error:err.message});

  }

});


// GET ALL CONTACT MESSAGES (FOR ADMIN)

router.get("/", async(req,res)=>{

  try{

    const messages = await Contact.find().sort({createdAt:-1});

    res.json(messages);

  }catch(err){

    res.status(500).json({error:err.message});

  }

});
// DELETE MESSAGE

router.delete("/:id", async(req,res)=>{

  try{

    await Contact.findByIdAndDelete(req.params.id);

    res.json({message:"Message deleted"});

  }catch(err){

    res.status(500).json({error:err.message});

  }

});

module.exports = router;