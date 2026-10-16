import { describe, expect, it } from 'vitest';
import { avatarKey, avatarName } from '../src/components/avatars';
import { AVATAR_KEYS } from '../src/lib/defaults';

describe('avatarKey', () => {
  it('新資料：頭像代號原樣使用', () => {
    for (const k of AVATAR_KEYS) expect(avatarKey(k)).toBe(k);
  });

  it('舊資料：emoji 對應到頭像（含有沒有 VS16 的寫法）', () => {
    expect(avatarKey('🐉')).toBe('dragon');
    expect(avatarKey('🦈')).toBe('shark');
    expect(avatarKey('🌪️')).toBe('tornado');
    expect(avatarKey('🌪')).toBe('tornado');
    expect(avatarKey('⚔️')).toBe('swords');
    expect(avatarKey('☄️')).toBe('comet');
  });

  it('沒有或不認得的值用陀螺', () => {
    expect(avatarKey(undefined)).toBe('bey');
    expect(avatarKey('')).toBe('bey');
    expect(avatarKey('🍕')).toBe('bey');
    expect(avatarName('🍕')).toBe('陀螺');
  });
});
