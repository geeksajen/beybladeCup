import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/icons';
import { AwardsPanel } from '../components/admin/AwardsPanel';
import { BracketGenerator } from '../components/admin/BracketGenerator';
import { CheckIn } from '../components/admin/CheckIn';
import { EntryManager } from '../components/admin/EntryManager';
import { EventSettings } from '../components/admin/EventSettings';
import { Scorer } from '../components/admin/Scorer';
import { STATUS_LABELS } from '../lib/defaults';
import { usePersistentState } from '../lib/hooks';
import { useReadyEvent } from '../providers/EventProvider';

const TABS = [
  { key: 'settings', label: '活動設定', icon: 'settings' },
  { key: 'entries', label: '報名', icon: 'clipboard' },
  { key: 'checkin', label: '報到', icon: 'checkin' },
  { key: 'bracket', label: '賽程', icon: 'dice' },
  { key: 'score', label: '計分', icon: 'scoreboard' },
  { key: 'awards', label: '頒獎', icon: 'trophy' },
] as const satisfies readonly { key: string; label: string; icon: IconName }[];

type TabKey = (typeof TABS)[number]['key'];

export default function Admin() {
  const { event: ev, store, user } = useReadyEvent();
  const [tab, setTab] = usePersistentState<TabKey>('adminTab', 'settings');

  return (
    <div className="min-h-dvh bg-canvas pb-24">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-2">
          <div className="min-w-0">
            <div className="truncate font-black">{ev.title}</div>
            <div className="text-xs text-ink-muted">
              主辦後台・<span className="text-accent">{STATUS_LABELS[ev.status]}</span>
              {store.mode === 'local' && <span className="ml-1 text-gold">（本機模式）</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <Link to="/" className="text-primary">
              網站
            </Link>
            <a href="#/screen" target="_blank" rel="noreferrer" className="text-primary">
              大螢幕
            </a>
            <button
              type="button"
              className="text-ink-muted"
              onClick={() => {
                if (confirm(`要登出 ${user?.email ?? '家庭帳號'} 嗎？`)) void store.signOut();
              }}
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {ev.status === 'draft' && tab === 'settings' && (
          <div className="mb-4 rounded-xl border border-primary/50 bg-primary/10 p-3 text-sm text-primary">
            <Icon name="checkin" className="mr-1" />
            比賽已建立（目前是「準備中」，訪客還不能報名）。確認下面的設定無誤後，按「<b>開放報名</b>」。
          </div>
        )}
        {tab === 'settings' && <EventSettings />}
        {tab === 'entries' && <EntryManager />}
        {tab === 'checkin' && <CheckIn />}
        {tab === 'bracket' && <BracketGenerator onGoScore={() => setTab('score')} />}
        {tab === 'score' && <Scorer onGoAwards={() => setTab('awards')} />}
        {tab === 'awards' && <AwardsPanel />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                window.scrollTo(0, 0);
              }}
              className={`flex flex-1 flex-col items-center py-2 text-[11px] font-semibold ${tab === t.key ? 'text-primary' : 'text-ink-muted'}`}
            >
              <Icon name={t.icon} className="mb-0.5 text-[22px]" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
