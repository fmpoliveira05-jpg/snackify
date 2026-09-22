const multer = require('multer');

/**
 * Última linha de defesa: transforma erros não tratados numa resposta coerente.
 * Os detalhes internos só são mostrados fora de produção.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.name === 'UploadError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: 'Dados inválidos.', detail: err.message });
  }

  console.error(`[erro] ${req.method} ${req.originalUrl}:`, err);
  const body = { message: 'Erro interno do servidor.' };
  if (process.env.NODE_ENV !== 'production') {
    body.detail = err.message;
  }
  return res.status(err.status || 500).json(body);
};

module.exports = errorHandler;
