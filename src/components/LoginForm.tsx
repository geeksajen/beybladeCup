import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '../providers/EventProvider';
import { Button, Card, ErrorText, Field, inputClass, useAction } from './ui';

export function LoginForm() {
  const { store, user } = useEvent();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, run } = useAction();
  const signedInButNotFamily = !!user && !user.isAnonymous;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(() => store.signInFamily(email.trim(), password));
  };

  return (
    <div className="arena-bg flex min-h-dvh items-start justify-center px-4 pt-16">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-black">主辦登入</h1>
        <p className="mb-4 text-sm text-slate-400">請用家庭帳號登入後台。</p>
        {signedInButNotFamily ? (
          <div className="space-y-3">
            <ErrorText>此帳號（{user.email}）不是主辦帳號。</ErrorText>
            <Button variant="secondary" className="w-full" onClick={() => void store.signOut()}>
              登出
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {store.mode === 'local' && (
              <p className="rounded-lg bg-amber-950/60 px-3 py-2 text-xs text-amber-300">
                本機模式：任意 Email／密碼都可以登入（只在這個分頁有效）。
              </p>
            )}
            <Field label="Email">
              <input className={inputClass} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="密碼">
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" className="w-full" disabled={busy || !email || !password}>
              {busy ? '登入中…' : '登入'}
            </Button>
          </form>
        )}
        <Link to="/" className="mt-4 block text-center text-sm text-slate-400 underline">
          回首頁
        </Link>
      </Card>
    </div>
  );
}
