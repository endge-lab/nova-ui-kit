export interface NovaUiRgbaColor {
  r: number
  g: number
  b: number
  a: number
}

export interface NovaUiHsvaColor {
  h: number
  s: number
  v: number
  a: number
}

export function clampColorChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function clampAlpha(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100))
}

export function parseHexColor(value: string): NovaUiRgbaColor | null {
  const raw = value.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(raw)) return null
  const full = raw.length === 3
    ? raw.split('').map(char => `${char}${char}`).join('')
    : raw
  const r = Number.parseInt(full.slice(0, 2), 16)
  const g = Number.parseInt(full.slice(2, 4), 16)
  const b = Number.parseInt(full.slice(4, 6), 16)
  const a = full.length === 8 ? clampAlpha(Number.parseInt(full.slice(6, 8), 16) / 255) : 1
  return { r, g, b, a }
}

export function parseRgbaColor(value: string): NovaUiRgbaColor | null {
  const match = value.trim().match(/^rgba?\(([^)]+)\)$/i)
  if (!match) return null
  const parts = match[1]?.split(',').map(part => part.trim()) ?? []
  if (parts.length !== 3 && parts.length !== 4) return null
  const r = Number(parts[0])
  const g = Number(parts[1])
  const b = Number(parts[2])
  const a = parts.length === 4 ? Number(parts[3]) : 1
  if (![r, g, b, a].every(Number.isFinite)) return null
  return {
    r: clampColorChannel(r),
    g: clampColorChannel(g),
    b: clampColorChannel(b),
    a: clampAlpha(a),
  }
}

export function parseNovaUiColor(value: string): NovaUiRgbaColor | null {
  return parseHexColor(value) ?? parseRgbaColor(value)
}

export function formatNovaUiColor(color: NovaUiRgbaColor): string {
  const r = clampColorChannel(color.r)
  const g = clampColorChannel(color.g)
  const b = clampColorChannel(color.b)
  const a = clampAlpha(color.a)
  if (a < 1) return `rgba(${r}, ${g}, ${b}, ${a})`
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function formatHexColor(color: NovaUiRgbaColor, includeAlpha = false): string {
  const alpha = includeAlpha && clampAlpha(color.a) < 1
    ? toHex(Math.round(clampAlpha(color.a) * 255))
    : ''
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}${alpha}`
}

export function formatRgbaColor(color: NovaUiRgbaColor): string {
  return `rgba(${clampColorChannel(color.r)}, ${clampColorChannel(color.g)}, ${clampColorChannel(color.b)}, ${clampAlpha(color.a)})`
}

export function hsvaToRgba(color: NovaUiHsvaColor): NovaUiRgbaColor {
  const hue = ((color.h % 360) + 360) % 360
  const saturation = Math.max(0, Math.min(1, color.s))
  const value = Math.max(0, Math.min(1, color.v))
  const chroma = value * saturation
  const huePrime = hue / 60
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1))
  const m = value - chroma
  const [r1, g1, b1] = huePrime < 1
    ? [chroma, x, 0]
    : huePrime < 2
      ? [x, chroma, 0]
      : huePrime < 3
        ? [0, chroma, x]
        : huePrime < 4
          ? [0, x, chroma]
          : huePrime < 5
            ? [x, 0, chroma]
            : [chroma, 0, x]
  return {
    r: clampColorChannel((r1 + m) * 255),
    g: clampColorChannel((g1 + m) * 255),
    b: clampColorChannel((b1 + m) * 255),
    a: clampAlpha(color.a),
  }
}

export function rgbaToHsva(color: NovaUiRgbaColor): NovaUiHsvaColor {
  const r = clampColorChannel(color.r) / 255
  const g = clampColorChannel(color.g) / 255
  const b = clampColorChannel(color.b) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const h = delta === 0
    ? 0
    : max === r
      ? 60 * (((g - b) / delta) % 6)
      : max === g
        ? 60 * ((b - r) / delta + 2)
        : 60 * ((r - g) / delta + 4)
  return {
    h: ((h % 360) + 360) % 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
    a: clampAlpha(color.a),
  }
}

export function normalizeNovaUiColor(value: string, fallback = '#ffffff'): string {
  return formatNovaUiColor(parseNovaUiColor(value) ?? parseNovaUiColor(fallback) ?? { r: 255, g: 255, b: 255, a: 1 })
}

function toHex(value: number): string {
  return clampColorChannel(value).toString(16).padStart(2, '0')
}
