import { NavLink, Outlet } from 'react-router-dom';
import { useEvent } from '../providers/EventProvider';

const NAV = [
  { to: '/', label: '首頁', icon: '🏠' },
  { to: '/players', label: '名單', icon: '👥' },
  { to: '/bracket', label: '對戰表', icon: '⚔️' },
  { to: '/rules', label: '規則', icon: '📜' },
  { to: '/my', label: '我的報名', icon: '📝' },
];

export function PublicLayout() {
  const { isFamily } = useEvent();
  return (
    <div className="arena-bg min-h-dvh pb-24">
      <main className="mx-auto max-w-2xl px-4 pt-4">
        {isFamily && (
          <NavLink to="/admin" className="mb-3 block rounded-lg bg-amber-500/15 px-3 py-2 text-center text-sm font-bold text-amber-700">
            你是主辦 → 進入後台
          </NavLink>
        )}
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-slate-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center py-2 text-[11px] font-semibold ${isActive ? 'text-cyan-700' : 'text-slate-600'}`
              }
            >
              <span className="text-lg leading-tight">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
