import { useEffect, useRef, useState } from 'react';

const STEPS = ['3', '2', '1', 'Go Shoot!'];

/** 「3, 2, 1, Go Shoot!」全螢幕倒數。 */
export function Countdown({ onDone, title }: { onDone: () => void; title?: string }) {
  const [step, setStep] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (step >= STEPS.length) {
      done.current();
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === STEPS.length - 1 ? 1400 : 900);
    return () => clearTimeout(t);
  }, [step]);
  if (step >= STEPS.length) return null;
  const last = step === STEPS.length - 1;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur">
      {title && <div className="mb-6 px-4 text-center text-2xl font-bold text-slate-800 md:text-4xl">{title}</div>}
      <div
        key={step}
        className={`animate-pop font-display neon-text ${last ? 'text-6xl text-fuchsia-700 md:text-9xl' : 'text-[10rem] text-cyan-700 md:text-[16rem]'}`}
      >
        {STEPS[step]}
      </div>
    </div>
  );
}
