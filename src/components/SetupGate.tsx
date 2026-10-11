import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useEvent } from '../providers/EventProvider';
import { LoginForm } from './LoginForm';
import { ErrorText, Spinner } from './ui';

/**
 * 初次設定的強制流程（spec §4.3）：
 * - events/current 不存在 = 尚未設定
 * - 尚未設定：訪客看到「準備中」；主辦一律導到 #/setup
 * - 已設定：#/setup 導到 #/admin
 */
export function SetupGate({ kind, children }: { kind: 'public' | 'setup' | 'admin'; children: ReactNode }) {
  const { event, user, isFamily, error } = useEvent();

  if (event === undefined || !user) {
    return (
      <div className="arena-bg min-h-dvh px-4 pt-10">
        {error ? (
          <div className="mx-auto max-w-md">
            <ErrorText>{error}</ErrorText>
          </div>
        ) : (
          <Spinner />
        )}
      </div>
    );
  }

  if (kind === 'public') {
    if (event) return <>{children}</>;
    if (isFamily) return <Navigate to="/setup" replace />;
    return <Preparing />;
  }

  if (!isFamily) return <LoginForm />;
  if (kind === 'setup' && event) return <Navigate to="/admin" replace />;
  if (kind === 'admin' && !event) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

function Preparing() {
  return (
    <div className="arena-bg flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="animate-spin-slow text-7xl">🌀</div>
      <h1 className="neon-text mt-6 text-2xl font-black">比賽準備中</h1>
      <p className="mt-2 text-slate-600">請稍後再來 🌀</p>
      <Link to="/admin" className="mt-16 text-xs text-slate-400 underline">
        主辦登入
      </Link>
    </div>
  );
}
