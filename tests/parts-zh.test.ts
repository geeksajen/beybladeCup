import { describe, expect, it } from 'vitest';
import { PARTS_ZH } from '../src/data/parts-zh';
import { CATALOG, normalizePart } from '../src/lib/parts';

describe('零件中文名稱', () => {
  it('同一類零件的中文名稱與別名不重複（輸入中文時才找得回英文名）', () => {
    for (const [kind, names] of Object.entries(PARTS_ZH)) {
      const seen = new Map<string, string>();
      for (const [en, z] of Object.entries(names!)) {
        for (const n of [z.zh, ...(z.alt ?? [])]) {
          expect(seen.get(n), `${kind}「${n}」同時用在 ${seen.get(n)} 與 ${en}`).toBeUndefined();
          seen.set(n, en);
        }
      }
    }
  });

  it('每個中文名稱都對得到清單裡的零件', () => {
    for (const [kind, names] of Object.entries(PARTS_ZH)) {
      const ens = new Set(CATALOG[kind as keyof typeof CATALOG].map((d) => d.en));
      for (const en of Object.keys(names!)) expect(ens.has(en), `${kind}:${en} 不在零件清單`).toBe(true);
    }
  });

  it('台灣名稱、舊暫譯、口語叫法都存成英文名', () => {
    expect(normalizePart('blade', '蒼龍神劍')).toBe('DranSword');
    expect(normalizePart('blade', '龍之劍')).toBe('DranSword');
    expect(normalizePart('blade', '榮耀女武神')).toBe('GloryValkyrie');
    expect(normalizePart('lockChip', '蒼龍')).toBe('Dran');
  });
});
