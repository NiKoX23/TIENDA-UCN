import type { FormEventHandler, ReactNode } from 'react'
import BackToStore from '../BackToStore'
import escudoUcn from '../../assets/icons/Escudo-UCN.png'
import { BrandLockup, BrandLogo } from './BrandLogo'
import { BrandBlocks, PatternStrip } from './BrandFigures'

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
      <BackToStore className="fixed left-5 top-5 z-10 max-[480px]:left-3 max-[480px]:top-3" />

      <section className="vcm-auth-brand" aria-label="Tienda oficial UCN Coquimbo">
        <BrandBlocks variant="login" />
        <div className="vcm-auth-brand__content">
          <BrandLogo variant="white" height={74} />
          <p className="vcm-eyebrow">Tienda oficial · UCN Coquimbo</p>
          <h2>Lleva la UCN contigo, todos los días.</h2>
          <p>Inicia sesión para reservar polerones, accesorios y papelería oficial, y retirarlos en sede Coquimbo.</p>
        </div>
        <PatternStrip cols={7} height={48} seed={9} className="vcm-auth-brand__pattern" />
      </section>

      <section className="vcm-auth-main">
        <form className="vcm-card vcm-auth-card flex flex-col gap-4" onSubmit={onSubmit}>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight">{title}</h1>
          {children}
        </form>

        <div className="vcm-auth-lockup">
          <BrandLockup
            variant="auto-gradient"
            height={56}
            partner={<img src={escudoUcn} alt="Universidad Católica del Norte" />}
          />
        </div>
      </section>
    </div>
  )
}
