const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema({

  name:String,
  organization:String,
  phone:String,
  subject:String,
  email:String,
  message:String,

  createdAt:{
    type:Date,
    default:Date.now
  }

});

module.exports = mongoose.model("Contact",ContactSchema);