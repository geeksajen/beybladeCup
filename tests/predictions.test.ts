import { describe, expect, it } from 'vitest';
import { predictionAwards, tallyPredictions, validPredictions } from '../src/engine/predictions';
import type { BracketDoc, Match, PredictionDoc } from '../src/types';

const vote = (voterId: string, pickId: string): PredictionDoc => ({ voterId, pickId, ownerUid: 'u', updatedAt: 0 });

function done(id: string, order: number, p1: string, p2: string): Match {
  // p1 4:0 勝
  return { id, stage: 'group', groupId: 'A', round: 1, order, p1, p2, battles: [], p1Score: 4, p2Score: 0, manualScore: true, status: 'done', winner: p1 };
}

function roundRobin(matches: Match[]): BracketDoc {
  const playerIds = ['a', 'b', 'c'];
  return { version: 1, generatedAt: 1, format: 'roundRobin', playerIds, groups: [{ id: 'A', name: 'A', playerIds }], matches, currentMatchIds: [] };
}

describe('predictions', () => {
  it('不是參賽選手的票不算', () => {
    const preds = [vote('a', 'b'), vote('x', 'b'), vote('b', 'gone')];
    expect(validPredictions(preds, ['a', 'b', 'c'])).toEqual([vote('a', 'b')]);
  });

  it('票數由多到少，同票依參賽順序', () => {
    const preds = [vote('a', 'c'), vote('b', 'b'), vote('c', 'c'), vote('d', 'b'), vote('e', 'a')];
    expect(tallyPredictions(preds, ['a', 'b', 'c', 'd', 'e'])).toEqual([
      { id: 'b', votes: 2 },
      { id: 'c', votes: 2 },
      { id: 'a', votes: 1 },
    ]);
  });

  it('冠軍確定後：小預言家 ＋ 人氣王', () => {
    const b = roundRobin([done('1', 1, 'a', 'b'), done('2', 2, 'a', 'c'), done('3', 3, 'b', 'c')]);
    const awards = predictionAwards(b, [vote('a', 'a'), vote('b', 'a'), vote('c', 'b')]);
    expect(awards).toEqual([
      { key: 'prophet', label: '🔮 小預言家', entryIds: ['a', 'b'] },
      { key: 'popular', label: '🌟 人氣王', entryIds: ['a'] },
    ]);
  });

  it('冠軍未確定只有人氣王；沒有票就沒有獎項', () => {
    const b = roundRobin([done('1', 1, 'a', 'b')]);
    expect(predictionAwards(b, [vote('a', 'c')]).map((a) => a.key)).toEqual(['popular']);
    expect(predictionAwards(b, [])).toEqual([]);
  });
});
