import { Search, X } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

// ============================================================
// CAVIO — Campos de formulario accesibles y adaptables
// ============================================================

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
  htmlFor?: string
}

export function Field({ label, hint, error, required, children, className, htmlFor }: FieldProps) {
  return (
    <div className={clsx('min-w-0', className)}>
      {label && (
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required && <span className="ml-1 text-lime/80">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs leading-snug text-red-300">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-snug text-white/35">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  suffix?: ReactNode
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon, suffix, className, invalid, ...rest },
  ref,
) {
  return (
    <div className="relative min-w-0">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(
          'input-base',
          icon && 'pl-11',
          suffix && 'pr-12',
          invalid && 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/10',
          className,
        )}
        {...rest}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">{suffix}</span>
      )}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(
        'input-base min-h-[96px] resize-y py-3',
        invalid && 'border-red-500/50',
        className,
      )}
      {...rest}
    />
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, invalid, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx('input-base appearance-none pr-10', invalid && 'border-red-500/50', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
      }}
      {...rest}
    >
      {children}
    </select>
  )
})

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', className, ariaLabel }: SearchInputProps) {
  return (
    <div className={clsx('relative min-w-0', className)}>
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="input-base pl-10 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
          aria-label="Limpiar búsqueda"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export function MoneyInput({
  value,
  onChange,
  min = 1000,
  max,
  step = 100,
  disabled,
  id,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  id?: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.max(min, value - step))}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-lg font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
        aria-label="Disminuir tarifa"
      >
        −
      </button>
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/40">$</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={value || ''}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          onBlur={() => onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, value)))}
          className="input-base pl-8 text-center text-lg font-semibold tabular-nums"
          aria-label="Tarifa propuesta en pesos colombianos"
        />
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, value + step))}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-lg font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
        aria-label="Aumentar tarifa"
      >
        +
      </button>
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition hover:bg-white/[0.04]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-white/25 bg-[#111] checked:border-lime checked:bg-lime checked:bg-[image:var(--check)] focus-visible:outline-none"
        style={{
          ['--check' as string]:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E\")",
          backgroundSize: '13px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-white/85">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-white/40">{hint}</span>}
      </span>
    </label>
  )
}
