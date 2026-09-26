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

/** Extensões aceites no nome original do ficheiro. */
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const UPLOAD_ERROR_MESSAGE = 'Só são aceites imagens JPG, PNG, WEBP ou GIF.';

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
  // A extensão final é decidida depois, a partir do conteúdo real (ver verifyImageContent).
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.upload`);
  },
});

const uploadError = () => {
  const error = new Error(UPLOAD_ERROR_MESSAGE);
  error.name = 'UploadError';
  return error;
};

/**
 * Primeiro filtro (antes de gravar): tipo MIME declarado e extensão do nome original.
 * Ambos vêm do browser e podem ser falsificados, por isso o conteúdo é verificado a seguir.
 */
const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_TYPES[file.mimetype] && ALLOWED_EXTENSIONS.has(extension)) return cb(null, true);
  return cb(uploadError());
};

/**
 * Identifica o tipo real da imagem pelos primeiros bytes ("magic bytes").
 *
 * @param {Buffer} header pelo menos 12 bytes do início do ficheiro
 * @returns {string|null} tipo MIME detetado ou null
 */
const detectImageType = (header) => {
  if (!header || header.length < 12) return null;
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg';
  if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  const gif = header.toString('ascii', 0, 6);
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif';
  return null;
};

const readHeader = async (filePath) => {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

/** Apaga o ficheiro enviado neste pedido (usado quando o pedido é recusado). */
const discardUpload = async (req) => {
  if (!req.file?.path) return;
  await fs.promises.unlink(req.file.path).catch(() => {});
  req.file = undefined;
};

/**
 * Segundo filtro (depois de gravar): confirma pelo conteúdo que o ficheiro é mesmo uma imagem
 * permitida e dá-lhe a extensão do tipo detetado. Caso contrário, apaga-o e responde 400.
 */
const verifyImageContent = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const detected = detectImageType(await readHeader(req.file.path));
    if (!detected) {
      await discardUpload(req);
      return res.status(400).json({ message: UPLOAD_ERROR_MESSAGE });
    }
    const finalName = req.file.filename.replace(/\.upload$/, ALLOWED_TYPES[detected]);
    const finalPath = path.join(path.dirname(req.file.path), finalName);
    await fs.promises.rename(req.file.path, finalPath);
    Object.assign(req.file, { filename: finalName, path: finalPath, mimetype: detected });
    return next();
  } catch (err) {
    await discardUpload(req);
    return next(err);
  }
};

const multerUpload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 50 } });

/**
 * Mesmo uso que o multer (upload.single('campo')), mas devolve também a verificação do conteúdo.
 */
const upload = {
  single: (field) => [multerUpload.single(field), verifyImageContent],
};

module.exports = upload;
module.exports.chooseFolder = chooseFolder;
module.exports.fileFilter = fileFilter;
module.exports.detectImageType = detectImageType;
module.exports.verifyImageContent = verifyImageContent;
module.exports.discardUpload = discardUpload;
module.exports.ALLOWED_TYPES = ALLOWED_TYPES;
module.exports.UPLOAD_ROOT = UPLOAD_ROOT;
