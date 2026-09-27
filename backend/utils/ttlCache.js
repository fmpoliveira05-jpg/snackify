/**
 * Cache em memória com validade (TTL) e número máximo de entradas (a mais antiga sai primeiro, LRU).
 *
 * É por processo: com várias instâncias da aplicação cada uma tem a sua cópia, e a validade
 * curta limita o tempo em que uma instância pode mostrar dados desatualizados.
 */
class TtlCache {
  /**
   * @param {{max?: number, ttlMs?: number, now?: () => number}} [options]
   */
  constructor({ max = 500, ttlMs = 60000, now = Date.now } = {}) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
    this.pending = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get size() {
    return this.entries.size;
  }

  /** @returns {*} o valor guardado, ou undefined se não existir ou já tiver expirado */
  get(key) {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expires <= this.now()) {
      this.entries.delete(key);
      this.misses += 1;
      return undefined;
    }
    // Passa para o fim do Map: fica a entrada usada mais recentemente.
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  /**
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs] validade desta entrada (por omissão, a da cache)
   */
  set(key, value, ttlMs = this.ttlMs) {
    if (this.max <= 0 || ttlMs <= 0) return value;
    this.entries.delete(key);
    this.entries.set(key, { value, expires: this.now() + ttlMs });
    while (this.entries.size > this.max) {
      this.entries.delete(this.entries.keys().next().value);
    }
    return value;
  }

  delete(key) {
    this.entries.delete(key);
    this.pending.delete(key);
  }

  /** Apaga as entradas cuja chave começa pelo prefixo indicado (ou todas, sem prefixo). */
  clear(prefix = '') {
    if (!prefix) {
      this.entries.clear();
      this.pending.clear();
      return;
    }
    [...this.entries.keys(), ...this.pending.keys()]
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => this.delete(key));
  }

  /**
   * Devolve o valor em cache ou calcula-o com `load`. Pedidos simultâneos para a mesma chave
   * partilham o mesmo cálculo (uma só consulta à base de dados ou ao serviço externo).
   *
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} load
   * @param {{ttlMs?: number, shouldCache?: (value: T) => boolean}} [options]
   * @returns {Promise<T>}
   */
  async wrap(key, load, { ttlMs, shouldCache = () => true } = {}) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    if (this.pending.has(key)) return this.pending.get(key);

    const promise = (async () => {
      try {
        const value = await load();
        // Se a chave foi invalidada entretanto, o valor (possivelmente antigo) não fica guardado.
        if (this.pending.get(key) === promise && shouldCache(value)) {
          this.set(key, value, ttlMs ?? this.ttlMs);
        }
        return value;
      } finally {
        if (this.pending.get(key) === promise) this.pending.delete(key);
      }
    })();
    this.pending.set(key, promise);
    return promise;
  }
}

module.exports = TtlCache;
