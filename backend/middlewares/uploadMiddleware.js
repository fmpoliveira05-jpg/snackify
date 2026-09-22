const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/** Só imagens: evita que alguém envie HTML ou SVG com JavaScript e o sirva a partir do domínio. */
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Decide a subpasta de destino a partir da rota e do tipo de utilizador.
 * Exportada para poder ser testada isoladamente.
 */
const chooseFolder = (url, userType) => {
  if (url.includes('pratos/novo') || url.includes('pratos/editar')) return 'dishes';
  if (url.includes('/encomendas') && url.includes('/avaliar')) return 'reviews';
  if (url.includes('registar-restaurante') || userType === 'restaurant') return 'logos';
  if (url.includes('registar-cliente') || userType === 'customer' || userType === 'admin') return 'profilePictures';
  return 'others';
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = path.join(UPLOAD_ROOT, chooseFolder(req.originalUrl || req.url, req.user?.userType));
    fs.mkdir(folder, { recursive: true }, (err) => cb(err, folder));
  },
  // O nome original nunca é usado: podia conter "../" ou carateres problemáticos.
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ALLOWED_TYPES[file.mimetype]}`);
  },
});

/**
 * Só aceita imagens (JPEG, PNG, GIF ou WebP).
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
  const error = new Error('Só são aceites imagens JPG, PNG, WEBP ou GIF.');
  error.name = 'UploadError';
  return cb(error);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE, files: 1 } });

module.exports = upload;
module.exports.chooseFolder = chooseFolder;
module.exports.fileFilter = fileFilter;
module.exports.ALLOWED_TYPES = ALLOWED_TYPES;
