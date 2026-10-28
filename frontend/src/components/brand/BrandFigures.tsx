import type { CSSProperties, ReactNode } from 'react'

/**
 * Figuras del manual (págs. "Iconografía color" y "Trama de bloques de color").
 * Son un patrón repetible: cada motivo vive en una celda de 100×100 y los
 * colores salen de las variables --vcm-* (se pueden usar ambas paletas).
 * Los motivos son una reconstrucción geométrica; si la Dirección entrega el
 * set oficial en SVG, basta reemplazar el contenido de MOTIFS.
 */

type Color = 'navy' | 'blue' | 'cyan' | 'red' | 'orange' | 'pastel' | 'yellow' | 'white'
const f = (c: Color): CSSProperties => ({ fill: `var(--vcm-${c})` })

const star = (() => {
  const pts: string[] = []
  for (let i = 0; i < 24; i++) {
    const r = i % 2 === 0 ? 46 : 22
    const a = (Math.PI * 2 * i) / 24 - Math.PI / 2
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
})()

const MOTIFS: ReactNode[] = [
  // 1. cuartos de círculo
  <g key="quarters">
    <rect width="100" height="100" style={f('orange')} />
    <path d="M0 0 H50 A50 50 0 0 1 0 50 Z" style={f('red')} />
    <path d="M100 100 H50 A50 50 0 0 1 100 50 Z" style={f('red')} />
    <path d="M100 0 V50 A50 50 0 0 1 50 0 Z" style={f('pastel')} />
    <path d="M0 100 V50 A50 50 0 0 1 50 100 Z" style={f('pastel')} />
  </g>,
  // 2. zigzag
  <g key="zigzag">
    <rect width="100" height="100" style={f('cyan')} />
    <polygon points="0,38 25,18 50,38 75,18 100,38 100,58 75,38 50,58 25,38 0,58" style={f('navy')} />
    <polygon points="0,66 25,46 50,66 75,46 100,66 100,86 75,66 50,86 25,66 0,86" style={f('blue')} />
  </g>,
  // 3. triángulos
  <g key="triangles">
    <rect width="100" height="100" style={f('orange')} />
    <polygon points="50,8 92,48 8,48" style={f('red')} />
    <polygon points="50,52 92,92 8,92" style={f('red')} />
  </g>,
  // 4. semicírculos enfrentados
  <g key="halves">
    <rect width="100" height="100" style={f('cyan')} />
    <path d="M50 0 A50 50 0 0 0 50 100 Z" style={f('navy')} />
    <path d="M50 0 A50 50 0 0 1 50 100 Z" style={f('navy')} />
    <rect x="46" width="8" height="100" style={f('cyan')} />
  </g>,
  // 5. estrella
  <g key="star">
    <rect width="100" height="100" style={f('cyan')} />
    <polygon points={star} style={f('blue')} />
  </g>,
  // 6. cuatro círculos
  <g key="circles">
    <rect width="100" height="100" style={f('red')} />
    <circle cx="26" cy="26" r="24" style={f('orange')} />
    <circle cx="74" cy="26" r="24" style={f('orange')} />
    <circle cx="26" cy="74" r="24" style={f('orange')} />
    <circle cx="74" cy="74" r="24" style={f('orange')} />
  </g>,
  // 7. barras verticales
  <g key="bars">
    <rect width="100" height="100" style={f('white')} />
    <rect x="12" width="20" height="100" style={f('orange')} />
    <rect x="40" width="20" height="100" style={f('red')} />
    <rect x="68" width="20" height="100" style={f('blue')} />
  </g>,
  // 8. diana
  <g key="target">
    <rect width="100" height="100" style={f('blue')} />
    <circle cx="50" cy="50" r="46" style={f('orange')} />
    <circle cx="50" cy="50" r="34" style={f('navy')} />
    <circle cx="50" cy="50" r="22" style={f('red')} />
    <circle cx="50" cy="50" r="10" style={f('cyan')} />
  </g>,
  // 9. rombo con cuadrado
  <g key="diamond">
    <rect width="100" height="100" style={f('blue')} />
    <polygon points="50,4 96,50 50,96 4,50" style={f('orange')} />
    <rect x="30" y="30" width="40" height="40" style={f('navy')} />
    <polygon points="50,38 62,50 50,62 38,50" style={f('cyan')} />
  </g>,
  // 10. cuadrado en cuadrado
  <g key="square">
    <rect width="100" height="100" style={f('red')} />
    <rect x="22" y="22" width="56" height="56" style={f('orange')} />
  </g>,
]

/** Generador pseudoaleatorio determinista: mismo seed → mismo patrón. */
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

interface BrandPatternProps {
  cols?: number
  rows?: number
  seed?: number
  /** Alto fijo en px: la franja recorta los costados (útil para pies de página). */
  height?: number
  className?: string
}

/** Franja de figuras repetibles; sin motivos iguales contiguos. */
export function BrandPattern({ cols = 6, rows = 1, seed = 7, height, className = '' }: BrandPatternProps) {
  const rand = rng(seed)
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    grid[r] = []
    for (let c = 0; c < cols; c++) {
      let m = Math.floor(rand() * MOTIFS.length)
      while (m === grid[r][c - 1] || (r > 0 && m === grid[r - 1][c])) m = (m + 1) % MOTIFS.length
      grid[r][c] = m
    }
  }
  return (
    <div className={`vcm-figures ${className}`} style={height ? { height, overflow: 'hidden' } : undefined} aria-hidden="true">
      <svg
        viewBox={`0 0 ${cols * 100} ${rows * 100}`}
        preserveAspectRatio="xMidYMid slice"
        style={height ? { height: '100%' } : undefined}
      >
        {grid.flatMap((row, r) =>
          row.map((m, c) => (
            <g key={`${r}-${c}`} transform={`translate(${c * 100} ${r * 100})`}>
              {MOTIFS[m]}
            </g>
          )),
        )}
      </svg>
    </div>
  )
}

/**
 * Trama de bloques de color (manual, pág. "Trama de bloques de color").
 *  - frame: bloques en los bordes de toda la pantalla (login, portadas)
 *  - right: solo en el costado derecho, deja libre el texto de la izquierda (hero)
 */
export function BrandBlocks({ variant = 'frame', className = '' }: { variant?: 'frame' | 'right'; className?: string }) {
  return (
    <div className={`vcm-blocks pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {variant === 'frame' ? (
        <>
          <span className="absolute left-0 top-0 h-full w-[5%] max-sm:w-[6%]" style={bg('navy')} />
          <span className="absolute left-[5%] top-[14%] h-[12%] w-[4%] max-sm:hidden" style={bg('red')} />
          <span className="absolute left-[9%] top-[14%] h-[5%] w-[22%] max-sm:hidden" style={bg('orange')} />
          <span className="absolute left-[5%] top-[26%] h-[26%] w-[4%] max-sm:hidden" style={bg('cyan')} />
          <span className="absolute right-0 top-0 h-[20%] w-[7%]" style={bg('orange')} />
          <span className="absolute right-0 top-[20%] h-[24%] w-[7%]" style={bg('red')} />
          <span className="absolute bottom-0 right-0 h-[12%] w-[24%]" style={bg('cyan')} />
          <span className="absolute bottom-0 right-[24%] h-[12%] w-[7%]" style={bg('navy')} />
        </>
      ) : (
        <>
          <span className="absolute right-0 top-0 h-[26%] w-[7%]" style={bg('orange')} />
          <span className="absolute right-0 top-[26%] h-[30%] w-[7%]" style={bg('red')} />
          <span className="absolute bottom-0 right-0 h-[16%] w-[18%]" style={bg('cyan')} />
          <span className="absolute bottom-0 right-[18%] h-[16%] w-[6%]" style={bg('navy')} />
        </>
      )}
    </div>
  )
}

const bg = (c: Color): CSSProperties => ({ backgroundColor: `var(--vcm-${c})` })
