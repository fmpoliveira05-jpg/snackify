import { HttpErrorResponse } from '@angular/common/http';

/** Mensagem mostrada quando o servidor não responde dentro do tempo máximo. */
export const TIMEOUT_MESSAGE = 'O servidor demorou demasiado a responder. Verifique a ligação e tente novamente.';
export const OFFLINE_MESSAGE = 'Sem ligação ao servidor. Verifique a ligação à Internet e tente novamente.';

/**
 * Converte um erro HTTP numa mensagem para mostrar ao utilizador (PT-PT), sem pormenores técnicos.
 *
 * @param err erro recebido no subscribe
 * @param fallback mensagem a usar quando o servidor não enviou uma
 */
export function errorMessage(err: unknown, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  if (!(err instanceof HttpErrorResponse)) {
    return (err as { name?: string })?.name === 'TimeoutError' ? TIMEOUT_MESSAGE : fallback;
  }
  if (err.error?.code === 'TIMEOUT') return TIMEOUT_MESSAGE;
  if (err.status === 0) return OFFLINE_MESSAGE;
  if (err.status === 429) return err.error?.message || 'Demasiados pedidos. Aguarde um pouco e tente novamente.';
  if (err.status >= 500) return 'O servidor teve um problema. Tente novamente dentro de alguns instantes.';
  const message = err.error?.message ?? err.error?.errors?.[0]?.msg;
  return typeof message === 'string' && message ? message : fallback;
}
