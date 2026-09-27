/**
 * Remoção de ficheiros enviados (fotografias de perfil, logótipos, pratos e avaliações).
 */
const fs = require('fs');
const path = require('path');
const { UPLOAD_ROOT } = require('../middlewares/uploadMiddleware');

const FOLDERS = new Set(['dishes', 'logos', 'profilePictures', 'reviews', 'others']);

/**
 * Converte o caminho público (/uploads/<pasta>/<ficheiro>) no caminho em disco, ou null se não
 * for um ficheiro enviado válido (nunca sai da pasta dos uploads).
 */
const uploadPath = (publicPath) => {
  if (typeof publicPath !== 'string') return null;
  const match = /^\/uploads\/([A-Za-z]+)\/([A-Za-z0-9._-]+)$/.exec(publicPath);
  if (!match || !FOLDERS.has(match[1]) || match[2].startsWith('.')) return null;
  return path.join(UPLOAD_ROOT, match[1], match[2]);
};

/**
 * Apaga os ficheiros indicados (os que não existem são ignorados).
 *
 * @param {Array<string|null|undefined>} publicPaths
 * @returns {Promise<number>} quantos foram apagados
 */
async function removeUploads(publicPaths) {
  let removed = 0;
  await Promise.all(publicPaths.map(async (publicPath) => {
    const file = uploadPath(publicPath);
    if (!file) return;
    try {
      await fs.promises.unlink(file);
      removed += 1;
    } catch {
      // já não existia
    }
  }));
  return removed;
}

module.exports = { removeUploads, uploadPath };
