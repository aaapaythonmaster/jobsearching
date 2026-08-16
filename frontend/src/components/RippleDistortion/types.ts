export type RippleTrigger = 'hover' | 'click' | 'both'
export type RippleQuality = 'low' | 'medium' | 'high'

export interface RippleDistortionProps {
  src: string
  brushSize?: number
  strength?: number
  swirl?: number
  rings?: number
  spread?: number
  fade?: number
  spacing?: number
  dispersion?: number
  glint?: number
  tint?: string
  tintAmount?: number
  grayscale?: boolean
  highlightColor?: string
  trigger?: RippleTrigger
  clickStrength?: number
  quality?: RippleQuality
  enabled?: boolean
}
