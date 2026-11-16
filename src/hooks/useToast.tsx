import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

// ============================================================
// CAVIO — Notificaciones tipo toast
// ============================================================

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    counter.current += 1
    const id = counter.current
    setToasts((t) => [...t.slice(-2), { id, message, kind }])
    window.setTimeout(() => remove(id), 4200)
  }, [remove])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[3000] flex flex-col items-center gap-2 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        role="status"
        aria-live="polite"
      >
        {toasts.map((item) => {
          const Icon = item.kind === 'success' ? CheckCircle2 : item.kind === 'error' ? AlertTriangle : Info
          return (
            <div
              key={item.id}
              className="glass pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 shadow-glass animate-fade-up"
            >
              <Icon
                size={18}
                className={
                  item.kind === 'success'
                    ? 'mt-0.5 shrink-0 text-lime'
                    : item.kind === 'error'
                      ? 'mt-0.5 shrink-0 text-red-400'
                      : 'mt-0.5 shrink-0 text-sky-300'
                }
              />
              <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-white/90">{item.message}</p>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="shrink-0 rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar notificación"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

/** Mantiene un toast de error con temporizador controlado. */
export function useTransientMessage(): [string | null, (value: string | null) => void] {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 5000)
    return () => window.clearTimeout(timer)
  }, [message])
  return [message, setMessage]
}
