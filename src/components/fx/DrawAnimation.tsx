import { useEffect, useState } from 'react';
import { displayName } from '../../lib/format';
import type { EntryDoc, Group } from '../../types';
import { Icon } from '../icons';

/**
 * 抽籤動畫：名字快速輪轉後，逐一揭曉每位選手的組別。
 * 主辦後台與大螢幕同步播放（大螢幕依 bracket.drawAt 觸發）。
 */
export function DrawAnimation({
  groups,
  entryById,
  onDone,
  big,
}: {
  groups: Group[];
  entryById: Map<string, EntryDoc>;
  onDone: () => void;
  big?: boolean;
}) {
  const order = groups.flatMap((g) => g.playerIds.map((id) => ({ id, group: g.id })));
  const [revealed, setRevealed] = useState(0);
  const [spinName, setSpinName] = useState('');

  useEffect(() => {
    if (revealed >= order.length) {
      const t = setTimeout(onDone, 2500);
      return () => clearTimeout(t);
    }
    const names = order.map((o) => displayName(entryById.get(o.id)));
    const spin = setInterval(() => setSpinName(names[Math.floor(Math.random() * names.length)]), 60);
    const next = setTimeout(() => setRevealed((r) => r + 1), order.length > 12 ? 450 : 700);
    return () => {
      clearInterval(spin);
      clearTimeout(next);
    };
    // 只依揭曉進度重新排程；名單在動畫期間不會變
  }, [revealed, order.length]);

  const shown = new Set(order.slice(0, revealed).map((o) => o.id));
  const current = order[revealed];

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-canvas/95 p-4 backdrop-blur">
      <div className="mx-auto max-w-6xl">
        <h2 className={`neon-text text-center font-black ${big ? 'text-5xl' : 'text-3xl'}`}>
          <Icon name="dice" className="mr-2 text-accent" />
          抽籤分組
        </h2>
        <div className={`my-6 text-center font-black text-gold ${big ? 'h-20 text-6xl' : 'h-12 text-3xl'}`}>
          {current ? spinName : '分組完成！'}
        </div>
        {groups.length > 0 && (
          <div className={`grid gap-3 ${groups.length === 1 ? 'grid-cols-1' : groups.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {groups.map((g) => (
              <div key={g.id} className="rounded-2xl border border-accent/50 bg-surface p-3 shadow-sm">
                <div className={`mb-2 text-center font-black text-accent ${big ? 'text-3xl' : 'text-xl'}`}>{g.name}</div>
                <ul className="space-y-1">
                  {g.playerIds.map((id) => (
                    <li
                      key={id}
                      className={`rounded-lg px-2 py-1 text-center font-bold ${big ? 'text-2xl' : 'text-base'} ${
                        shown.has(id) ? 'animate-pop bg-primary/20 text-primary' : 'bg-raised text-ink-subtle'
                      }`}
                    >
                      {shown.has(id) ? displayName(entryById.get(id)) : '？？？'}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 text-center">
          <button type="button" onClick={onDone} className="text-sm text-ink-muted underline">
            略過動畫
          </button>
        </div>
      </div>
    </div>
  );
}
