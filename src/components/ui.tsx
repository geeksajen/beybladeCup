import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'neon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-cyan-600 text-white hover:bg-cyan-500 disabled:bg-slate-300 disabled:text-slate-500',
  secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 disabled:opacity-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 disabled:opacity-50',
  neon:
    'bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white shadow-[0_4px_18px_rgba(217,70,239,0.35)] hover:brightness-110 disabled:opacity-50',
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
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm p-4 ${className}`}>{children}</div>;
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
      <span className="mb-1 block text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-600">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span>}
    </Tag>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none';

export function Spinner({ label = '載入中…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-cyan-400" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-rose-50/60 px-3 py-2 text-sm font-semibold text-rose-700">{children}</p>;
}

export function Badge({ children, className = 'bg-slate-300 text-slate-800' }: { children: ReactNode; className?: string }) {
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
      <span className="text-sm text-slate-800">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-cyan-500' : 'bg-slate-400'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  );
}
