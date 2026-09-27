/**
 * Chave de idempotência para operações que não podem acontecer duas vezes (criar uma encomenda,
 * comprar um vale). É enviada no cabeçalho Idempotency-Key: se o pedido for repetido (duplo
 * clique, falha de rede), o servidor devolve o resultado do primeiro em vez de o repetir.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
