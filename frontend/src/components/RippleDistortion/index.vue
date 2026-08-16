<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { Geometry, Mesh, Program, Renderer, RenderTarget, Texture, Triangle } from 'ogl'
import type { RippleDistortionProps } from './types'
import './style.less'

// Rendering algorithm ported from React Bits Ripple Distortion.
// Source: https://github.com/DavidHDev/react-bits
// License: MIT + Commons Clause License Condition v1.0.

const MAX_WAVES = 100
const QUALITY_SCALE = { low: 0.4, medium: 0.7, high: 1 } as const
const START_SCALE = 1.5
const LIFE_CONSTANT = Math.log(500)

const waveVertex = `
precision highp float;

attribute vec2 position;
attribute vec2 uv;
attribute vec2 iOffset;
attribute vec2 iScale;
attribute float iOpacity;

varying vec2 vUv;
varying float vOpacity;

void main() {
  vUv = uv;
  vOpacity = iOpacity;
  gl_Position = vec4(iOffset + position * iScale, 0.0, 1.0);
}
`

const waveFragment = `
precision highp float;

varying vec2 vUv;
varying float vOpacity;

uniform float uRings;

const float PI = 3.141592653589793;
const float EDGE = 0.006737947;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;

  float brush = (exp(-r * 5.0) - EDGE) / (1.0 - EDGE);
  brush *= 0.55 + 0.45 * cos(sqrt(r) * PI * 2.0 * uRings);

  gl_FragColor = vec4(vec3(brush * vOpacity * vOpacity), 1.0);
}
`

const screenVertex = `
precision highp float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const compositeFragment = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uTexture;
uniform sampler2D uDisplacement;
uniform vec2 uResolution;
uniform vec2 uTextureSize;
uniform vec2 uTexel;
uniform vec3 uTint;
uniform vec3 uHighlight;
uniform float uStrength;
uniform float uSwirl;
uniform float uDispersion;
uniform float uGlint;
uniform float uTintAmount;
uniform float uGrayscale;

const float TAU = 6.283185307179586;

vec2 coverUV(vec2 uv) {
  vec2 safe = max(uTextureSize, vec2(1.0));
  vec2 s = uResolution / safe;
  vec2 scaledSize = safe * max(s.x, s.y);
  vec2 offset = (uResolution - scaledSize) * 0.5;
  return (uv * uResolution - offset) / scaledSize;
}

void main() {
  float amount = texture2D(uDisplacement, vUv).r;
  vec2 base = coverUV(vUv);

  float theta = amount * uSwirl * TAU;
  vec2 dir = vec2(sin(theta), cos(theta));
  vec2 push = dir * amount * uStrength;

  vec3 color;
  if (uDispersion > 0.001) {
    float split = uDispersion * 0.25;
    color.r = texture2D(uTexture, base + push * (1.0 + split)).r;
    color.g = texture2D(uTexture, base + push).g;
    color.b = texture2D(uTexture, base + push * (1.0 - split)).b;
  } else {
    color = texture2D(uTexture, base + push).rgb;
  }

  if (uGrayscale > 0.001) {
    color = mix(color, vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))), uGrayscale);
  }

  if (uTintAmount > 0.001) {
    color = mix(color, color * uTint * 1.9, clamp(amount * 1.6, 0.0, 1.0) * uTintAmount);
  }

  if (uGlint > 0.001) {
    float ex = texture2D(uDisplacement, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDisplacement, vUv - vec2(uTexel.x, 0.0)).r;
    float ey = texture2D(uDisplacement, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDisplacement, vUv - vec2(0.0, uTexel.y)).r;
    vec3 normal = normalize(vec3(-ex * 26.0, -ey * 26.0, 1.0));
    vec3 light = normalize(vec3(-0.35, 0.55, 1.0));
    float raw = pow(max(dot(normal, light), 0.0), 22.0);
    float flatSpec = pow(max(light.z, 0.0), 22.0);
    color += uHighlight * clamp((raw - flatSpec) / max(1.0 - flatSpec, 0.0001), 0.0, 1.0) * uGlint;
  }

  gl_FragColor = vec4(color, 1.0);
}
`

interface Wave {
  x: number
  y: number
  scale: number
  target: number
  size: number
  opacity: number
}

interface CompositeUniforms {
  uTexture: { value: Texture }
  uDisplacement: { value: Texture }
  uResolution: { value: [number, number] }
  uTextureSize: { value: [number, number] }
  uTexel: { value: [number, number] }
  uTint: { value: [number, number, number] }
  uHighlight: { value: [number, number, number] }
  uStrength: { value: number }
  uSwirl: { value: number }
  uDispersion: { value: number }
  uGlint: { value: number }
  uTintAmount: { value: number }
  uGrayscale: { value: number }
  [key: string]: { value: unknown }
}

interface WaveUniforms {
  uRings: { value: number }
  [key: string]: { value: unknown }
}

interface RippleUniforms {
  wave: WaveUniforms
  composite: CompositeUniforms
}

const props = withDefaults(defineProps<RippleDistortionProps>(), {
  brushSize: 150,
  strength: 0.12,
  swirl: 0.8,
  rings: 4,
  spread: 5,
  fade: 2.8,
  spacing: 15,
  dispersion: 0.015,
  glint: 0.12,
  tint: '#dff7ff',
  tintAmount: 0.04,
  grayscale: false,
  highlightColor: '#ffffff',
  trigger: 'both',
  clickStrength: 2,
  quality: 'medium',
  enabled: true,
})

const mountRef = useTemplateRef<HTMLDivElement>('mountRef')
const state = ref<'static' | 'interactive' | 'error'>('static')
const backgroundStyle = computed(() => ({ backgroundImage: `url("${props.src}")` }))

let disposeRenderer: (() => void) | undefined
let uniforms: RippleUniforms | undefined

function hexToRGB(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((character) => character + character)
          .join('')
      : clean
  const number = Number.parseInt(full, 16)
  if (Number.isNaN(number)) return [1, 1, 1]
  return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255]
}

function prefersStaticPresentation(): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(max-width: 760px)').matches
  )
}

function updateUniforms(): void {
  if (!uniforms) return
  uniforms.wave.uRings.value = props.rings
  uniforms.composite.uStrength.value = props.strength
  uniforms.composite.uSwirl.value = props.swirl
  uniforms.composite.uDispersion.value = props.dispersion
  uniforms.composite.uGlint.value = props.glint
  uniforms.composite.uTintAmount.value = props.tintAmount
  uniforms.composite.uGrayscale.value = props.grayscale ? 1 : 0
  uniforms.composite.uHighlight.value = hexToRGB(props.highlightColor)
  uniforms.composite.uTint.value = hexToRGB(props.tint)
}

function mountRenderer(mount: HTMLDivElement): () => void {
  const renderer = new Renderer({
    alpha: false,
    antialias: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  })
  const gl = renderer.gl
  gl.clearColor(0, 0, 0, 1)
  const canvas = gl.canvas
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  canvas.style.opacity = '0'
  mount.appendChild(canvas)

  const imageTexture = new Texture(gl, {
    generateMipmaps: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
  })

  const offsets = new Float32Array(MAX_WAVES * 2)
  const scales = new Float32Array(MAX_WAVES * 2)
  const opacities = new Float32Array(MAX_WAVES)
  const waves: Wave[] = Array.from({ length: MAX_WAVES }, () => ({
    x: 0,
    y: 0,
    scale: START_SCALE,
    target: START_SCALE,
    size: 1,
    opacity: 0,
  }))
  let currentWave = 0

  const geometry = new Geometry(gl, {
    position: { size: 2, data: new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]) },
    uv: { size: 2, data: new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]) },
    iOffset: { instanced: 1, size: 2, data: offsets },
    iScale: { instanced: 1, size: 2, data: scales },
    iOpacity: { instanced: 1, size: 1, data: opacities },
  })

  const waveUniforms: WaveUniforms = { uRings: { value: props.rings } }
  const waveProgram = new Program(gl, {
    vertex: waveVertex,
    fragment: waveFragment,
    uniforms: waveUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    cullFace: false,
  })
  waveProgram.setBlendFunc(gl.ONE, gl.ONE)
  const waveMesh = new Mesh(gl, { geometry, program: waveProgram, frustumCulled: false })

  const displacementTarget = new RenderTarget(gl, {
    width: 2,
    height: 2,
    depth: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
  })

  const compositeUniforms: CompositeUniforms = {
    uTexture: { value: imageTexture },
    uDisplacement: { value: displacementTarget.texture },
    uResolution: { value: [1, 1] },
    uTextureSize: { value: [1, 1] },
    uTexel: { value: [1, 1] },
    uTint: { value: hexToRGB(props.tint) },
    uHighlight: { value: hexToRGB(props.highlightColor) },
    uStrength: { value: props.strength },
    uSwirl: { value: props.swirl },
    uDispersion: { value: props.dispersion },
    uGlint: { value: props.glint },
    uTintAmount: { value: props.tintAmount },
    uGrayscale: { value: props.grayscale ? 1 : 0 },
  }
  const compositeMesh = new Mesh(gl, {
    geometry: new Triangle(gl),
    program: new Program(gl, {
      vertex: screenVertex,
      fragment: compositeFragment,
      uniforms: compositeUniforms,
      depthTest: false,
      depthWrite: false,
    }),
  })
  uniforms = { wave: waveUniforms, composite: compositeUniforms }

  let disposed = false
  const image = new window.Image()
  image.decoding = 'async'
  image.onload = () => {
    if (disposed) return
    imageTexture.image = image
    compositeUniforms.uTextureSize.value = [image.naturalWidth || 1, image.naturalHeight || 1]
    canvas.style.opacity = '1'
    state.value = 'interactive'
  }
  image.onerror = () => {
    if (disposed) return
    state.value = 'error'
    canvas.style.display = 'none'
  }
  image.src = props.src

  let width = 1
  let height = 1
  const resize = () => {
    width = Math.max(1, mount.clientWidth)
    height = Math.max(1, mount.clientHeight)
    renderer.setSize(width, height)
    compositeUniforms.uResolution.value = [width, height]

    const scale = QUALITY_SCALE[props.quality]
    const fieldWidth = Math.max(2, Math.round(width * scale))
    const fieldHeight = Math.max(2, Math.round(height * scale))
    displacementTarget.setSize(fieldWidth, fieldHeight)
    compositeUniforms.uTexel.value = [1 / fieldWidth, 1 / fieldHeight]
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(mount)
  resize()

  const setNewWave = (x: number, y: number, power: number) => {
    const wave = waves[currentWave]
    currentWave = (currentWave + 1) % MAX_WAVES
    wave.x = x
    wave.y = y
    wave.scale = START_SCALE * power
    wave.target = START_SCALE * Math.max(1, props.spread) * power
    wave.size = Math.max(1, props.brushSize)
    wave.opacity = 1
  }

  const localPoint = (clientX: number, clientY: number): [number, number] | null => {
    const rect = mount.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
      return null
    return [clientX - rect.left, rect.height - (clientY - rect.top)]
  }

  let previousX = 0
  let previousY = 0
  const onMove = (event: PointerEvent) => {
    if (!props.enabled || props.trigger === 'click') return
    const point = localPoint(event.clientX, event.clientY)
    if (!point) return
    const step = Math.max(1, props.spacing)
    if (Math.abs(point[0] - previousX) <= step && Math.abs(point[1] - previousY) <= step) return
    setNewWave(point[0], point[1], 1)
    previousX = point[0]
    previousY = point[1]
  }
  const onDown = (event: PointerEvent) => {
    if (!props.enabled || props.trigger === 'hover') return
    const point = localPoint(event.clientX, event.clientY)
    if (!point) return
    setNewWave(point[0], point[1], Math.max(1, props.clickStrength))
  }
  mount.addEventListener('pointermove', onMove, { passive: true })
  mount.addEventListener('pointerdown', onDown, { passive: true })

  let raf = 0
  let previousTime = 0
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    const delta = previousTime ? Math.min(0.05, (now - previousTime) / 1000) : 0
    previousTime = now
    const growth = 1 - Math.exp(-delta * 1.09)
    const decay = Math.exp((-delta * LIFE_CONSTANT) / Math.max(0.15, props.fade))

    for (let index = 0; index < MAX_WAVES; index += 1) {
      const wave = waves[index]
      if (wave.opacity <= 0) {
        opacities[index] = 0
        continue
      }

      wave.opacity *= decay
      wave.scale += (wave.target - wave.scale) * growth
      if (wave.opacity < 0.002) {
        wave.opacity = 0
        opacities[index] = 0
        continue
      }

      const half = (wave.scale * wave.size) / 2
      offsets[index * 2] = (wave.x / width) * 2 - 1
      offsets[index * 2 + 1] = (wave.y / height) * 2 - 1
      scales[index * 2] = (half / width) * 2
      scales[index * 2 + 1] = (half / height) * 2
      opacities[index] = wave.opacity
    }

    geometry.attributes.iOffset.needsUpdate = true
    geometry.attributes.iScale.needsUpdate = true
    geometry.attributes.iOpacity.needsUpdate = true
    renderer.render({ scene: waveMesh, target: displacementTarget, clear: true })
    renderer.render({ scene: compositeMesh })
  }
  raf = requestAnimationFrame(loop)

  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    resizeObserver.disconnect()
    mount.removeEventListener('pointermove', onMove)
    mount.removeEventListener('pointerdown', onDown)
    uniforms = undefined
    if (canvas.parentNode === mount) mount.removeChild(canvas)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

function startRenderer(): void {
  disposeRenderer?.()
  disposeRenderer = undefined
  uniforms = undefined
  state.value = 'static'
  if (!mountRef.value || !props.enabled || prefersStaticPresentation()) return

  try {
    disposeRenderer = mountRenderer(mountRef.value)
  } catch (error) {
    console.warn('Ripple Distortion fell back to a static image.', error)
    state.value = 'error'
  }
}

onMounted(startRenderer)

watch(() => [props.src, props.quality, props.enabled], startRenderer, { flush: 'post' })

watch(
  () => [
    props.rings,
    props.strength,
    props.swirl,
    props.dispersion,
    props.glint,
    props.tintAmount,
    props.grayscale,
    props.highlightColor,
    props.tint,
  ],
  updateUniforms,
)

onBeforeUnmount(() => {
  disposeRenderer?.()
  disposeRenderer = undefined
  state.value = 'static'
})
</script>

<template>
  <div
    ref="mountRef"
    class="ripple-distortion"
    :data-ripple-state="state"
    :style="backgroundStyle"
  />
</template>
