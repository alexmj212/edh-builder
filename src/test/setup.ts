import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'

// Node 22+ ships an experimental built-in `localStorage` that shadows jsdom's
// implementation and is missing standard methods. Install an in-memory polyfill
// so tests can exercise localStorage-backed code (e.g. ThemeToggle).
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
}

const memoryStorage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: memoryStorage,
})
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: memoryStorage,
})
