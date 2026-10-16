import type { FinishType } from '../types';

// 音效全部用 Web Audio 即時合成：不需要音檔、不佔 GitHub Pages 空間。
// 瀏覽器規定要使用者點過畫面才能發聲，所以大螢幕要先點一次「開啟音效」（unlockAudio）。

let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return undefined;
  ctx = new Ctor();
  return ctx;
}

/** 必須在點擊事件裡呼叫。 */
export async function unlockAudio(): Promise<boolean> {
  const a = audio();
  if (!a) return false;
  if (a.state !== 'running') await a.resume().catch(() => undefined);
  return a.state === 'running';
}

export function isAudioReady(): boolean {
  return ctx?.state === 'running';
}

function tone(a: AudioContext, opts: { at: number; dur: number; freq: number; to?: number; type?: OscillatorType; gain?: number }) {
  const t0 = a.currentTime + opts.at;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.25, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.05);
}

function noise(a: AudioContext, opts: { at: number; dur: number; gain?: number; filter?: number; filterTo?: number }) {
  const t0 = a.currentTime + opts.at;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * opts.dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(opts.filter ?? 2000, t0);
  if (opts.filterTo) f.frequency.exponentialRampToValueAtTime(opts.filterTo, t0 + opts.dur);
  const g = a.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.4, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

export type SoundKind = FinishType | 'win' | 'achievement';

export function playSound(kind: SoundKind): void {
  const a = audio();
  if (!a || a.state !== 'running') return;
  switch (kind) {
    case 'spin':
      tone(a, { at: 0, dur: 0.18, freq: 660, type: 'triangle' });
      tone(a, { at: 0.12, dur: 0.3, freq: 990, type: 'triangle' });
      break;
    case 'over':
      noise(a, { at: 0, dur: 0.5, gain: 0.35, filter: 400, filterTo: 4000 });
      tone(a, { at: 0.05, dur: 0.45, freq: 260, to: 90, type: 'square', gain: 0.12 });
      break;
    case 'burst':
      noise(a, { at: 0, dur: 0.6, gain: 0.6, filter: 3000, filterTo: 200 });
      tone(a, { at: 0, dur: 0.5, freq: 120, to: 40, type: 'square', gain: 0.25 });
      break;
    case 'xtreme':
      tone(a, { at: 0, dur: 0.45, freq: 180, to: 1400, type: 'sawtooth', gain: 0.15 });
      noise(a, { at: 0.45, dur: 0.7, gain: 0.6, filter: 2500, filterTo: 120 });
      tone(a, { at: 0.45, dur: 0.6, freq: 90, to: 35, type: 'sine', gain: 0.5 });
      [523, 659, 784, 1047].forEach((f) => tone(a, { at: 0.6, dur: 0.6, freq: f, type: 'triangle', gain: 0.1 }));
      break;
    case 'win':
      [523, 659, 784].forEach((f, i) => tone(a, { at: i * 0.13, dur: 0.18, freq: f, type: 'triangle', gain: 0.22 }));
      [523, 659, 784, 1047].forEach((f) => tone(a, { at: 0.42, dur: 0.9, freq: f, type: 'triangle', gain: 0.12 }));
      break;
    case 'achievement':
      [880, 1175, 1568].forEach((f, i) => tone(a, { at: i * 0.08, dur: 0.25, freq: f, type: 'sine', gain: 0.15 }));
      break;
  }
}
