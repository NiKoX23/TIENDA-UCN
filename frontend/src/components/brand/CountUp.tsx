import { useEffect, useState } from 'react'

const NUMERO = /\d[\d.,]*/

/**
 * Anima un valor ya formateado ("1.962.030", "$12.000", "52,1 %") contando
 * desde 0. Conserva prefijo, sufijo y decimales del texto; al terminar muestra
 * exactamente el texto original. Respeta prefers-reduced-motion.
 */
export default function CountUp({ texto, duracion = 900 }: { texto: string; duracion?: number }) {
  const [mostrado, setMostrado] = useState(texto)

  useEffect(() => {
    const coincidencia = NUMERO.exec(texto)
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!coincidencia || sinMovimiento) {
      setMostrado(texto)
      return
    }

    const bruto = coincidencia[0]
    const coma = bruto.lastIndexOf(',')
    const decimales = coma >= 0 ? bruto.length - coma - 1 : 0
    const objetivo = Number(bruto.replace(/\./g, '').replace(',', '.'))
    if (!Number.isFinite(objetivo) || objetivo === 0) {
      setMostrado(texto)
      return
    }

    const formato = new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
      useGrouping: true,
    })
    let cuadro = 0
    let inicio: number | undefined

    const paso = (ahora: number) => {
      inicio ??= ahora
      const progreso = Math.min((ahora - inicio) / duracion, 1)
      const suavizado = 1 - (1 - progreso) ** 3
      setMostrado(progreso < 1 ? texto.replace(bruto, formato.format(objetivo * suavizado)) : texto)
      if (progreso < 1) cuadro = window.requestAnimationFrame(paso)
    }

    setMostrado(texto.replace(bruto, formato.format(0)))
    cuadro = window.requestAnimationFrame(paso)
    return () => window.cancelAnimationFrame(cuadro)
  }, [texto, duracion])

  return (
    <>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">{mostrado}</span>
    </>
  )
}
