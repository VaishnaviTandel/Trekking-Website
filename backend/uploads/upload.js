const multer = require("multer");
const fs = require("fs");
const path = require("path");

const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    let folder = "uploads/";

    if (file.fieldname === "qr") {
      folder = "uploads/qr/";
    } 
    else if (file.fieldname === "screenshot") {
      folder = "uploads/screenshots/";
    } 
    else {
      folder = "uploads/gallery/";
    }

    // create folder if not exists
    fs.mkdirSync(folder, { recursive: true });

    cb(null, folder);
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }

});

const upload = multer({ storage });

module.exports = upload;