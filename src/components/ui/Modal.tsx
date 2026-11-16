import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Button } from './Button'

// ============================================================
// CAVIO — Modales accesibles (bottom sheet en móvil)
// ============================================================

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
  hideClose?: boolean
}

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  hideClose = false,
}: ModalProps) {
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Ajuste al teclado virtual: el modal se limita al área visible real.
  useEffect(() => {
    if (!open) {
      setViewport(null)
      return
    }
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setViewport({ height: vv.height, top: vv.offsetTop })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-x-0 z-[2000] flex items-end justify-center sm:items-center sm:p-6"
      style={{
        top: viewport?.top ?? 0,
        height: viewport?.height ?? '100dvh',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Ventana de CAVIO'}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => closeOnBackdrop && onClose()}
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm animate-fade-in"
        tabIndex={-1}
      />
      <div
        className={clsx(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-white/10 bg-[#0c0c0c] shadow-glass animate-slide-up sm:animate-fade-up sm:rounded-3xl',
          'rounded-t-[28px]',
          SIZES[size],
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" />
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              {title && <h2 className="text-lg font-semibold leading-tight text-white sm:text-xl">{title}</h2>}
              {description && <p className="mt-1 text-[13px] leading-relaxed text-white/45">{description}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar ventana"
              >
                <X size={17} />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-white/[0.07] bg-[#0c0c0c] px-5 py-3.5 pb-[max(env(safe-area-inset-bottom,0px),0.875rem)] sm:px-6 sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  requireReason = false,
  reasonLabel = 'Motivo (opcional)',
  reasonPlaceholder = 'Escribe el motivo…',
  loading = false,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={null}
      hideClose
      closeOnBackdrop={!loading}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => onConfirm(reason.trim())}
            loading={loading}
            disabled={requireReason && reason.trim().length < 4}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="pt-1">
        <div
          className={clsx(
            'mb-4 grid h-12 w-12 place-items-center rounded-2xl',
            danger ? 'bg-red-500/15 text-red-300' : 'bg-lime/15 text-lime',
          )}
        >
          <AlertTriangle size={22} />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">{description}</p>
        {requireReason && (
          <div className="mt-4">
            <label htmlFor="confirm-reason" className="field-label">
              {reasonLabel}
            </label>
            <textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              className="input-base resize-none"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
