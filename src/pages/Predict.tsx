import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, PlayerName } from '../components/avatars';
import { Icon } from '../components/icons';
import { PopularityBars } from '../components/Popularity';
import { Card, ErrorText, useAction } from '../components/ui';
import { computePodium } from '../engine/advance';
import { validPredictions } from '../engine/predictions';
import { classifyEntries } from '../engine/registration';
import { usePredictions, useReadyEvent } from '../providers/EventProvider';

/** 猜冠軍：每位參賽小孩投一票，可以改票，主辦截止後鎖定。 */
export default function Predict() {
  const { event: ev, bracket, entries, entryById, user, isFamily, store } = useReadyEvent();
  const preds = usePredictions();
  const [voterSel, setVoterSel] = useState<string>();
  const { busy, error, run } = useAction();

  const candidates = bracket ? bracket.playerIds : classifyEntries(entries, ev.capacity, ev.waitlistCapacity).confirmed.map((e) => e.id);
  const valid = validPredictions(preds, candidates);
  const open = !!ev.predictionsOpen && ev.status !== 'finished';
  // 主辦可以替任何選手代投（例如現場用平板讓小孩輪流點）
  const voters = isFamily ? candidates : candidates.filter((id) => entryById.get(id)?.ownerUid === user?.uid);
  const voterId = voterSel && voters.includes(voterSel) ? voterSel : voters.length === 1 ? voters[0] : undefined;
  const myPick = valid.find((p) => p.voterId === voterId)?.pickId;
  const champion = ev.status === 'finished' && bracket ? computePodium(bracket)?.first : undefined;
  const prophets = champion ? valid.filter((p) => p.pickId === champion).map((p) => p.voterId) : [];

  if (!open && valid.length === 0) {
    return (
      <div className="pt-10 text-center">
        <Icon name="crystal" className="text-5xl text-xtreme" />
        <h1 className="mt-3 text-2xl font-black">猜猜誰是冠軍？</h1>
        <p className="mt-2 text-ink">比賽當天主辦開放投票後，參賽選手就可以猜冠軍。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="text-center">
        <Icon name="crystal" className="text-5xl text-xtreme" />
        <h1 className="mt-1 text-2xl font-black">猜猜誰是冠軍？</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {open ? '投票開放中！每位選手一票，截止前都可以改。' : champion ? '比賽結束，答案揭曉！' : '投票已截止，等比賽結果揭曉！'}
        </p>
      </div>

      {champion && (
        <Card className="text-center">
          <div className="text-sm font-bold text-gold">
            <Icon name="trophy" className="mr-1" />
            冠軍
          </div>
          <div className="text-2xl font-black"><PlayerName entry={entryById.get(champion)} /></div>
          <div className="mt-3 text-sm font-bold text-accent"><Icon name="crystal" className="mr-1" />猜中的小預言家（{prophets.length} 位）</div>
          <div className="mt-1 flex flex-wrap justify-center gap-1.5">
            {prophets.length === 0 && <span className="text-sm text-ink-muted">沒有人猜中，冠軍是大黑馬！</span>}
            {prophets.map((id) => (
              <span key={id} className="rounded-full bg-accent/10 px-3 py-1 text-sm font-bold text-accent">
                <PlayerName entry={entryById.get(id)} />
              </span>
            ))}
          </div>
        </Card>
      )}

      {open && (
        <Card className="space-y-3">
          {voters.length === 0 ? (
            <p className="text-center text-sm text-ink-muted">
              只有參賽選手可以投票：請用<b>報名時的同一個瀏覽器</b>打開這一頁，或請主辦幫忙代投。
            </p>
          ) : (
            <>
              {voters.length > 1 && (
                <div>
                  <div className="mb-1.5 text-sm font-bold text-ink">誰要投票？</div>
                  <div className="flex flex-wrap gap-1.5">
                    {voters.map((id) => {
                      const voted = valid.some((p) => p.voterId === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setVoterSel(id)}
                          className={`rounded-full px-3 py-1.5 text-sm font-bold ${id === voterId ? 'bg-accent text-on' : 'bg-raised text-ink'}`}
                        >
                          <PlayerName entry={entryById.get(id)} />
                          {voted && <Icon name="check" className="ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {voterId ? (
                <div>
                  <div className="mb-1.5 text-sm font-bold text-ink">
                    {entryById.get(voterId)?.nickname}，你覺得誰會拿冠軍？
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {candidates.map((id) => {
                      const e = entryById.get(id);
                      const picked = id === myPick;
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={busy}
                          onClick={() => void run(() => store.savePrediction(voterId, id, user?.uid ?? ''))}
                          className={`flex items-center gap-2 rounded-xl border-2 px-2 py-2 text-left transition disabled:opacity-60 ${picked ? 'border-accent bg-accent/10' : 'border-line bg-surface'}`}
                        >
                          <Avatar value={e?.emoji} className="text-2xl" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold">{e?.nickname ?? '？'}</span>
                            {picked && <span className="block text-xs font-bold text-accent"><Icon name="check" className="mr-0.5" />你猜的</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-ink-muted">先選上面是誰要投票</p>
              )}
            </>
          )}
          <ErrorText>{error}</ErrorText>
        </Card>
      )}

      {valid.length > 0 && (
        <Card>
          <h2 className="mb-2 font-bold">
            <Icon name="star" className="mr-1 text-gold" />
            人氣排行（共 {valid.length} 票）</h2>
          <PopularityBars preds={valid} playerIds={candidates} entryById={entryById} limit={8} />
        </Card>
      )}

      <div className="text-center">
        <Link to="/bracket" className="text-sm text-primary underline">
          看對戰表 →
        </Link>
      </div>
    </div>
  );
}
