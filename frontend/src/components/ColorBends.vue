<script setup lang="ts">
import * as THREE from 'three'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { colorBendsFragment, colorBendsVertex } from './colorBendsShaders'

const props = withDefaults(defineProps<{
  colors?: string[]
  rotation?: number
  autoRotate?: number
  speed?: number
  transparent?: boolean
  scale?: number
  frequency?: number
  warpStrength?: number
  mouseInfluence?: number
  parallax?: number
  noise?: number
  iterations?: number
  intensity?: number
  bandWidth?: number
}>(), {
  colors: () => ['#32F08C'],
  rotation: 90,
  autoRotate: 0,
  speed: 0.2,
  transparent: true,
  scale: 1,
  frequency: 1,
  warpStrength: 1,
  mouseInfluence: 1,
  parallax: 0.5,
  noise: 0.15,
  iterations: 1,
  intensity: 1.3,
  bandWidth: 0.14,
})

const host = ref<HTMLElement | null>(null)
let renderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene | undefined
let camera: THREE.OrthographicCamera | undefined
let geometry: THREE.PlaneGeometry | undefined
let material: THREE.ShaderMaterial | undefined
let mesh: THREE.Mesh | undefined
let resizeObserver: ResizeObserver | undefined
let animationFrame = 0
let clock: THREE.Clock | undefined
const pointerTarget = new THREE.Vector2(0, 0)
const pointerCurrent = new THREE.Vector2(0, 0)

function toVector3(hex: string): THREE.Vector3 {
  const value = hex.replace('#', '').trim()
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value
  return new THREE.Vector3(
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  )
}

function colorVectors(): THREE.Vector3[] {
  return Array.from({ length: 8 }, (_, index) => toVector3(props.colors[index] ?? '#000000'))
}

function syncUniforms(): void {
  if (!material) return
  const uniforms = material.uniforms
  uniforms.uSpeed.value = props.speed
  uniforms.uRot.value.set(Math.cos(props.rotation * Math.PI / 180), Math.sin(props.rotation * Math.PI / 180))
  uniforms.uColorCount.value = Math.min(props.colors.length, 8)
  props.colors.slice(0, 8).forEach((color, index) => uniforms.uColors.value[index].copy(toVector3(color)))
  uniforms.uTransparent.value = props.transparent ? 1 : 0
  uniforms.uScale.value = props.scale
  uniforms.uFrequency.value = props.frequency
  uniforms.uWarpStrength.value = props.warpStrength
  uniforms.uMouseInfluence.value = props.mouseInfluence
  uniforms.uParallax.value = props.parallax
  uniforms.uNoise.value = props.noise
  uniforms.uIterations.value = props.iterations
  uniforms.uIntensity.value = props.intensity
  uniforms.uBandWidth.value = props.bandWidth
  if (renderer) renderer.setClearColor(0x000000, props.transparent ? 0 : 1)
}

function resize(): void {
  if (!host.value || !renderer || !material) return
  const width = host.value.clientWidth || 1
  const height = host.value.clientHeight || 1
  renderer.setSize(width, height, false)
  material.uniforms.uCanvas.value.set(width, height)
}

function handlePointerMove(event: PointerEvent): void {
  if (!host.value) return
  const rect = host.value.getBoundingClientRect()
  pointerTarget.set(
    ((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1,
    -(((event.clientY - rect.top) / (rect.height || 1)) * 2 - 1),
  )
}

function render(): void {
  if (!renderer || !scene || !camera || !material) return
  try {
    const delta = clock?.getDelta() ?? 0
    const elapsed = clock?.elapsedTime ?? 0
    material.uniforms.uTime.value = elapsed
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const degrees = (props.rotation % 360) + (reducedMotion ? 0 : props.autoRotate * elapsed)
    const radians = degrees * Math.PI / 180
    material.uniforms.uRot.value.set(Math.cos(radians), Math.sin(radians))
    pointerCurrent.lerp(pointerTarget, reducedMotion ? 1 : Math.min(1, delta * 8))
    material.uniforms.uPointer.value.copy(pointerCurrent)
    renderer.render(scene, camera)
    if (!reducedMotion) animationFrame = requestAnimationFrame(render)
  } catch (error) {
    console.error('[ColorBends] WebGL animation disabled.', error)
  }
}

onMounted(() => {
  if (!host.value) return
  try {
    scene = new THREE.Scene()
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    geometry = new THREE.PlaneGeometry(2, 2)
    material = new THREE.ShaderMaterial({
      vertexShader: colorBendsVertex,
      fragmentShader: colorBendsFragment,
      uniforms: {
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSpeed: { value: props.speed },
        uRot: { value: new THREE.Vector2(1, 0) },
        uColorCount: { value: Math.min(props.colors.length, 8) },
        uColors: { value: colorVectors() },
        uTransparent: { value: props.transparent ? 1 : 0 },
        uScale: { value: props.scale },
        uFrequency: { value: props.frequency },
        uWarpStrength: { value: props.warpStrength },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uMouseInfluence: { value: props.mouseInfluence },
        uParallax: { value: props.parallax },
        uNoise: { value: props.noise },
        uIterations: { value: props.iterations },
        uIntensity: { value: props.intensity },
        uBandWidth: { value: props.bandWidth },
      },
      premultipliedAlpha: true,
      transparent: true,
    })
    mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: true })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, props.transparent ? 0 : 1)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    host.value.appendChild(renderer.domElement)
    clock = new THREE.Clock()
    resize()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(host.value)
    } else {
      window.addEventListener('resize', resize)
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    animationFrame = requestAnimationFrame(render)
  } catch (error) {
    console.error('[ColorBends] Three.js WebGL initialization failed; effect disabled.', error)
  }
})

watch(() => [props.colors, props.rotation, props.autoRotate, props.speed, props.transparent, props.scale, props.frequency, props.warpStrength, props.mouseInfluence, props.parallax, props.noise, props.iterations, props.intensity, props.bandWidth], syncUniforms, { deep: true })

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', handlePointerMove)
  geometry?.dispose()
  material?.dispose()
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer?.domElement.remove()
  scene = undefined
  camera = undefined
  geometry = undefined
  material = undefined
  mesh = undefined
  renderer = undefined
  clock = undefined
})
</script>

<template>
  <div ref="host" data-testid="color-bends" class="color-bends" :data-colors="colors.join(',')" :data-rotation="rotation"></div>
</template>

<style scoped>
.color-bends { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.color-bends canvas { position: relative; z-index: 1; }
</style>
