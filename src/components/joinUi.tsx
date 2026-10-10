import type { KeyboardEventHandler, ReactNode, Ref } from 'react'

// Solo se muestra un paso a la vez: los campos usan este id como nombre accesible.
export const STEP_TITLE_ID = 'join-step-title'

export const Screen = ({ children }: { children: ReactNode }) => (
  <div className="animate-[eliStepIn_480ms_cubic-bezier(0.22,1,0.36,1)]">
    {children}
  </div>
)

export const Title = ({ children }: { children: ReactNode }) => (
  <h1
    className="flex animate-[eliTextIn_580ms_cubic-bezier(0.22,1,0.36,1)] flex-col text-[2.65rem] leading-[0.98] tracking-[-0.045em] text-zinc-950"
    id={STEP_TITLE_ID}
  >
    {children}
  </h1>
)

export const LineInput = ({
  autoComplete,
  inputMode,
  inputRef,
  onChange,
  onKeyDown,
  placeholder,
  type = 'text',
  value,
}: {
  autoComplete?: string
  inputMode?: 'numeric'
  inputRef: Ref<HTMLInputElement>
  onChange: (value: string) => void
  onKeyDown: KeyboardEventHandler<HTMLInputElement>
  placeholder: string
  type?: string
  value: string
}) => (
  <input
    aria-labelledby={STEP_TITLE_ID}
    autoComplete={autoComplete}
    className="mt-12 w-full border-0 border-b border-zinc-300 bg-transparent pb-3 text-2xl font-[100] text-zinc-950 transition outline-none placeholder:text-zinc-300 focus:border-[#2346DD]"
    inputMode={inputMode}
    onChange={event => onChange(event.target.value)}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    ref={inputRef}
    type={type}
    value={value}
  />
)

export const CircleButton = ({
  children,
  disabled = false,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) => (
  <button
    className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2346DD] text-2xl font-[100] text-white transition hover:scale-[1.05] disabled:opacity-30"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
)

export const ContinueButton = ({
  disabled,
  onClick,
}: {
  disabled: boolean
  onClick: () => void
}) => (
  <div className="mt-8 flex items-center justify-end gap-4">
    <CircleButton disabled={disabled} onClick={onClick}>
      →
    </CircleButton>

    <span className="text-xs font-[100] text-zinc-400">ENTER ↵</span>
  </div>
)

// Toda la fila es tocable (el ::after del botón la cubre) y el texto oculto dice qué se cambia.
export const Review = ({
  children,
  label,
  onChange,
}: {
  children: ReactNode
  label: string
  onChange: () => void
}) => (
  <div className="relative border-b border-zinc-100 pb-3">
    <div className="flex items-center justify-between text-[0.7rem] font-medium tracking-[0.16em] uppercase">
      <span className="text-zinc-400">{label}</span>

      <button
        className="text-[#2346DD] uppercase after:absolute after:inset-0"
        onClick={onChange}
        type="button"
      >
        Cambiar<span className="sr-only"> {label.toLowerCase()}</span>
      </button>
    </div>

    <div className="mt-1 text-lg font-[100] text-zinc-900">{children}</div>
  </div>
)
