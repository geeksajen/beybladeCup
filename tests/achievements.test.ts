import { describe, expect, it } from 'vitest';
import { computeAchievements } from '../src/engine/achievements';
import { diffArenaEvents, EVENT_FRESH_MS } from '../src/engine/arenaEvents';
import { playerNextUp, playerSummary } from '../src/engine/player';
import { computeScore, decidedWinner } from '../src/engine/scoring';
import { DEFAULT_RULES } from '../src/lib/defaults';
import type { Battle, BracketDoc, FinishType, Match } from '../src/types';

type B = ['p1' | 'p2', FinishType | 'launchError'] | 'draw';

function match(id: string, order: number, p1: string, p2: string, battles: B[], status: Match['status'] = 'done'): Match {
  const bs: Battle[] = battles.map((b) => (b === 'draw' ? { winner: 'draw', at: 0 } : { winner: b[0], finish: b[1], at: 0 }));
  const s = computeScore(bs, DEFAULT_RULES);
  const m: Match = { id, stage: 'group', groupId: 'A', round: 1, order, p1, p2, battles: bs, p1Score: s.p1, p2Score: s.p2, status };
  const w = decidedWinner(m, DEFAULT_RULES);
  if (status === 'done' && w) m.winner = w === 'p1' ? p1 : p2;
  return m;
}

function bracket(matches: Match[], extra: Partial<BracketDoc> = {}): BracketDoc {
  const playerIds = [...new Set(matches.flatMap((m) => [m.p1!, m.p2!]))];
  return {
    version: 1,
    generatedAt: 1,
    format: 'roundRobin',
    playerIds,
    groups: [{ id: 'A', name: 'A', playerIds }],
    matches,
    currentMatchIds: matches.filter((m) => m.status === 'live').map((m) => m.id),
    ...extra,
  };
}

const X: B = ['p1', 'xtreme'];
const spin1: B = ['p1', 'spin'];
const spin2: B = ['p2', 'spin'];

describe('computeAchievements', () => {
  it('首勝、完封、第一分', () => {
    const a = computeAchievements(bracket([match('m1', 1, 'a', 'b', [spin1, spin1, spin1, spin1])]), DEFAULT_RULES);
    expect(a.a).toEqual(['firstPoint', 'firstWin', 'shutout']);
    expect(a.b).toBeUndefined();
  });

  it('輸了但有得分 → 只有第一分', () => {
    const a = computeAchievements(bracket([match('m1', 1, 'a', 'b', [spin2, spin1, spin1, spin1, spin1])]), DEFAULT_RULES);
    expect(a.b).toEqual(['firstPoint']);
    expect(a.a).toEqual(['firstPoint', 'firstWin']);
  });

  it('絕地逆轉：對手 3 分領先後被逆轉', () => {
    const a = computeAchievements(bracket([match('m1', 1, 'a', 'b', [['p2', 'xtreme'], X, spin1])]), DEFAULT_RULES);
    expect(a.a).toContain('comeback');
    // 只差 2 分不算
    const b = computeAchievements(bracket([match('m1', 1, 'a', 'b', [['p2', 'over'], X, spin1])]), DEFAULT_RULES);
    expect(b.a).not.toContain('comeback');
  });

  it('三連勝要連續', () => {
    const win = (id: string, order: number, opp: string) => match(id, order, 'a', opp, [X, spin1]);
    const lose = (id: string, order: number, opp: string) => match(id, order, 'a', opp, [['p2', 'xtreme'], spin2]);
    expect(computeAchievements(bracket([win('1', 1, 'b'), lose('2', 2, 'c'), win('3', 3, 'd'), win('4', 4, 'e')]), DEFAULT_RULES).a).not.toContain('streak3');
    expect(computeAchievements(bracket([lose('1', 1, 'b'), win('2', 2, 'c'), win('3', 3, 'd'), win('4', 4, 'e')]), DEFAULT_RULES).a).toContain('streak3');
  });

  it('雙重 Xtreme 與招式大師', () => {
    const a = computeAchievements(
      bracket([match('1', 1, 'a', 'b', [X, X]), match('2', 2, 'a', 'c', [spin1, ['p1', 'over'], ['p1', 'burst']])]),
      DEFAULT_RULES,
    );
    expect(a.a).toEqual(expect.arrayContaining(['doubleXtreme', 'allFinishes']));
  });

  it('進行中、快速輸入比分不算逆轉', () => {
    const live = match('1', 1, 'a', 'b', [X, X], 'live');
    expect(computeAchievements(bracket([live]), DEFAULT_RULES)).toEqual({});
    const manual: Match = { ...match('1', 1, 'a', 'b', []), p1Score: 4, p2Score: 3, manualScore: true, winner: 'a' };
    expect(computeAchievements(bracket([manual]), DEFAULT_RULES).a).toEqual(['firstPoint', 'firstWin']);
  });
});

describe('player', () => {
  it('playerSummary 統計勝敗、得分與終結方式', () => {
    const b = bracket([match('1', 1, 'a', 'b', [X, spin2, spin1]), match('2', 2, 'c', 'a', [X, spin1])]);
    const s = playerSummary(b, 'a');
    expect([s.wins, s.losses, s.pointsFor, s.pointsAgainst]).toEqual([1, 1, 4, 5]);
    expect(s.finishes).toEqual({ spin: 1, over: 0, burst: 0, xtreme: 1 });
  });

  it('playerNextUp：進行中 / 下一場 / 打完', () => {
    const b = bracket([
      match('1', 1, 'a', 'b', [], 'live'),
      match('2', 2, 'c', 'd', [], 'pending'),
      match('3', 3, 'e', 'f', [], 'pending'),
      match('4', 4, 'c', 'e', [], 'pending'),
    ]);
    const rules = { arenaCount: 1, minutesPerMatch: 3 };
    expect(playerNextUp(b, 'a', rules).kind).toBe('live');
    expect(playerNextUp(b, 'c', rules)).toMatchObject({ kind: 'next', ahead: 0, onDeck: true, etaMinutes: 3 });
    expect(playerNextUp(b, 'f', rules)).toMatchObject({ kind: 'next', ahead: 1, onDeck: false, etaMinutes: 6 });
    expect(playerNextUp(b, 'f', { arenaCount: 2, minutesPerMatch: 3 })).toMatchObject({ onDeck: true, etaMinutes: 3 });
    const done = bracket([match('1', 1, 'a', 'b', [X, spin1])]);
    expect(playerNextUp(done, 'a', rules).kind).toBe('done');
  });
});

describe('diffArenaEvents', () => {
  const now = 100000;
  const withAt = (m: Match, at: number): Match => ({ ...m, battles: m.battles.map((b) => ({ ...b, at })) });

  it('新的一局 → 終結特效；平手與發射失誤不算', () => {
    const prev = bracket([match('1', 1, 'a', 'b', [], 'live')]);
    const next = bracket([withAt(match('1', 1, 'a', 'b', ['draw', ['p2', 'launchError'], ['p2', 'burst']], 'live'), now)]);
    const evs = diffArenaEvents(prev, next, DEFAULT_RULES, now);
    expect(evs).toEqual([{ kind: 'finish', id: '1:b2', finish: 'burst', winnerId: 'b', points: 2 }]);
  });

  it('太舊的一局不播放', () => {
    const prev = bracket([match('1', 1, 'a', 'b', [], 'live')]);
    const next = bracket([withAt(match('1', 1, 'a', 'b', [X], 'live'), now - EVENT_FRESH_MS - 1)]);
    expect(diffArenaEvents(prev, next, DEFAULT_RULES, now)).toEqual([]);
  });

  it('場次完成 → 勝利 ＋ 新成就（第一分不跳）', () => {
    const prev = bracket([match('1', 1, 'a', 'b', [X, spin1], 'live')]);
    const next = bracket([match('1', 1, 'a', 'b', [X, spin1])]);
    const evs = diffArenaEvents(prev, next, DEFAULT_RULES, now);
    expect(evs.map((e) => e.kind)).toEqual(['win', 'achievement', 'achievement']);
    expect(evs[0]).toMatchObject({ winnerId: 'a', loserId: 'b', winnerScore: 4, loserScore: 0 });
    expect(evs.slice(1).map((e) => (e.kind === 'achievement' ? e.achievement : ''))).toEqual(['firstWin', 'shutout']);
  });

  it('重新產生賽程不產生事件', () => {
    const prev = bracket([match('1', 1, 'a', 'b', [], 'live')]);
    const next = bracket([match('1', 1, 'a', 'b', [X, spin1])], { generatedAt: 2 });
    expect(diffArenaEvents(prev, next, DEFAULT_RULES, now)).toEqual([]);
  });
});
