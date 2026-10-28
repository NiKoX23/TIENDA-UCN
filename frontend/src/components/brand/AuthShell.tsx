import type { FormEventHandler, ReactNode } from 'react'
import BackToStore from '../BackToStore'
import escudoUcn from '../../assets/icons/Escudo-UCN.png'
import { BrandLockup } from './BrandLogo'
import { BrandBlocks } from './BrandFigures'

interface AuthShellProps {
  title: string
  onSubmit: FormEventHandler<HTMLFormElement>
  children: ReactNode
}

/**
 * Marco común de login y registro: gradiente del tema, trama de bloques de color,
 * tarjeta central y logo VcM abajo (el manual lo ubica arriba o abajo de la página)
 * junto al escudo UCN, con separación 2x.
 */
export default function AuthShell({ title, onSubmit, children }: AuthShellProps) {
  return (
    <div className="vcm-auth">
      <BrandBlocks variant="frame" />
      <BackToStore className="fixed left-5 top-5 z-10 max-[480px]:left-3 max-[480px]:top-3" />

      <form className="vcm-card vcm-auth-card flex flex-col gap-4" onSubmit={onSubmit}>
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight">{title}</h1>
        {children}
      </form>

      <div className="absolute bottom-6 left-0 right-0 z-[1] flex justify-center px-4">
        <BrandLockup
          variant="auto-gradient"
          height={56}
          partner={<img src={escudoUcn} alt="Universidad Católica del Norte" />}
        />
      </div>
    </div>
  )
}
