/**
 * ✅ FIX #5: LRU Cache implementation para prevenir memory leak
 * 
 * Cache com limite de tamanho que remove automaticamente as entradas
 * menos recentemente usadas quando atinge o limite.
 */

export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number = 10000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Adiciona ou atualiza um item no cache
   * Move o item para o final (mais recente)
   */
  set(key: K, value: V): void {
    // Se já existe, remove para re-adicionar no final
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Se atingiu o limite, remove o primeiro item (mais antigo)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    // Adiciona no final (mais recente)
    this.cache.set(key, value);
  }

  /**
   * Busca um item no cache
   * Move o item para o final (marca como recentemente usado)
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    
    // Move para o final (marca como recentemente usado)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  /**
   * Verifica se um item existe no cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove um item do cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Retorna o tamanho atual do cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Retorna o tamanho máximo do cache
   */
  get maxCacheSize(): number {
    return this.maxSize;
  }

  /**
   * Retorna todas as chaves do cache
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * Retorna todos os valores do cache
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
   * Retorna todas as entradas do cache
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercentage: ((this.cache.size / this.maxSize) * 100).toFixed(2) + '%'
    };
  }
}
