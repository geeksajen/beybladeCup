// 從 Beydex 公開資料同步 Beyblade X 零件清單 → src/data/parts.generated.json
//
// 用法：npm run sync-parts            （下載最新版）
//       npm run sync-parts -- --file 路徑 （用本機檔案）
//
// 來源：https://github.com/catgamer109/Beydex-Public-Resources （社群維護，沒有正式授權條款；README 表示公開給社群使用）
// 安全：來源是 TypeScript 程式碼，這裡「只當文字解析」，絕不 import／eval。
// 跑完請用 git diff 檢查變動，再補 src/data/parts-zh.ts 的中文名稱。

import { readFile, writeFile } from 'node:fs/promises';

const REPO = 'catgamer109/Beydex-Public-Resources';
const RAW = `https://raw.githubusercontent.com/${REPO}/refs/heads/main/beyblade-data.ts`;
const OUT = new URL('../src/data/parts.generated.json', import.meta.url);
const ZH = new URL('../src/data/parts-zh.ts', import.meta.url);

/** 從 start（指向 `{`）開始做括號配對，跳過字串內容，回傳整個物件文字。 */
function sliceObject(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === '\\') i++;
    } else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`unbalanced object at ${start}`);
}

/** 把 `getPartImage(...)` 之類的函式呼叫換成 null（同樣跳過字串），讓物件變成合法 JSON。 */
function stripCalls(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      const s = i;
      for (i++; i < src.length && src[i] !== '"'; i++) if (src[i] === '\\') i++;
      out += src.slice(s, i + 1);
      continue;
    }
    // 註解（字串外的 // 與 /* */）整段跳過
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i + 2) + 1;
      continue;
    }
    const call = /^[A-Za-z_][A-Za-z0-9_]*\(/.exec(src.slice(i, i + 64));
    if (call && !/[A-Za-z0-9_"]/.test(src[i - 1] ?? '')) {
      let depth = 0;
      let j = i + call[0].length - 1;
      for (; j < src.length; j++) {
        if (src[j] === '"') {
          for (j++; j < src.length && src[j] !== '"'; j++) if (src[j] === '\\') j++;
        } else if (src[j] === '(') depth++;
        else if (src[j] === ')' && --depth === 0) break;
      }
      out += 'null';
      i = j;
      continue;
    }
    out += ch;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

/** 取出所有「最上層的零件物件」：`{ "id": ..., "name": ..., "category": ... }`。 */
function parseParts(text) {
  const parts = [];
  const re = /\{\s*"id":\s*"[^"]+",\s*"name":\s*"[^"]+",\s*"category":/g;
  let m;
  while ((m = re.exec(text))) {
    const objText = sliceObject(text, m.index);
    try {
      parts.push(JSON.parse(stripCalls(objText)));
    } catch (err) {
      console.warn(`⚠️ 無法解析：${objText.slice(0, 80)}… (${err.message})`);
    }
    re.lastIndex = m.index + objText.length;
  }
  return parts;
}

/** "F (Flat)" → { abbr: 'F', en: 'Flat' }；"3-60" → { en: '3-60' } */
function splitAbbr(name) {
  const m = /^(\S+) \((.+)\)$/.exec(name);
  return m ? { abbr: m[1], en: m[2] } : { en: name };
}

const isTT = (p) => p.company === 'Takara Tomy';
const hasCX = (p) => (p.series ?? []).some((s) => s === 'CX' || s === 'CXE');

async function main() {
  const fileArg = process.argv.indexOf('--file');
  let text;
  let commit = { sha: 'local-file', date: '' };
  if (fileArg > 0) {
    text = await readFile(process.argv[fileArg + 1], 'utf8');
  } else {
    console.log(`下載 ${RAW}`);
    text = await (await fetch(RAW)).text();
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/commits?path=beyblade-data.ts&per_page=1`);
      const [c] = await res.json();
      commit = { sha: c.sha.slice(0, 7), date: c.commit.author.date.slice(0, 10) };
    } catch {
      console.warn('⚠️ 取不到來源 commit（GitHub API 限流？），版本記為 unknown');
      commit = { sha: 'unknown', date: '' };
    }
  }

  const all = parseParts(text);
  const byId = new Map(all.map((p) => [p.id, p]));
  console.log(`解析 ${all.length} 筆`);

  // Hasbro 名稱 → 對應的 Takara Tomy 零件別名（雙向的 identicalId 都看）
  const aliases = new Map();
  const addAlias = (ttId, name) => {
    if (!aliases.has(ttId)) aliases.set(ttId, new Set());
    aliases.get(ttId).add(name);
  };
  for (const p of all) {
    for (const otherId of p.identicalId ?? []) {
      const other = byId.get(otherId);
      if (!other) continue;
      if (isTT(p) && !isTT(other)) addAlias(p.id, splitAbbr(other.name).en);
      if (!isTT(p) && isTT(other)) addAlias(other.id, splitAbbr(p.name).en);
    }
  }

  const out = { blade: [], ratchet: [], bit: [], lockChip: [], assistBlade: [], overBlade: [] };
  const seen = new Set();
  const push = (kind, def) => {
    const key = `${kind}:${def.en.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out[kind].push(def);
  };
  const common = (p) => ({
    ...(p.type ? { type: p.type } : {}),
    ...(aliases.get(p.id)?.size ? { aliases: [...aliases.get(p.id)].sort() } : {}),
  });

  for (const p of all) {
    if (!isTT(p) || p.comingSoon) continue;
    const { en, abbr } = splitAbbr(p.name);
    switch (p.category) {
      case 'Blade':
        if (p.name.includes('(')) break; // 「(Version 2.0)」之類的版本差異視為同一個零件
        push('blade', { en, ...(hasCX(p) ? { cx: true } : {}), ...common(p) });
        break;
      case 'Metal Blade':
        push('blade', { en, cx: true, ...common(p) });
        break;
      case 'Ratchet':
        push('ratchet', { en, ...(abbr ? { abbr } : {}), ...(p.type === 'Fusion' ? { fusion: true } : {}), ...common(p) });
        break;
      case 'Bit':
        push('bit', { en, ...(abbr ? { abbr } : {}), ...common(p) });
        break;
      case 'Lock Chip':
        if (!p.name.includes('(')) push('lockChip', { en, ...common(p) });
        break;
      case 'Assist Blade':
        push('assistBlade', { en, ...(abbr ? { abbr } : {}), ...common(p) });
        break;
      case 'Over Blade':
        push('overBlade', { en, ...(abbr ? { abbr } : {}), ...common(p) });
        break;
    }
  }

  // 原廠組合：完整陀螺 → 各零件（CX 的 Full Blade 再展開）
  const KIND = { Blade: 'blade', 'Metal Blade': 'blade', Ratchet: 'ratchet', Bit: 'bit', 'Lock Chip': 'lockChip', 'Assist Blade': 'assistBlade', 'Over Blade': 'overBlade' };
  const beys = [];
  for (const p of all) {
    if (p.category !== 'Beyblades' || !isTT(p) || p.comingSoon) continue;
    const combo = {};
    const add = (partId) => {
      const part = byId.get(partId);
      if (!part) return false;
      if (part.category === 'Full Blade') return (part.contents ?? []).every((c) => add(c.partId));
      const kind = KIND[part.category];
      if (!kind) return true; // 發射器等配件
      const base = part.name.replace(/ \(Version [^)]*\)$/, '');
      combo[kind] = splitAbbr(base).en;
      return true;
    };
    if (!(p.contents ?? []).every((c) => add(c.partId))) continue;
    if (!combo.blade || !combo.ratchet) continue;
    beys.push({ code: p.id.replace(/^Beyblade_/, ''), name: p.name, ...(p.type ? { type: p.type } : {}), combo });
  }

  for (const list of Object.values(out)) list.sort((a, b) => a.en.localeCompare(b.en, 'en', { numeric: true }));
  const data = {
    source: { name: 'Beydex', url: `https://github.com/${REPO}`, commit: commit.sha, commitDate: commit.date, syncedAt: new Date().toISOString().slice(0, 10) },
    parts: out,
    beys,
  };
  await writeFile(OUT, JSON.stringify(data, null, 1) + '\n');
  console.log(Object.entries(out).map(([k, v]) => `${k} ${v.length}`).join('、') + `、原廠組合 ${beys.length}`);

  // 提醒還沒有中文名稱的零件
  const zhText = await readFile(ZH, 'utf8').catch(() => '');
  const missing = [];
  for (const [kind, list] of Object.entries(out)) {
    if (kind === 'ratchet') continue;
    for (const d of list) if (!zhText.includes(`'${d.en}':`)) missing.push(`${kind}:${d.en}`);
  }
  if (missing.length) console.log(`\n還沒有中文名稱（${missing.length}）→ 請補到 src/data/parts-zh.ts：\n  ${missing.join('\n  ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
