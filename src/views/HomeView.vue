<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 图纸决策：静态 JSON fetch 一律走 BASE_URL 前缀（base '/MatchLab/'，禁用 '/data/...' 绝对路径）
const ping = ref<Record<string, unknown> | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/ping.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    ping.value = await res.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
    <h1 class="text-4xl font-bold tracking-tight">MatchLab</h1>
    <p class="text-slate-400">五大联赛数据查询 · Phase 0 脚手架</p>
    <div v-if="error" class="text-red-400">
      测试 JSON 获取失败：{{ error }}
    </div>
    <div v-else-if="ping" class="text-emerald-400">
      public/data/ 读取成功 → <code>{{ JSON.stringify(ping) }}</code>
    </div>
    <div v-else class="text-slate-500">
      正在获取 public/data/ping.json …
    </div>
  </main>
</template>
