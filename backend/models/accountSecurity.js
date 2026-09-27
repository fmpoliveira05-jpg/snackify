/**
 * Campos de segurança comuns às contas que iniciam sessão (clientes/administradores e restaurantes).
 *
 * Os hashes dos tokens, o contador de tentativas e a versão da sessão têm select: false,
 * por isso nunca saem numa consulta normal; quem precisa deles pede-os com "+campo".
 */
const SECURITY_FIELDS = {
  emailVerified: { type: Boolean, default: false },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  failedLoginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },
  // Incrementada ao redefinir a password ou ao terminar todas as sessões: invalida os JWT antigos.
  tokenVersion: { type: Number, default: 0, select: false },
};

/** Campos que nunca podem aparecer numa resposta JSON, mesmo que tenham sido selecionados. */
const HIDDEN_FIELDS = [
  'password',
  'emailVerificationTokenHash',
  'emailVerificationExpires',
  'passwordResetTokenHash',
  'passwordResetExpires',
  'failedLoginAttempts',
  'lockUntil',
  'tokenVersion',
  'activeOrderIds',
  '__v',
];

/** Remove os campos sensíveis de um objeto (documento convertido ou resultado de .lean()). */
const stripSensitive = (obj) => {
  if (!obj) return obj;
  HIDDEN_FIELDS.forEach((field) => delete obj[field]);
  return obj;
};

/**
 * Plugin do Mongoose: acrescenta os campos de segurança e esconde-os no toJSON/toObject.
 *
 * @param {import('mongoose').Schema} schema
 */
function accountSecurityPlugin(schema) {
  schema.add(SECURITY_FIELDS);
  const transform = (doc, ret) => stripSensitive(ret);
  schema.set('toJSON', { transform });
  schema.set('toObject', { transform });
}

module.exports = { accountSecurityPlugin, stripSensitive, SECURITY_FIELDS, HIDDEN_FIELDS };
