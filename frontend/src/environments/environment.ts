/**
 * Configuração usada em desenvolvimento (`ng serve`): a API corre no Express, na porta 5000.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000',
  // Chave pública (site key) do Cloudflare Turnstile. Vazia = desafio desligado
  // (o backend também o ignora quando TURNSTILE_SECRET_KEY está vazia).
  turnstileSiteKey: '',
};
