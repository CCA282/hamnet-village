import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { clipboardCopy } from '../utils/clipboard.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('clipboardCopy — clipboard API available', () => {
  it('returns true when navigator.clipboard.writeText succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const result = await clipboardCopy('HELLO')
    expect(writeText).toHaveBeenCalledWith('HELLO')
    expect(result).toBe(true)
  })

  it('falls back when clipboard.writeText rejects', async () => {
    // In node (no DOM), the execCommand fallback also fails → returns false.
    // In a browser, it would try document.execCommand. Both paths are tested in E2E.
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    // No DOM available in node test env; both paths fail → false
    const result = await clipboardCopy('HELLO')
    expect(writeText).toHaveBeenCalledWith('HELLO')
    expect(result).toBe(false)
  })
})

describe('clipboardCopy — no clipboard API', () => {
  it('returns false in node env (no DOM for execCommand fallback)', async () => {
    vi.stubGlobal('navigator', {})
    // Node test env has no document.createElement/execCommand → catch → false
    const result = await clipboardCopy('WORLD')
    expect(result).toBe(false)
  })


})

describe('clipboardCopy — execCommand fallback (mocked DOM)', () => {
  beforeEach(() => {
    // Provide minimal document stub for tests that need DOM
    const textarea = {
      value: '',
      style: {},
      focus: vi.fn(),
      select: vi.fn(),
    }
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(textarea),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      execCommand: vi.fn().mockReturnValue(true),
    })
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
  })

  it('calls execCommand("copy") when clipboard API fails', async () => {
    const result = await clipboardCopy('FALLBACK')
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(result).toBe(true)
  })

  it('returns false when execCommand returns false', async () => {
    document.execCommand.mockReturnValue(false)
    const result = await clipboardCopy('FALLBACK')
    expect(result).toBe(false)
  })

  it('returns false when execCommand throws', async () => {
    document.execCommand.mockImplementation(() => { throw new Error('blocked') })
    const result = await clipboardCopy('FALLBACK')
    expect(result).toBe(false)
  })
})
