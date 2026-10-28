import type { CSSProperties, ReactNode } from 'react'
import vcmColor from '../../assets/brand/vcm-color.svg'
import vcmOnDark from '../../assets/brand/vcm-on-dark.svg'
import vcmWhite from '../../assets/brand/vcm-white.svg'
import vcmWarm from '../../assets/brand/vcm-warm.svg'

/**
 * Variantes del manual (pág. "Aplicaciones Logo sobre Fondo"):
 *  - color:   fondo gris/blanco     → isotipo azul + celeste, texto azul oscuro
 *  - on-dark: fondo azul oscuro     → isotipo azul + celeste, punto y texto blancos
 *  - white:   fondo naranja/rojo/foto → todo blanco
 *  - warm:    fondo pastel/blanco   → isotipo rojo + naranja, texto azul oscuro
 *  - auto:    elige on-dark (tema oscuro) o warm (tema claro) por CSS
 *  - auto-gradient: para fondos con gradiente; blanco (tema oscuro) o warm (tema claro).
 *    Evita que la "V" azul se pierda sobre el degradado azul del tema oscuro.
 */
export type VcmLogoVariant = 'auto' | 'auto-gradient' | 'color' | 'on-dark' | 'white' | 'warm'

const SRC: Record<Exclude<VcmLogoVariant, 'auto' | 'auto-gradient'>, string> = {
  color: vcmColor,
  'on-dark': vcmOnDark,
  white: vcmWhite,
  warm: vcmWarm,
}

const ALT = 'Dirección General de Vinculación con el Medio'

interface BrandLogoProps {
  variant?: VcmLogoVariant
  /** Alto del logo en px. El ancho se calcula solo (no deformar el logo). */
  height?: number
  className?: string
}

export function BrandLogo({ variant = 'auto', height = 48, className = '' }: BrandLogoProps) {
  const style = { '--vcm-logo-h': `${height}px` } as CSSProperties

  if (variant === 'auto' || variant === 'auto-gradient') {
    const oscuro = variant === 'auto' ? SRC['on-dark'] : SRC.white
    return (
      <span className={className} style={style}>
        <img className="vcm-logo vcm-logo--auto-dark" src={oscuro} alt={ALT} />
        <img className="vcm-logo vcm-logo--auto-light" src={SRC.warm} alt={ALT} />
      </span>
    )
  }
  return <img className={`vcm-logo ${className}`} style={style} src={SRC[variant]} alt={ALT} />
}

interface BrandLockupProps extends BrandLogoProps {
  /** Otro logo (p. ej. escudo UCN). Va a la derecha, mismo tamaño visual, separación 2x. */
  partner: ReactNode
}

export function BrandLockup({ partner, variant = 'auto', height = 48, className = '' }: BrandLockupProps) {
  const style = { '--vcm-logo-h': `${height}px` } as CSSProperties
  return (
    <div className={`vcm-lockup ${className}`} style={style}>
      <BrandLogo variant={variant} height={height} />
      {partner}
    </div>
  )
}
