import type { Award, BracketDoc, PredictionDoc } from '../types';
import { computePodium } from './advance';
import { topIds } from './awards';

/** 有效的票：投票者與被猜的人都是參賽選手。 */
export function validPredictions(preds: PredictionDoc[], playerIds: string[]): PredictionDoc[] {
  const ok = new Set(playerIds);
  return preds.filter((p) => ok.has(p.voterId) && ok.has(p.pickId));
}

/** 每位選手被猜冠軍的票數，由多到少（同票依參賽順序）。 */
export function tallyPredictions(preds: PredictionDoc[], playerIds: string[]): { id: string; votes: number }[] {
  const counts = new Map<string, number>();
  for (const p of validPredictions(preds, playerIds)) counts.set(p.pickId, (counts.get(p.pickId) ?? 0) + 1);
  return playerIds
    .filter((id) => counts.has(id))
    .map((id) => ({ id, votes: counts.get(id)! }))
    .sort((a, b) => b.votes - a.votes);
}

/** 小預言家（猜中冠軍的人）、人氣王（被猜最多次的人）。冠軍未確定時只算人氣王。 */
export function predictionAwards(b: BracketDoc, preds: PredictionDoc[]): Award[] {
  const valid = validPredictions(preds, b.playerIds);
  if (valid.length === 0) return [];
  const awards: Award[] = [];
  const champion = computePodium(b)?.first;
  const prophets = champion ? valid.filter((p) => p.pickId === champion).map((p) => p.voterId) : [];
  if (prophets.length) awards.push({ key: 'prophet', label: '小預言家', entryIds: prophets });
  const counts: Record<string, number> = {};
  for (const p of valid) counts[p.pickId] = (counts[p.pickId] ?? 0) + 1;
  const popular = topIds(counts);
  if (popular.length) awards.push({ key: 'popular', label: '人氣王', entryIds: popular });
  return awards;
}
