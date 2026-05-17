import { useEffect, useRef } from 'react'
import type { Settings } from '../hooks/useSettings'

const CHARS = ' .,-~:;=!*#'
const CW = 8
const CH = 14
const SPEED = 0.38
const FREQ = 0.26
const THR = 0.21
const ORB = 0.26

// RGB color per variant — matched to each theme's accent/surface palette
const VARIANT_RGB: Record<Settings['variant'], [number, number, number]> = {
  tactical: [140, 200, 240],  // blue-cyan
  carbon:   [120, 240, 180],  // phosphor green
  sentinel: [255, 200, 130],  // amber
  vault:    [200, 210, 225],  // graphite silver
}

export function MoireBackground({ variant }: { variant: Settings['variant'] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const colorRef  = useRef<[number, number, number]>(VARIANT_RGB[variant])

  // Keep colorRef in sync without restarting the RAF loop
  useEffect(() => {
    colorRef.current = VARIANT_RGB[variant] ?? VARIANT_RGB.tactical
  }, [variant])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cols = 0, rows = 0, t = 0, rafId = 0

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols = Math.floor(canvas.width / CW)
      rows = Math.floor(canvas.height / CH)
      ctx.font = `${CW}px monospace`
      ctx.textBaseline = 'top'
    }

    function draw() {
      t += 0.016 * SPEED
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const nx = cols * 0.5 + Math.cos(t * 0.3)    * cols * ORB
      const ny = rows * 0.5 + Math.sin(t * 0.4)    * rows * ORB
      const ix = cols * 0.5 + Math.cos(t * 0.37+2) * cols * (ORB * 0.83)
      const iy = rows * 0.5 + Math.sin(t * 0.29+2) * rows * (ORB * 1.17)
      const sx = cols * 0.5 + Math.sin(t * 0.23+4) * cols * (ORB * 1.17)
      const sy = rows * 0.5 + Math.cos(t * 0.31+4) * rows * (ORB * 0.83)

      const f1 = FREQ, f2 = FREQ * 1.033, f3 = FREQ * 0.967
      const [r, g, b] = colorRef.current

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const fx = col * 0.55
          const d1 = Math.sqrt((fx - nx*0.55)**2 + (row - ny)**2)
          const d2 = Math.sqrt((fx - ix*0.55)**2 + (row - iy)**2)
          const d3 = Math.sqrt((fx - sx*0.55)**2 + (row - sy)**2)

          const C = (Math.sin(d1*f1 + t) + Math.sin(d2*f2 - t*0.7) + Math.sin(d3*f3 + t*0.5) + 3) / 6
          if (C < THR || C > 1 - THR) continue

          const w = 1 - Math.abs(C - 0.5) * 2
          const ch = CHARS[Math.min(CHARS.length - 1, (w * CHARS.length) | 0)]
          if (ch === ' ') continue

          ctx.fillStyle = `rgba(${r},${g},${b},${0.12 + w * 0.28})`
          ctx.fillText(ch, col * CW, row * CH)
        }
      }

      rafId = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    draw()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="chr-moire"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}
