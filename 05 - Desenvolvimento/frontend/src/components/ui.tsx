import { useEffect, useId, useRef, type ReactNode, type InputHTMLAttributes } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { OrderStatus } from '../lib/types';
import { STATUS_LABEL } from '../lib/format';

export function Modal({ title, open, onClose, children, wide }: { title: string; open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])');
    first?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-b-box ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-display text-[20px] font-bold">{title}</h2>
          <button data-close aria-label="Fechar" onClick={onClose} className="rounded-ctl border-2 border-ink p-1 hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  RECEBIDO: 'bg-mustard text-ink',
  EM_PREPARACAO: 'bg-primary text-ink',
  EM_TRANSPORTE: 'bg-secondary text-cream',
  ENTREGUE: 'bg-success text-cream',
  CANCELADO: 'bg-danger text-cream',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}
export function Field({ label, hint, error, className = '', ...rest }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {rest.required ? <span className="text-danger"> *</span> : null}
      </label>
      <input id={id} className="input" aria-invalid={!!error} aria-describedby={hint || error ? `${id}-h` : undefined} {...rest} />
      {error ? (
        <p id={`${id}-h`} className="mt-1 text-[12px] font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-h`} className="mt-1 text-[12px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 font-mono text-[12px] uppercase text-on-app-muted" role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card border-dashed p-6 text-center">
      <p className="font-display text-[18px] font-bold">{title}</p>
      {children ? <div className="mt-2 text-[13px] text-muted">{children}</div> : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-ctl border-2 border-danger bg-[#fbe4e1] px-3 py-2 text-[13px] font-semibold text-danger">
      {message}
    </p>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 99, disabled }: { value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center rounded-ctl border-2 border-ink bg-white">
      <button type="button" className="px-2 py-1 font-mono font-bold disabled:opacity-30" aria-label="Diminuir quantidade" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="min-w-[2ch] px-1 text-center font-mono text-[13px] font-bold" aria-live="polite">
        {value}
      </span>
      <button type="button" className="px-2 py-1 font-mono font-bold disabled:opacity-30" aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
