<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{ opacity?: number; dotSpacing?: number; dotRadius?: number }>(), {
  opacity: 0.16,
  dotSpacing: 18,
  dotRadius: 1.2,
})

const host = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
let animationFrame = 0
let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  if (!canvas.value || !host.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const context = canvas.value.getContext('2d')
  if (!context) return
  const draw = () => {
    if (!host.value || !canvas.value) return
    const rect = host.value.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.value.width = rect.width * dpr
    canvas.value.height = rect.height * dpr
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, rect.width, rect.height)
    context.fillStyle = `rgba(50, 240, 140, ${props.opacity})`
    for (let y = props.dotSpacing / 2; y < rect.height; y += props.dotSpacing) {
      for (let x = props.dotSpacing / 2; x < rect.width; x += props.dotSpacing) {
        context.beginPath()
        context.arc(x, y, props.dotRadius, 0, Math.PI * 2)
        context.fill()
      }
    }
    animationFrame = requestAnimationFrame(draw)
  }
  resizeObserver = new ResizeObserver(() => undefined)
  resizeObserver.observe(host.value)
  draw()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div ref="host" data-testid="dot-field" class="dot-field" :data-opacity="opacity" aria-hidden="true">
    <div class="dot-field__glow"></div>
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
.dot-field { position: absolute; inset: 0; z-index: 0; overflow: hidden; opacity: 0.72; pointer-events: none; }
.dot-field__glow { position: absolute; inset: -20%; background: radial-gradient(circle at 28% 24%, rgba(50, 240, 140, .22), transparent 28%), radial-gradient(circle at 78% 76%, rgba(50, 240, 140, .14), transparent 34%); animation: dot-field-drift 18s ease-in-out infinite alternate; }
.dot-field canvas { display: block; width: 100%; height: 100%; }
@keyframes dot-field-drift { from { transform: translate3d(-2%, -2%, 0); } to { transform: translate3d(2%, 2%, 0); } }
@media (prefers-reduced-motion: reduce) { .dot-field__glow { animation: none; } }
</style>
