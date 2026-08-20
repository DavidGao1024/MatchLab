<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let rafId = 0

function onResize() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function start() {
  const canvas = canvasRef.value
  if (!canvas) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  onResize()

  const count = window.innerWidth < 768 ? 35 : 70
  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    pulse: Math.random() * Math.PI * 2,
    alpha: Math.random() * 0.4 + 0.2,
  }))

  window.addEventListener('resize', onResize)

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.pulse += 0.02
      const a = p.alpha + Math.sin(p.pulse) * 0.15
      if (p.x < 0) p.x = canvas.width
      if (p.x > canvas.width) p.x = 0
      if (p.y < 0) p.y = canvas.height
      if (p.y > canvas.height) p.y = 0
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,215,0,${Math.max(0, Math.min(1, a))})`
      ctx.fill()
    }
    rafId = requestAnimationFrame(draw)
  }
  rafId = requestAnimationFrame(draw)
}

onMounted(start)
onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <canvas ref="canvasRef" aria-hidden="true" class="pointer-events-none fixed inset-0 z-0"></canvas>
</template>