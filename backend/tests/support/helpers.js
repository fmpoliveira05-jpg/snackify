/**
 * Utilitários comuns aos testes da API (sessão por cookie, origem e mocks de consultas).
 */
const { config } = require('../../config/env');
const { signSessionToken } = require('../../services/session');

/** Origem aceite pela proteção CSRF (o cliente Angular). */
const ORIGIN = config.clientUrl;

/** Cookie da sessão para uma conta (tv = versão do token). */
const sessionCookie = (userId, userType, tokenVersion = 0) =>
  `${config.sessionCookieName}=${signSessionToken({ _id: userId, tokenVersion }, userType)}`;

/**
 * Autentica um pedido do supertest como a conta indicada, com a origem do cliente Angular.
 *
 * @example asUser(request(app).get('/auth/me'), 'c1', 'customer')
 */
const asUser = (req, userId, userType, tokenVersion = 0) =>
  req.set('Cookie', sessionCookie(userId, userType, tokenVersion)).set('Origin', ORIGIN);

/** Pedido com a origem do cliente Angular (sem sessão). */
const fromClient = (req) => req.set('Origin', ORIGIN);

/**
 * Simula uma consulta do Mongoose: aceita .select/.populate/.lean/.sort encadeados e pode
 * ser usada com await.
 */
const fakeQuery = (value) => {
  const query = {
    select: () => query,
    populate: () => query,
    lean: () => query,
    sort: () => query,
    limit: () => query,
    then: (resolve, reject) => Promise.resolve(typeof value === 'function' ? value() : value).then(resolve, reject),
    catch: (reject) => Promise.resolve(value).catch(reject),
  };
  return query;
};

/** Faz Model.metodo(...) devolver uma consulta falsa com o valor indicado. */
const mockQuery = (Model, method, value) => jest.spyOn(Model, method).mockImplementation(() => fakeQuery(value));

module.exports = { ORIGIN, sessionCookie, asUser, fromClient, fakeQuery, mockQuery };
