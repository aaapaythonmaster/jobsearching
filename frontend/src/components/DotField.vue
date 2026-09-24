<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface Dot {
  ax: number
  ay: number
  sx: number
  sy: number
  vx: number
  vy: number
}

const props = withDefaults(defineProps<{
  dotOpacity?: number
  dotRadius?: number
  dotSpacing?: number
  cursorRadius?: number
  cursorForce?: number
  bulgeOnly?: boolean
  bulgeStrength?: number
  glowRadius?: number
  glowOpacity?: number
  sparkle?: boolean
  waveAmplitude?: number
  gradientFrom?: string
  gradientTo?: string
  glowColor?: string
}>(), {
  dotOpacity: 0.32,
  dotRadius: 1.5,
  dotSpacing: 14,
  cursorRadius: 500,
  cursorForce: 0.1,
  bulgeOnly: true,
  bulgeStrength: 67,
  glowRadius: 160,
  glowOpacity: 0.1,
  sparkle: false,
  waveAmplitude: 0,
  gradientFrom: 'rgba(50, 240, 140, 0.35)',
  gradientTo: 'rgba(180, 255, 215, 0.25)',
  glowColor: '#32F08C',
})

const host = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const glow = ref<SVGCircleElement | null>(null)
const glowId = `dot-field-glow-${Math.random().toString(36).slice(2, 9)}`

let animationFrame = 0
let frameCount = 0
let speedInterval = 0
let resizeTimer = 0
let resizeObserver: ResizeObserver | undefined
let dots: Dot[] = []
let width = 0
let height = 0
let rebuildRef: (() => void) | undefined
const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 }
let engagement = 0
let glowEngagementOpacity = 0

function buildDots(nextWidth: number, nextHeight: number): void {
  const step = props.dotRadius + props.dotSpacing
  const cols = Math.floor(nextWidth / step)
  const rows = Math.floor(nextHeight / step)
  const padX = (nextWidth % step) / 2
  const padY = (nextHeight % step) / 2
  dots = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const ax = padX + col * step + step / 2
      const ay = padY + row * step + step / 2
      dots.push({ ax, ay, sx: ax, sy: ay, vx: 0, vy: 0 })
    }
  }
}

function doResize(): void {
  if (!canvas.value || !host.value) return
  const rect = host.value.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = rect.width
  height = rect.height
  canvas.value.width = width * dpr
  canvas.value.height = height * dpr
  canvas.value.style.width = `${width}px`
  canvas.value.style.height = `${height}px`
  canvas.value.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildDots(width, height)
}

function resize(): void {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(doResize, 100)
}

function onMouseMove(event: MouseEvent): void {
  if (!host.value) return
  const rect = host.value.getBoundingClientRect()
  mouse.x = event.pageX - (rect.left + window.scrollX)
  mouse.y = event.pageY - (rect.top + window.scrollY)
}

function updateMouseSpeed(): void {
  const dx = mouse.prevX - mouse.x
  const dy = mouse.prevY - mouse.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  mouse.speed += (distance - mouse.speed) * 0.5
  if (mouse.speed < 0.001) mouse.speed = 0
  mouse.prevX = mouse.x
  mouse.prevY = mouse.y
}

function draw(_time: number): void {
  if (!canvas.value) return
  const context = canvas.value.getContext('2d')
  if (!context) return
  try {
  const targetEngagement = Math.min(mouse.speed / 5, 1)
  engagement += (targetEngagement - engagement) * 0.06
  if (engagement < 0.001) engagement = 0
  glowEngagementOpacity += (engagement - glowEngagementOpacity) * 0.08
  if (glow.value) {
    glow.value.setAttribute('cx', String(mouse.x))
    glow.value.setAttribute('cy', String(mouse.y))
    glow.value.style.opacity = String(glowEngagementOpacity * props.glowOpacity)
  }

  context.clearRect(0, 0, width, height)
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, props.gradientFrom)
  gradient.addColorStop(1, props.gradientTo)
  context.fillStyle = gradient
  context.beginPath()
  const radius = props.dotRadius / 2
  const cursorRadiusSquared = props.cursorRadius * props.cursorRadius
  frameCount += 1
  const seconds = frameCount * 0.02

  dots.forEach((dot, index) => {
    const dx = mouse.x - dot.ax
    const dy = mouse.y - dot.ay
    const distanceSquared = dx * dx + dy * dy
    if (distanceSquared < cursorRadiusSquared && engagement > 0.01) {
      const distance = Math.sqrt(distanceSquared)
      const amount = 1 - distance / props.cursorRadius
      if (props.bulgeOnly) {
        const push = amount * amount * props.bulgeStrength * engagement
        const angle = Math.atan2(dy, dx)
        dot.sx += (dot.ax - Math.cos(angle) * push - dot.sx) * 0.15
        dot.sy += (dot.ay - Math.sin(angle) * push - dot.sy) * 0.15
      } else {
        const angle = Math.atan2(dy, dx)
        const move = (500 / Math.max(distance, 1)) * (mouse.speed * props.cursorForce)
        dot.vx += Math.cos(angle) * -move
        dot.vy += Math.sin(angle) * -move
      }
    } else if (props.bulgeOnly) {
      dot.sx += (dot.ax - dot.sx) * 0.1
      dot.sy += (dot.ay - dot.sy) * 0.1
    }

    if (!props.bulgeOnly) {
      dot.vx *= 0.9
      dot.vy *= 0.9
      dot.sx += (dot.ax + dot.vx - dot.sx) * 0.1
      dot.sy += (dot.ay + dot.vy - dot.sy) * 0.1
    }

    let drawX = dot.sx
    let drawY = dot.sy
    if (props.waveAmplitude > 0) {
      drawY += Math.sin(dot.ax * 0.03 + seconds) * props.waveAmplitude
      drawX += Math.cos(dot.ay * 0.03 + seconds * 0.7) * props.waveAmplitude * 0.5
    }
    const sparkle = props.sparkle && (((index * 2654435761) ^ (frameCount >> 3)) >>> 0) % 100 < 3
    const drawRadius = sparkle ? radius * 1.8 : radius
    context.moveTo(drawX + drawRadius, drawY)
    context.arc(drawX, drawY, drawRadius, 0, Math.PI * 2)
  })
  context.fill()
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      animationFrame = requestAnimationFrame(draw)
    }
  } catch (error) {
    console.error('[DotField] Canvas animation disabled.', error)
  }
}

onMounted(() => {
  if (!canvas.value || !host.value) return
  const context = canvas.value.getContext('2d', { alpha: true })
  if (!context) return
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host.value)
  doResize()
  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  speedInterval = window.setInterval(updateMouseSpeed, 20)
  animationFrame = requestAnimationFrame(draw)
  rebuildRef = () => {
    if (width > 0 && height > 0) buildDots(width, height)
  }
})

watch(() => [props.dotRadius, props.dotSpacing], () => rebuildRef?.())

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  window.clearInterval(speedInterval)
  window.clearTimeout(resizeTimer)
  resizeObserver?.disconnect()
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<template>
  <div
    ref="host"
    data-testid="dot-field"
    class="dot-field"
    :data-opacity="dotOpacity"
    :data-dot-spacing="dotSpacing"
    aria-hidden="true"
  >
    <canvas ref="canvas" class="dot-field__canvas" :style="{ opacity: dotOpacity }"></canvas>
    <svg class="dot-field__glow-layer" aria-hidden="true">
      <defs>
        <radialGradient :id="glowId">
          <stop offset="0%" :stop-color="glowColor" />
          <stop offset="100%" stop-color="transparent" />
        </radialGradient>
      </defs>
      <circle ref="glow" cx="-9999" cy="-9999" :r="glowRadius" :fill="`url(#${glowId})`" />
    </svg>
  </div>
</template>

<style scoped>
.dot-field { position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
.dot-field__canvas, .dot-field__glow-layer { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
.dot-field__glow-layer { pointer-events: none; }
</style>
