/**
 * Envolve um controlador assíncrono para que qualquer erro chegue ao middleware de erros.
 *
 * No Express 4 uma promessa rejeitada dentro de um controlador não é apanhada: o pedido
 * fica pendurado e, a partir do Node 15, o processo termina. Com isto, um erro inesperado
 * passa a dar uma resposta 500 em vez de derrubar o servidor.
 *
 * @param {Function} handler controlador (req, res, next) => Promise
 * @returns {Function} middleware seguro
 */
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

/**
 * Aplica o asyncHandler a todas as funções de um objeto de controladores.
 *
 * @param {Object<string, Function>} controllers
 * @returns {Object<string, Function>}
 */
const wrapAll = (controllers) =>
  Object.fromEntries(Object.entries(controllers).map(([name, fn]) => [name, asyncHandler(fn)]));

module.exports = { asyncHandler, wrapAll };
