import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requestPersistentStorage } from './storage'

const originalStorage = navigator.storage

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: originalStorage,
  })
})

describe('requestPersistentStorage', () => {
  it('returns true when navigator.storage.persist resolves true', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist: vi.fn().mockResolvedValue(true) },
    })
    await expect(requestPersistentStorage()).resolves.toBe(true)
  })

  it('returns false and warns when persist resolves false', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist: vi.fn().mockResolvedValue(false) },
    })
    await expect(requestPersistentStorage()).resolves.toBe(false)
    expect(warn).toHaveBeenCalledWith('Persistent storage not granted by browser')
  })

  it('returns false when navigator.storage is unavailable', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: undefined,
    })
    await expect(requestPersistentStorage()).resolves.toBe(false)
  })

  it('returns false when navigator.storage.persist is unavailable', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {},
    })
    await expect(requestPersistentStorage()).resolves.toBe(false)
  })
})
