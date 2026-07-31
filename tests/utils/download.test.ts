// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { downloadBlob } from '../../src/utils/download'

describe('downloadBlob', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() },
      writable: true,
    })
    HTMLAnchorElement.prototype.click = vi.fn()
  })
  it('触发 a 标签下载', () => {
    downloadBlob('test.ics', 'CONTENT', 'text/calendar')
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
  })
  it('下载后 revoke URL 释放内存', () => {
    downloadBlob('test.ics', 'CONTENT', 'text/calendar')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })
})
