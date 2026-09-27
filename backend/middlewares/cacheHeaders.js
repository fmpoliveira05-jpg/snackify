/**
 * Cabeçalhos de cache HTTP.
 *
 *  - Respostas da API e páginas do back-office: `no-store` (têm dados pessoais ou da sessão e
 *    nunca devem ficar guardadas no browser, em proxies ou na cache de "voltar atrás").
 *  - Ficheiros do Angular com hash no nome (main-ABC123.js): um ano, `immutable`; um deploy
 *    novo muda o nome, por isso nunca há versões antigas em cache.
 *  - index.html e ficheiros sem hash: `no-cache` (o browser revalida sempre com o ETag e
 *    recebe 304 quando nada mudou).
 *  - Imagens enviadas: o nome é aleatório e o conteúdo nunca muda, por isso podem ficar um dia.
 */
const path = require('path');

const ONE_YEAR = 365 * 24 * 60 * 60;
const ONE_DAY = 24 * 60 * 60;

/** Nome de ficheiro com o hash do build do Angular (ex.: main-XJUOERZ6.js, chunk-AXX4DZJJ.js). */
const HASHED_ASSET = /-[A-Z0-9]{8}\.(?:js|css|woff2?|ttf|svg|png|jpe?g|webp|gif)$/;

const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

/**
 * @param {'angular' | 'public' | 'uploads'} kind conjunto de ficheiros estáticos
 * @returns {(res: import('express').Response, filePath: string) => void} para o setHeaders do express.static
 */
const staticCacheHeaders = (kind) => (res, filePath) => {
  const name = path.basename(filePath);
  if (kind === 'uploads') {
    res.setHeader('Cache-Control', `public, max-age=${ONE_DAY}`);
  } else if (kind === 'angular' && HASHED_ASSET.test(name)) {
    res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR}, immutable`);
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }
};

module.exports = { noStore, staticCacheHeaders, HASHED_ASSET, ONE_YEAR };
