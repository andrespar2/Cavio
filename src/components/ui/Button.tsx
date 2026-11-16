import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-lime text-black font-semibold hover:bg-[#d3ff7f] active:bg-[#b6e55d] shadow-[0_10px_30px_-12px_rgba(198,243,107,0.55)] disabled:bg-lime/40 disabled:text-black/50',
  secondary:
    'bg-white/[0.07] text-white border border-white/10 hover:bg-white/[0.11] active:bg-white/[0.09] disabled:opacity-40',
  ghost: 'bg-transparent text-white/75 hover:bg-white/[0.07] hover:text-white disabled:opacity-40',
  danger:
    'bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25 active:bg-red-500/20 disabled:opacity-40',
  outline:
    'bg-transparent text-white border border-white/15 hover:border-white/30 hover:bg-white/[0.04] disabled:opacity-40',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-xl gap-1.5',
  md: 'h-11 px-4 text-[14px] rounded-2xl gap-2',
  lg: 'h-[52px] px-5 text-[15px] rounded-2xl gap-2.5',
  icon: 'h-10 w-10 rounded-xl justify-center',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'tap inline-flex select-none items-center justify-center whitespace-nowrap transition-all duration-150',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={17} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
