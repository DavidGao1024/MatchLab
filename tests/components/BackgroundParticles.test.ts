// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BackgroundParticles from '../../src/components/layout/BackgroundParticles.vue'

let raf: ReturnType<typeof vi.fn>
let caf: ReturnType<typeof vi.fn>

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

function stubCanvasContext() {
  const ctx = { clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn() }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  return ctx
}

describe('BackgroundParticles', () => {
  beforeEach(() => {
    raf = vi.fn(() => 1)
    caf = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', caf)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('系统开启减少动态效果时不启动循环', () => {
    stubMatchMedia(true)
    stubCanvasContext()
    mount(BackgroundParticles)
    expect(raf).not.toHaveBeenCalled()
  })

  it('注册 resize 监听，卸载时移除', () => {
    stubMatchMedia(false)
    stubCanvasContext()
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const w = mount(BackgroundParticles)
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    w.unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('退出组件时取消动画帧循环', () => {
    stubMatchMedia(false)
    stubCanvasContext()
    const w = mount(BackgroundParticles)
    expect(raf).toHaveBeenCalled()
    w.unmount()
    expect(caf).toHaveBeenCalled()
  })

  it('粒子铺满整个画布，而非挤在左上角', () => {
    stubMatchMedia(false)
    const ctx = stubCanvasContext()
    // rAF 只执行第一次回调，抓一次 draw 的粒子坐标
    const rafExec = vi.fn((cb: FrameRequestCallback) => {
      if (rafExec.mock.calls.length === 1) cb(0)
      return 1
    })
    vi.stubGlobal('requestAnimationFrame', rafExec)
    const w = mount(BackgroundParticles)
    const calls = ctx.arc.mock.calls as any[][]
    const xs = calls.map((c) => c[0] as number)
    expect(Math.max(...xs)).toBeGreaterThan(300)
    w.unmount()
  })
})