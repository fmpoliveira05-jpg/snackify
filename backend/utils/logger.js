/**
 * Registo de erros sem dados pessoais.
 *
 * As mensagens dos erros podem conter valores enviados pelos utilizadores (ex.: um erro de
 * validação do Mongoose inclui o valor do campo; um erro SMTP inclui o endereço de email).
 * Por isso só se regista o contexto, o nome e o código do erro — nunca a mensagem.
 */
const describe = (err) => [err?.name || 'Error', err?.code !== undefined ? `(${err.code})` : ''].filter(Boolean).join(' ');

/**
 * @param {string} context o que se estava a fazer (ex.: "Erro ao criar prato")
 * @param {unknown} err
 */
const logError = (context, err) => {
  console.error(`${context}: ${describe(err)}`);
};

module.exports = { logError, describe };
