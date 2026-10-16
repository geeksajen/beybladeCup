import { refreshBracket } from '../engine/advance';
import { setMatchDecks } from '../engine/deck';
import { addBattle, decidedWinner, finalizeMatch } from '../engine/scoring';
import type { Battle, BracketDoc, EntryDoc, FinishType, RuleConfig } from '../types';

/**
 * 開發用（本機模式）：隨機打完所有能開打的場次，方便測試 Meta、頒獎畫面。
 * 局的時間設在 1 分鐘前，大螢幕不會一次播放一大堆特效。
 * 分組同分需要主辦手動決定名次時會停下來。
 */
export function simulateAll(input: BracketDoc, entryById: Map<string, EntryDoc>, rules: RuleConfig, rng: () => number = Math.random): BracketDoc {
  let b = input;
  const at = Date.now() - 60000;
  for (let guard = 0; guard < 500 && b.currentMatchIds.length > 0; guard++) {
    const ids = new Set(b.currentMatchIds);
    b = {
      ...b,
      matches: b.matches.map((m) => {
        if (!ids.has(m.id) || !m.p1 || !m.p2) return m;
        let cur = m.p1Deck || m.p2Deck || m.battles.length ? m : setMatchDecks(m, entryById.get(m.p1)?.deck, entryById.get(m.p2)?.deck);
        for (let n = 0; n < 40 && !decidedWinner(cur, rules); n++) {
          const r = rng();
          const finish: FinishType = r < 0.12 ? 'xtreme' : r < 0.3 ? 'burst' : r < 0.55 ? 'over' : 'spin';
          const battle: Battle = rng() < 0.05 ? { winner: 'draw', at } : { winner: rng() < 0.5 ? 'p1' : 'p2', finish, at };
          cur = addBattle(cur, battle, rules);
        }
        return finalizeMatch(cur, rules);
      }),
    };
    b = refreshBracket(b, rules.arenaCount);
  }
  return b;
}
