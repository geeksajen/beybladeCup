import type { Award } from '../types';
import { Icon, type IconName } from './icons';

/** 各獎項的圖示與顏色；主辦自訂的獎項用彩帶獎章。 */
const AWARD_ICONS: Record<string, { icon: IconName; color: string }> = {
  champion: { icon: 'trophy', color: 'text-gold' },
  runnerUp: { icon: 'medal', color: 'text-silver' },
  third: { icon: 'medal', color: 'text-bronze' },
  xtreme: { icon: 'xtreme', color: 'text-xtreme' },
  burst: { icon: 'burst', color: 'text-accent' },
  prophet: { icon: 'crystal', color: 'text-xtreme' },
  popular: { icon: 'star', color: 'text-gold' },
  bestName: { icon: 'tag', color: 'text-primary' },
};
const CUSTOM = { icon: 'rosette', color: 'text-gold' } as const;

export function awardIcon(key: string) {
  return AWARD_ICONS[key] ?? CUSTOM;
}

/** 舊資料的獎項名稱前面有 emoji（例如「🏆 冠軍」），顯示時拿掉，改用圖示。 */
export function plainLabel(label: string): string {
  return label.replace(/^(?:\p{Extended_Pictographic}|️|‍)+\s*/u, '');
}

export function AwardTitle({ award, className = '' }: { award: Pick<Award, 'key' | 'label'>; className?: string }) {
  const { icon, color } = awardIcon(award.key);
  return (
    <span className={`inline-flex items-center gap-[0.35em] ${className}`}>
      <Icon name={icon} className={color} />
      <span>{plainLabel(award.label)}</span>
    </span>
  );
}
