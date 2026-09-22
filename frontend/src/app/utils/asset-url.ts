import { environment } from '../../environments/environment';

/**
 * Converte o caminho de uma imagem guardada pelo backend ("/uploads/...") num endereço que
 * funciona tanto em desenvolvimento (API noutra porta) como em produção (mesmo domínio).
 *
 * @param path caminho devolvido pela API
 * @returns endereço completo, ou null se não houver imagem
 */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${environment.apiUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
