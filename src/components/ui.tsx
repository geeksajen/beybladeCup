import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'neon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on hover:brightness-110 disabled:bg-line disabled:text-ink-muted',
  secondary: 'bg-line text-ink hover:bg-line-strong disabled:opacity-50',
  danger: 'bg-danger text-on hover:brightness-110 disabled:opacity-50',
  ghost: 'bg-transparent text-ink hover:bg-raised disabled:opacity-50',
  neon:
    'bg-gradient-to-r from-accent to-primary text-on shadow-[0_4px_18px_rgb(var(--accent)/0.35)] hover:brightness-110 disabled:opacity-50',
};

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-xl px-4 py-2.5 font-bold transition active:scale-[0.98] disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-sm p-4 ${className}`}>{children}</div>;
}

export function Field({
  label,
  hint,
  error,
  required,
  group,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** 內容是一組按鈕時用 div 而不是 label，避免點標籤時觸發第一個按鈕 */
  group?: boolean;
  children: ReactNode;
}) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className="block" role={group ? 'group' : undefined} aria-label={group ? label : undefined}>
      <span className="mb-1 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-danger">{error}</span>}
    </Tag>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none';

export function Spinner({ label = '載入中…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-muted">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-line-strong border-t-cyan-400" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{children}</p>;
}

export function Badge({ children, className = 'bg-line text-ink' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${className}`}>{children}</span>;
}

/** 執行非同步動作並處理 loading / 錯誤訊息。 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-primary' : 'bg-line-strong'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-surface transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  );
}
