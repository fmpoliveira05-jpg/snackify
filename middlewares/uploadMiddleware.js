const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (req.url.includes('register/customer')) {
      cb(null, 'uploads/profilePictures');
    } else if (req.url.includes('register/restaurant')) {
      cb(null, 'uploads/logos');
    } else if (req.url.includes('novo')) {
      cb(null, 'uploads/images');
    } else if (req.url.includes('editar')) {
      cb(null, 'uploads/images');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });
module.exports = upload;