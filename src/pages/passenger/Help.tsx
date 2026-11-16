import { useState } from 'react'
import { ChevronDown, LifeBuoy, Mail, MessageSquare, Phone, Send, ShieldCheck, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { useCavio } from '../../store/store'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { Field, Select, Textarea } from '../../components/ui/Field'
import { useToast } from '../../hooks/useToast'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'

// ============================================================
// CAVIO — Centro de ayuda del pasajero
// ============================================================

const FAQS = [
  {
    q: '¿Cómo funciona la negociación de tarifas?',
    a: 'CAVIO te muestra una tarifa sugerida. Puedes ajustarla antes de solicitar el viaje. Los conductores cercanos pueden aceptarla o enviarte una contraoferta. Tú decides qué oferta aceptar.',
  },
  {
    q: '¿Qué pasa si ningún conductor acepta mi tarifa?',
    a: 'Puedes esperar nuevas ofertas, cancelar la solicitud y proponer una tarifa diferente. En el prototipo, el botón “Simular” hace que conductores DEMO envíen ofertas automáticamente.',
  },
  {
    q: '¿La ubicación es real?',
    a: 'Si concedes permiso, CAVIO usa la ubicación real del dispositivo mediante el navegador. Si lo niegas o no está disponible, puedes elegir el origen manualmente o usar una ubicación DEMO claramente identificada.',
  },
  {
    q: '¿Puedo llamar o escribir al conductor?',
    a: 'En este prototipo los botones de llamada, mensaje y compartir son demostrativos. En producción se integrarían con servicios de comunicación y enmascaramiento de números.',
  },
  {
    q: '¿Se realizan cobros reales?',
    a: 'No. Todos los pagos, tarifas, comisiones y ganancias son DEMO. No se solicita ni almacena información financiera real.',
  },
  {
    q: '¿Mis datos se comparten?',
    a: 'Los datos DEMO se guardan en el almacenamiento local de tu navegador. No se envían a un backend. Las consultas de mapas y direcciones usan OpenStreetMap/CARTO y pueden requerir conexión.',
  },
  {
    q: '¿Cómo instalo CAVIO?',
    a: 'En navegadores compatibles aparece la opción “Instalar CAVIO”. También puedes usar el menú del navegador y elegir “Agregar a pantalla de inicio”. En Android se instala como PWA.',
  },
]

export function PassengerHelp() {
  const { state, currentUser } = useCavio()
  const { toast } = useToast()
  const { canInstall, install } = useInstallPrompt()
  const [open, setOpen] = useState<number | null>(0)
  const [subject, setSubject] = useState('viaje')
  const [message, setMessage] = useState('')
  const [ticket, setTicket] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const submit = () => {
    if (message.trim().length < 10) {
      toast('Cuéntanos un poco más (mínimo 10 caracteres).', 'error')
      return
    }
    setSending(true)
    const code = `CAV-${Math.floor(100000 + Math.random() * 900000)}`
    try {
      const key = 'cavio.support.v1'
      const previous = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]
      previous.push({
        code,
        subject,
        message: message.trim(),
        userId: currentUser?.id,
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem(key, JSON.stringify(previous.slice(-50)))
      setTicket(code)
      setMessage('')
      toast('Solicitud de soporte DEMO registrada en este dispositivo.', 'success')
    } catch {
      toast('No pudimos guardar la solicitud en este navegador.', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Ayuda y soporte"
        subtitle="Respuestas claras y canales de contacto de demostración."
        badge={<DemoBadge label="Soporte DEMO" />}
        actions={
          canInstall ? (
            <Button variant="secondary" size="sm" icon={<Sparkles size={14} />} onClick={() => void install()}>
              Instalar CAVIO
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2.5">
          <p className="section-title">Preguntas frecuentes</p>
          {FAQS.map((faq, index) => {
            const isOpen = open === index
            return (
              <div
                key={faq.q}
                className={clsx(
                  'overflow-hidden rounded-2xl border transition',
                  isOpen ? 'border-lime/20 bg-lime/[0.035]' : 'border-white/[0.07] bg-[#0a0a0a]',
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="min-w-0 flex-1 text-[13.5px] font-medium text-white/85">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={clsx('shrink-0 text-white/30 transition-transform', isOpen && 'rotate-180 text-lime')}
                  />
                </button>
                {isOpen && (
                  <p className="px-4 pb-4 text-[12.5px] leading-relaxed text-white/45 animate-fade-in">{faq.a}</p>
                )}
              </div>
            )
          })}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <a
              href={`tel:${state.settings.supportPhone.replace(/\s/g, '')}`}
              className="card-hover rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4 text-center"
            >
              <Phone size={18} className="mx-auto text-lime" />
              <p className="mt-2 text-[12.5px] font-medium text-white/80">Llamar a soporte</p>
              <p className="mt-0.5 text-[10.5px] text-white/30">{state.settings.supportPhone}</p>
              <p className="mt-1 text-[9.5px] text-amber-200/40">Número DEMO</p>
            </a>
            <a
              href={`mailto:${state.settings.supportEmail}`}
              className="card-hover rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4 text-center"
            >
              <Mail size={18} className="mx-auto text-lime" />
              <p className="mt-2 text-[12.5px] font-medium text-white/80">Escribir correo</p>
              <p className="mt-0.5 truncate text-[10.5px] text-white/30">{state.settings.supportEmail}</p>
              <p className="mt-1 text-[9.5px] text-amber-200/40">Correo DEMO</p>
            </a>
            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4 text-center">
              <ShieldCheck size={18} className="mx-auto text-lime" />
              <p className="mt-2 text-[12.5px] font-medium text-white/80">Viaje seguro</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-white/30">
                Verifica placa y conductor antes de subir.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <MessageSquare size={15} className="text-lime" /> Enviar una solicitud
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/35">
              Guardaremos tu mensaje en este dispositivo y te daremos un código de radicado DEMO.
            </p>
            <div className="mt-3 space-y-3">
              <Field label="Tema">
                <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="viaje">Un problema con un viaje</option>
                  <option value="pago">Dudas sobre pagos DEMO</option>
                  <option value="cuenta">Mi cuenta</option>
                  <option value="ubicacion">Ubicación y mapas</option>
                  <option value="otro">Otro tema</option>
                </Select>
              </Field>
              <Field label="Mensaje" required hint="Mínimo 10 caracteres. No incluyas datos sensibles.">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Cuéntanos qué sucedió…"
                  rows={4}
                  maxLength={600}
                />
              </Field>
              <Button fullWidth onClick={submit} loading={sending} icon={<Send size={14} />} disabled={message.trim().length < 10}>
                Registrar solicitud
              </Button>
              {ticket && (
                <div className="rounded-xl border border-lime/20 bg-lime/[0.06] px-3 py-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-lime/60">Radicado DEMO</p>
                  <p className="mt-0.5 text-[15px] font-semibold tracking-wide text-lime">{ticket}</p>
                  <p className="mt-0.5 text-[10px] text-white/30">Guardado localmente en este dispositivo.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4">
            <p className="flex items-center gap-2 text-[13px] font-medium text-white/80">
              <LifeBuoy size={14} className="text-lime" /> Horario de atención
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/35">
              Lunes a domingo, 6:00 a. m. a 11:00 p. m. (horario DEMO de referencia).
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/20">
              Los canales de soporte no están conectados en el prototipo. No se prometen tiempos de respuesta.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
