import { NavLink, Outlet } from 'react-router-dom';
import { useEvent } from '../providers/EventProvider';
import { Icon, type IconName } from './icons';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '首頁', icon: 'home' },
  { to: '/players', label: '名單', icon: 'users' },
  { to: '/bracket', label: '對戰表', icon: 'bracket' },
  { to: '/rules', label: '規則', icon: 'rules' },
  { to: '/my', label: '我的報名', icon: 'clipboard' },
];

export function PublicLayout() {
  const { isFamily } = useEvent();
  return (
    <div className="arena-bg min-h-dvh pb-24">
      <main className="mx-auto max-w-2xl px-4 pt-4">
        {isFamily && (
          <NavLink to="/admin" className="mb-3 block rounded-lg bg-gold/15 px-3 py-2 text-center text-sm font-bold text-gold">
            你是主辦 → 進入後台
          </NavLink>
        )}
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center py-2 text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-ink-muted'}`
              }
            >
              <Icon name={n.icon} className="mb-0.5 text-[22px]" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
