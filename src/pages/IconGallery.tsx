import { Avatar, AVATAR_KEYS, avatarName } from '../components/avatars';
import { Icon, ICON_NAMES } from '../components/icons';

const COLORS = ['text-primary', 'text-accent', 'text-gold', 'text-xtreme', 'text-success', 'text-ink'];

/** 開發用：全部自製圖示與頭像一覽（#/icons，只有 npm run dev 時有這一頁）。 */
export default function IconGallery() {
  return (
    <div className="arena-bg min-h-dvh space-y-6 p-4">
      <section>
        <h1 className="mb-4 text-2xl font-black">選手頭像（{AVATAR_KEYS.length}）</h1>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
          {AVATAR_KEYS.map((k) => (
            <div key={k} className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-3">
              <Avatar value={k} className="text-5xl" />
              <span className="flex items-center gap-2 text-xl">
                <Avatar value={k} />
                <Avatar value={k} className="text-sm" />
              </span>
              <span className="text-xs text-ink-muted">
                {avatarName(k)} {k}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h1 className="mb-4 text-2xl font-black">圖示（{ICON_NAMES.length}）</h1>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
          {ICON_NAMES.map((n, i) => (
            <div key={n} className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-3">
              <Icon name={n} className={`text-5xl ${COLORS[i % COLORS.length]}`} />
              <span className="flex gap-2 text-xl text-ink">
                <Icon name={n} />
                <Icon name={n} className="text-sm" />
              </span>
              <span className="text-xs text-ink-muted">{n}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
