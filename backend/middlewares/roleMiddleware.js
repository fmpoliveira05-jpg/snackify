/**
 * Cria um middleware que só deixa passar os tipos de utilizador indicados.
 * Sem sessão responde 401; com sessão mas sem permissão responde 403.
 *
 * @param {string[]} allowedTypes
 * @param {string} message mensagem para o 403
 */
const allow = (allowedTypes, message) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'É necessário iniciar sessão.' });
  }
  if (allowedTypes.includes(req.user.userType)) {
    return next();
  }
  return res.status(403).json({ message });
};

const isCustomer = allow(['customer', 'admin'], 'Acesso restrito a clientes.');
const isRestaurant = allow(['restaurant', 'admin'], 'Acesso restrito a restaurantes.');
const isAdmin = allow(['admin'], 'Acesso restrito a administradores.');

module.exports = { isCustomer, isRestaurant, isAdmin, allow };
