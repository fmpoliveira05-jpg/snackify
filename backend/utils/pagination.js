/**
 * Paginação das listas da API: ?pagina=1&limite=20 (também aceita page/limit).
 *
 * O corpo da resposta continua a ser a lista (compatível com os clientes existentes); o total
 * e a página vão nos cabeçalhos X-Total-Count, X-Page e X-Page-Size.
 */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const toInt = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return NaN;
  return Number.parseInt(value, 10);
};

/**
 * @param {object} query req.query
 * @param {{defaultLimit?: number, maxLimit?: number}} [options]
 * @returns {{page: number, limit: number, skip: number}}
 */
function parsePagination(query = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) {
  const rawPage = toInt(query.pagina ?? query.page);
  const rawLimit = toInt(query.limite ?? query.limit);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? Math.min(rawPage, 10000) : 1;
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, maxLimit) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

/** Escreve os cabeçalhos da paginação. */
function setPaginationHeaders(res, { total, page, limit }) {
  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Page-Size', String(limit));
}

/**
 * Pagina uma lista já em memória (ex.: resultado filtrado de dados em cache).
 *
 * @returns {Array} a página pedida
 */
function paginateArray(res, items, pagination) {
  setPaginationHeaders(res, { total: items.length, ...pagination });
  return items.slice(pagination.skip, pagination.skip + pagination.limit);
}

module.exports = { parsePagination, setPaginationHeaders, paginateArray, DEFAULT_LIMIT, MAX_LIMIT };
