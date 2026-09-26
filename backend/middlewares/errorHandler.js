const multer = require('multer');
const { config } = require('../config/env');

/** Mensagens do multer traduzidas e sem pormenores internos. */
const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'A imagem não pode ter mais de 2 MB.',
  LIMIT_FILE_COUNT: 'Só é possível enviar uma imagem.',
  LIMIT_UNEXPECTED_FILE: 'Campo de ficheiro inesperado.',
};

/**
 * Última linha de defesa: transforma erros não tratados numa resposta coerente.
 *
 * Nenhuma resposta inclui a mensagem interna do erro (podia revelar nomes de campos, caminhos
 * ou consultas). Fora de produção, o pormenor aparece só no registo do servidor.
 * O registo usa o caminho sem query string, para não guardar tokens que venham no URL.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: MULTER_MESSAGES[err.code] || 'Não foi possível processar o ficheiro enviado.' });
  }
  if (err.name === 'UploadError') {
    // Mensagem escrita por nós (lista dos formatos aceites), segura para mostrar.
    return res.status(400).json({ message: err.message });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: 'Dados inválidos.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'O pedido é demasiado grande.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Pedido mal formado.' });
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (config.isProduction) {
    console.error(`[erro] ${req.method} ${req.path}: ${err.name}`);
  } else {
    console.error(`[erro] ${req.method} ${req.path}:`, err);
  }
  return res.status(status).json({ message: status >= 500 ? 'Erro interno do servidor.' : 'Pedido inválido.' });
};

module.exports = errorHandler;
