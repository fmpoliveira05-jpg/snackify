import { HttpResponse } from '@angular/common/http';

/** Uma página de uma lista da API (o total vem no cabeçalho X-Total-Count). */
export interface Page<T> {
  items: T[];
  total: number;
}

/** Tamanho das páginas pedidas pelo cliente (o servidor aceita no máximo 100). */
export const PAGE_SIZE = 24;

export function toPage<T>(response: HttpResponse<T[]>): Page<T> {
  const items = response.body ?? [];
  const total = Number(response.headers.get('X-Total-Count'));
  return { items, total: Number.isFinite(total) && total > 0 ? total : items.length };
}
