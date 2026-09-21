<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Mesh, Program, Renderer, Triangle } from 'ogl'

const props = withDefaults(defineProps<{
  colors?: string[]
  rotation?: number
  speed?: number
  frequency?: number
  noise?: number
  bandWidth?: number
  intensity?: number
  iterations?: number
}>(), {
  colors: () => ['#32F08C'],
  rotation: 90,
  speed: 0.2,
  frequency: 1,
  noise: 0.15,
  bandWidth: 0.14,
  intensity: 1.3,
  iterations: 1,
})

const host = ref<HTMLElement | null>(null)
let renderer: Renderer | undefined
let program: Program | undefined
let mesh: Mesh | undefined
let raf = 0
let resizeObserver: ResizeObserver | undefined

const vertex = `attribute vec2 uv; varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,0.0,1.0);}`
const fragment = `precision highp float; varying vec2 vUv; uniform vec2 uCanvas; uniform float uTime,uSpeed,uFrequency,uNoise,uBandWidth,uIntensity; uniform vec2 uRot,uPointer; uniform vec3 uColor; void main(){float t=uTime*uSpeed; vec2 p=vUv*2.0-1.0; p+=uPointer*0.08; vec2 rp=vec2(p.x*uRot.x-p.y*uRot.y,p.x*uRot.y+p.y*uRot.x); vec2 q=vec2(rp.x*(uCanvas.x/uCanvas.y),rp.y); q/=0.5+0.2*dot(q,q); q+=0.2*cos(t)-7.56; vec2 r=sin(1.5*(q.yx*uFrequency)+2.0*cos(q*uFrequency)); float m=length(r+sin(5.0*r.y*uFrequency-3.0*t)/4.0); float w=1.0-exp(-uBandWidth/exp(uBandWidth*m)); vec3 col=uColor*w*uIntensity; float n=fract(sin(dot(gl_FragCoord.xy+vec2(uTime),vec2(12.9898,78.233)))*43758.5453); col+=((n-0.5)*uNoise); gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);}`

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255) as [number, number, number]
}

function render(): void {
  if (!renderer || !program || !mesh) return
  program.uniforms.uTime.value += 0.016
  renderer.render({ scene: mesh })
  raf = requestAnimationFrame(render)
}

function resize(): void {
  if (!renderer || !program || !host.value) return
  const width = Math.max(host.value.clientWidth, 1)
  const height = Math.max(host.value.clientHeight, 1)
  renderer.setSize(width, height)
  program.uniforms.uCanvas.value = [width, height]
}

onMounted(() => {
  if (!host.value || typeof WebGLRenderingContext === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  try {
    renderer = new Renderer({ alpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 2) })
    const gl = renderer.gl
    host.value.appendChild(gl.canvas)
    gl.canvas.style.width = '100%'
    gl.canvas.style.height = '100%'
    gl.canvas.style.display = 'block'
    program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uCanvas: { value: [1, 1] },
        uTime: { value: 0 },
        uSpeed: { value: props.speed },
        uFrequency: { value: props.frequency },
        uNoise: { value: props.noise },
        uBandWidth: { value: props.bandWidth },
        uIntensity: { value: props.intensity },
        uRot: { value: [Math.cos(props.rotation * Math.PI / 180), Math.sin(props.rotation * Math.PI / 180)] },
        uPointer: { value: [0, 0] },
        uColor: { value: hexToRgb(props.colors[0] ?? '#32F08C') },
      },
    })
    mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
    resize()
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host.value)
    raf = requestAnimationFrame(render)
  } catch {
    renderer = undefined
    program = undefined
  }
})

watch(() => props.colors, (colors) => {
  if (program) program.uniforms.uColor.value = hexToRgb(colors[0] ?? '#32F08C')
}, { deep: true })

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObserver?.disconnect()
  renderer?.gl.canvas.remove()
  renderer?.gl.getExtension('WEBGL_lose_context')?.loseContext()
  renderer = undefined
  program = undefined
  mesh = undefined
})
</script>

<template>
  <div ref="host" data-testid="color-bends" class="color-bends" :data-colors="colors.join(',')" :data-rotation="rotation"></div>
</template>

<style scoped>
.color-bends { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
</style>
