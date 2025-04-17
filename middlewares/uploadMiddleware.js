const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'uploads/';

    if (req.user?.userType === 'restaurant') {
      folder = 'uploads/logos';
    } else if (req.user?.userType === 'customer' || req.user?.userType === 'admin') {
      folder = 'uploads/profilePictures';
    } else if (req.url.includes('register/customer')) {
      folder = 'uploads/profilePictures';
    } else if (req.url.includes('register/restaurant')) {
      folder = 'uploads/logos';
    } else if (req.url.includes('novo') || req.url.includes('editar')) {
      folder = 'uploads/images';
    } else {
      folder = 'uploads/others';
    }

    const fullPath = path.join(__dirname, '..', folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, fullPath);
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });
module.exports = upload;