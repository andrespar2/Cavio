import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Compass, Home, LogIn } from 'lucide-react'
import { Brand } from '../components/Brand'
import { Button } from '../components/ui/Button'

export function NotFound() {
  const location = useLocation()

  useEffect(() => {
    document.title = 'Página no encontrada · CAVIO'
  }, [])

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-5 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-lime/[0.06] blur-[120px]" />
      </div>
      <Brand size="lg" />
      <span className="mt-8 grid h-14 w-14 place-items-center rounded-2xl border border-lime/20 bg-lime/[0.07] text-lime">
        <Compass size={26} />
      </span>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-lime/70">Error 404</p>
      <h1 className="mt-2 text-[clamp(1.8rem,5vw,2.6rem)] font-semibold tracking-tight text-white">
        Esta ruta no existe
      </h1>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/40">
        No encontramos <span className="text-white/60">{location.pathname}</span>. Puede que el enlace esté
        incompleto o que la pantalla haya cambiado de nombre.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link to="/">
          <Button size="md" icon={<Home size={15} />}>
            Ir al inicio
          </Button>
        </Link>
        <Link to="/login">
          <Button size="md" variant="secondary" icon={<LogIn size={15} />}>
            Iniciar sesión
          </Button>
        </Link>
      </div>
    </div>
  )
}
