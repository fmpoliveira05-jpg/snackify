/**
 * Configuração de produção: o cliente compilado é servido pelo próprio Express,
 * por isso os pedidos à API usam caminhos relativos ao mesmo domínio.
 */
export const environment = {
  production: true,
  apiUrl: '',
};
