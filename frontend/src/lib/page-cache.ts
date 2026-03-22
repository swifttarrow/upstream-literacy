const TTL = 5 * 60 * 1000; // 5 minutes

interface Entry<T> {
  data: T;
  at: number;
}

const store = new Map<string, Entry<unknown>>();

export const pageCache = {
  get<T>(key: string): T | undefined {
    const entry = store.get(key) as Entry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() - entry.at > TTL) {
      store.delete(key);
      return undefined;
    }
    return entry.data;
  },

  set<T>(key: string, data: T): void {
    store.set(key, { data, at: Date.now() });
  },

  has(key: string): boolean {
    return this.get(key) !== undefined;
  },

  invalidate(key: string): void {
    store.delete(key);
  },
};
