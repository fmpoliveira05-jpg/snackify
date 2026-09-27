/**
 * Orçamento de chamadas por janela de tempo (janela fixa, em memória, por instância).
 *
 * Serve de "travão de emergência" contra custos descontrolados: um ciclo infinito, um bot ou
 * um abuso não conseguem fazer mais do que N chamadas a um serviço externo por janela.
 */
class WindowBudget {
  /**
   * @param {{limit: number, windowMs: number, now?: () => number, maxKeys?: number}} options
   */
  constructor({ limit, windowMs, now = Date.now, maxKeys = 10000 }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.maxKeys = maxKeys;
    this.windows = new Map();
  }

  /**
   * Gasta uma unidade do orçamento da chave, se ainda houver.
   *
   * @param {string} [key] ex.: 'global' ou o destinatário de um email
   * @returns {boolean} false se o orçamento desta janela já se esgotou
   */
  tryConsume(key = 'global') {
    if (this.limit <= 0) return false;
    const now = this.now();
    let entry = this.windows.get(key);
    if (!entry || now >= entry.resetAt) {
      if (!entry && this.windows.size >= this.maxKeys) this.prune(now);
      entry = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, entry);
    }
    if (entry.count >= this.limit) return false;
    entry.count += 1;
    return true;
  }

  /** Quanto resta na janela atual. */
  remaining(key = 'global') {
    const entry = this.windows.get(key);
    if (!entry || this.now() >= entry.resetAt) return this.limit;
    return Math.max(0, this.limit - entry.count);
  }

  prune(now) {
    for (const [key, entry] of this.windows) {
      if (now >= entry.resetAt) this.windows.delete(key);
    }
    // Se ainda estiver cheio, esquece as chaves mais antigas.
    while (this.windows.size >= this.maxKeys) this.windows.delete(this.windows.keys().next().value);
  }

  reset() {
    this.windows.clear();
  }
}

module.exports = WindowBudget;
