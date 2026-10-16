import { useEffect, useState } from 'react';
import { groupStandings, groupsNeedingManualOrder } from '../../engine/advance';
import { sortActive } from '../../engine/registration';
import { generateBracket, suggestFormat, type FormatChoice } from '../../engine/scheduler';
import { FORMAT_LABELS } from '../../lib/defaults';
import { displayName } from '../../lib/format';
import { useReadyEvent } from '../../providers/EventProvider';
import type { BracketDoc, Format } from '../../types';
import { advanceCount } from '../bracket/GroupTable';
import { DrawAnimation } from '../fx/DrawAnimation';
import { Icon } from '../icons';
import { Button, Card, ErrorText, Field, inputClass, Toggle, useAction } from '../ui';
import { useBracketMutation } from './useBracket';

export function BracketGenerator({ onGoScore }: { onGoScore: () => void }) {
  const { event: ev, entries, bracket, store, entryById } = useReadyEvent();
  const players = sortActive(entries).filter((e) => e.checkedIn);
  const n = players.length;
  const suggested = suggestFormat(n);
  const [choice, setChoice] = useState<FormatChoice>(suggested);
  // 報到人數變動時改回建議賽制
  useEffect(() => setChoice(suggestFormat(n)), [n]);
  const [thirdPlace, setThirdPlace] = useState(ev.rules.thirdPlaceMatch);
  const [showDraw, setShowDraw] = useState(false);
  const { busy, error, run } = useAction();

  const started = !!bracket?.matches.some((m) => !m.isBye && (m.battles.length > 0 || m.manualScore || m.status === 'done'));

  const generate = (groups?: string[][], base?: BracketDoc) =>
    run(async () => {
      const ids = groups ? groups.flat() : players.map((p) => p.id);
      const format = base?.format ?? choice.format;
      const next = generateBracket(
        ids,
        base ? { format, advancePerGroup: base.groups[0] ? advanceCount(base, base.groups[0].id) || 2 : 2 } : choice,
        { groups, thirdPlaceMatch: base ? base.matches.some((m) => m.id === 'KO-3RD') : thirdPlace, arenaCount: ev.rules.arenaCount },
      );
      // 交換分組時不重播大螢幕的抽籤動畫
      if (base) next.drawAt = base.drawAt;
      await store.mutateBracket(() => next);
      if (ev.status !== 'running') await store.updateEvent({ status: 'running' });
      if (!groups) setShowDraw(true);
    });

  const onGenerate = () => {
    if (n < 2) return;
    if (bracket && !confirm(started ? '比賽已經開始！重新產生賽程會清空所有比分，確定嗎？' : '重新抽籤產生賽程？')) return;
    if (bracket && started && !confirm('再確認一次：所有比分都會被清除。')) return;
    void generate();
  };

  const formatOptions: Format[] = ['roundRobin', 'groupsThenKnockout', 'knockout'];

  return (
    <div className="space-y-4">
      {showDraw && bracket && (
        <DrawAnimation
          groups={bracket.groups.length ? bracket.groups : [{ id: 'all', name: '參賽選手', playerIds: bracket.playerIds }]}
          entryById={entryById}
          onDone={() => setShowDraw(false)}
        />
      )}

      {bracket && (
        <>
          <Card className="border-primary/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">已產生賽程</div>
                <div className="text-xs text-ink-muted">
                  {FORMAT_LABELS[bracket.format]}・{bracket.playerIds.length} 人・{bracket.matches.filter((m) => !m.isBye).length} 場
                </div>
              </div>
              <Button onClick={onGoScore}>去計分 →</Button>
            </div>
          </Card>
          <TieResolver bracket={bracket} />
          {bracket.groups.length > 0 && bracket.format !== 'knockout' && (
            <GroupSwapper bracket={bracket} started={started} busy={busy} onRegenerate={(groups) => void generate(groups, bracket)} />
          )}
        </>
      )}

      <Card className="space-y-4">
        <h2 className="font-bold">{bracket ? '重新產生賽程' : '產生賽程'}</h2>
        <p className="text-sm text-ink">
          已報到 <b className="text-primary">{n}</b> 人。建議賽制：<b>{FORMAT_LABELS[suggested.format]}</b>
          {suggested.groupCount && `（${suggested.groupCount} 組，每組前 2 名晉級）`}
        </p>
        {n < 2 && <p className="text-sm text-gold">至少需要 2 位已報到的選手。請先到「報到」分頁點選。</p>}
        <Field label="賽制" group>
          <div className="grid gap-1.5">
            {formatOptions.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setChoice(f === 'groupsThenKnockout' ? { format: f, groupCount: Math.max(2, Math.ceil(n / 4)), advancePerGroup: 2 } : { format: f })}
                className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                  choice.format === f ? 'border-primary bg-primary/15 text-primary' : 'border-line-strong text-ink'
                }`}
              >
                {FORMAT_LABELS[f]}
                {f === suggested.format && <span className="ml-2 text-xs text-primary">建議</span>}
              </button>
            ))}
          </div>
        </Field>
        {choice.format === 'groupsThenKnockout' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="組數">
              <input
                className={inputClass}
                type="number"
                min={1}
                max={Math.max(1, Math.floor(n / 2))}
                value={choice.groupCount ?? 2}
                onChange={(e) => setChoice({ ...choice, groupCount: Number(e.target.value) })}
              />
            </Field>
            <Field label="每組晉級">
              <select className={inputClass} value={choice.advancePerGroup ?? 2} onChange={(e) => setChoice({ ...choice, advancePerGroup: Number(e.target.value) })}>
                <option value={1}>1 人</option>
                <option value={2}>2 人</option>
              </select>
            </Field>
          </div>
        )}
        {choice.format !== 'roundRobin' && <Toggle label="打季軍戰" checked={thirdPlace} onChange={setThirdPlace} />}
        <p className="text-xs text-ink-muted">戰鬥盤：{ev.rules.arenaCount} 個（在「活動設定」修改）</p>
        <ErrorText>{error}</ErrorText>
        <Button variant="neon" className="w-full py-3 text-lg" disabled={busy || n < 2} onClick={onGenerate}>
          {!busy && <Icon name="dice" className="mr-1.5" />}
          {busy ? '產生中…' : bracket ? '重新抽籤' : '抽籤產生賽程'}
        </Button>
        <p className="text-xs text-ink-muted">抽籤動畫會同步在大螢幕播放。</p>
      </Card>

      {bracket && (
        <Button
          variant="ghost"
          className="w-full text-sm text-danger"
          onClick={() => confirm('刪除整份賽程與比分？') && void run(() => store.mutateBracket(() => null))}
        >
          刪除賽程
        </Button>
      )}
    </div>
  );
}

/** 手動交換兩位選手的分組（同班好朋友想分開或在一起）。 */
function GroupSwapper({
  bracket,
  started,
  busy,
  onRegenerate,
}: {
  bracket: BracketDoc;
  started: boolean;
  busy: boolean;
  onRegenerate: (groups: string[][]) => void;
}) {
  const { entryById } = useReadyEvent();
  const [picked, setPicked] = useState<string>();
  const groupOf = (id: string) => bracket.groups.findIndex((g) => g.playerIds.includes(id));

  const pick = (id: string) => {
    if (!picked) return setPicked(id);
    if (picked === id) return setPicked(undefined);
    const ga = groupOf(picked);
    const gb = groupOf(id);
    if (ga === gb) return setPicked(id);
    const groups = bracket.groups.map((g) => g.playerIds.map((p) => (p === picked ? id : p === id ? picked : p)));
    const msg = `交換「${entryById.get(picked)?.nickname}」和「${entryById.get(id)?.nickname}」的組別？賽程會重新排列${started ? '，而且所有比分都會清空' : ''}。`;
    setPicked(undefined);
    if (confirm(msg)) onRegenerate(groups);
  };

  if (bracket.groups.length < 2) return null;
  return (
    <Card>
      <h3 className="mb-1 font-bold">交換分組</h3>
      <p className="mb-3 text-xs text-ink-muted">先點一位選手，再點另一組的選手即可交換。</p>
      <div className="grid grid-cols-2 gap-2">
        {bracket.groups.map((g) => (
          <div key={g.id} className="rounded-xl bg-raised/60 p-2">
            <div className="mb-1 text-sm font-bold text-accent">{g.name}</div>
            {g.playerIds.map((id) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => pick(id)}
                className={`mb-1 block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm ${picked === id ? 'bg-gold text-on' : 'bg-raised'}`}
              >
                {displayName(entryById.get(id))}
              </button>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** 分組比完仍同分時，主辦依現場加賽結果手動排定名次（spec §5.3 第 5 項）。 */
function TieResolver({ bracket }: { bracket: BracketDoc }) {
  const { entryById } = useReadyEvent();
  const { mutate, busy, error } = useBracketMutation();
  const groupIds = groupsNeedingManualOrder(bracket);
  if (groupIds.length === 0) return null;
  return (
    <Card className="border-gold/60">
      <h3 className="font-bold text-gold">
        <Icon name="alert" className="mr-1" />
        有同分需要決定名次
      </h3>
      <p className="mb-3 text-xs text-ink-muted">請現場加賽一局，再用箭頭排出名次後儲存。淘汰賽會等名次確定後才排入。</p>
      {groupIds.map((gid) => (
        <TieGroup
          key={gid}
          name={bracket.groups.find((g) => g.id === gid)!.name}
          ids={groupStandings(bracket, gid).map((r) => r.id)}
          tied={new Set(groupStandings(bracket, gid).filter((r) => r.tied).map((r) => r.id))}
          labelOf={(id) => displayName(entryById.get(id))}
          busy={busy}
          onSave={(order) => void mutate((b) => ({ ...b, manualOrder: { ...(b.manualOrder ?? {}), [gid]: order } }))}
        />
      ))}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function TieGroup({
  name,
  ids,
  tied,
  labelOf,
  busy,
  onSave,
}: {
  name: string;
  ids: string[];
  tied: Set<string>;
  labelOf: (id: string) => string;
  busy: boolean;
  onSave: (order: string[]) => void;
}) {
  const [order, setOrder] = useState(ids);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };
  return (
    <div className="mb-3">
      <div className="mb-1 text-sm font-bold">{name}</div>
      {order.map((id, i) => (
        <div key={id} className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1 ${tied.has(id) ? 'bg-gold/15' : 'bg-raised/60'}`}>
          <span className="w-5 font-mono text-sm">{i + 1}</span>
          <span className="flex-1 truncate">{labelOf(id)}</span>
          <button type="button" className="px-2 text-lg" onClick={() => move(i, -1)}>
            ▲
          </button>
          <button type="button" className="px-2 text-lg" onClick={() => move(i, 1)}>
            ▼
          </button>
        </div>
      ))}
      <Button className="mt-1 w-full py-1.5 text-sm" disabled={busy} onClick={() => onSave(order)}>
        儲存 {name} 名次
      </Button>
    </div>
  );
}
