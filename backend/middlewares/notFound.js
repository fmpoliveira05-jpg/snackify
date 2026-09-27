/**
 * Respostas 404: JSON para a API e página EJS para o browser.
 *
 * Os GET desconhecidos fora da API já foram entregues ao cliente Angular (index.html), que
 * mostra a sua própria página 404; aqui chegam os pedidos da API, os do back-office EJS e,
 * quando o Angular não está compilado, os restantes.
 */
const { config } = require('../config/env');

/** Prefixos que respondem sempre em JSON (API REST usada pelo Angular e verificações de saúde). */
const JSON_PREFIXES = ['/auth', '/user', '/admin', '/cliente/api', '/api', '/health', '/uploads'];

const hasPrefix = (path, prefixes) => prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

/** Pedido feito pelo browser a uma página (e não pela API). */
const wantsPage = (req) => !hasPrefix(req.path, JSON_PREFIXES)
  && !req.xhr
  && req.accepts(['json', 'html']) === 'html';

const notFound = (req, res) => {
  if (req.method === 'GET' && wantsPage(req)) {
    return res.status(404).render('errors/404', { clientUrl: config.clientUrl });
  }
  return res.status(404).json({ message: 'Recurso não encontrado.' });
};

/** Em produção, qualquer pedido de um source map (*.map) responde 404, sem ir ao disco. */
const blockSourceMaps = (req, res, next) => {
  if (config.isProduction && /\.map$/i.test(req.path)) {
    return res.status(404).json({ message: 'Recurso não encontrado.' });
  }
  return next();
};

module.exports = { notFound, blockSourceMaps, wantsPage, JSON_PREFIXES };
