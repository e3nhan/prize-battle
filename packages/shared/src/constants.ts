import type { BetType } from './types.js';

export const GAME_CONFIG = {
  MAX_PLAYERS: 8,
  INITIAL_CHIPS: 1000,

  // 計時
  BETTING_TIME: 30,
  AUCTION_TIME: 20,
  REVEAL_TIME: 5,
  RESULT_DISPLAY_TIME: 4,
  PHASE_INTRO_TIME: 3,
  COUNTDOWN_START: 5,

  // 押注預測
  TOTAL_BETTING_ROUNDS: 6,
  MIN_BET_RATIO: 0.1,
  BETTING_ROUNDS: [
    'dice_high_low',
    'roulette',
    'coin_multiply',
    'mystery_pick',
    'dice_exact',
    'group_predict',
  ] as BetType[],

  // 拍賣戰
  TOTAL_AUCTION_ITEMS: 6,
  MIN_BID: 50,
  BOX_DISTRIBUTION: {
    diamond: 1,
    normal: 2,
    bomb: 2,
    mystery: 1,
  },

  // 獎金分配比例
  PRIZE_DISTRIBUTION: [0.35, 0.25, 0.15, 0.10, 0.08, 0.05, 0.02, 0.00],

  // 頭像池
  AVATARS: ['🦊', '🐱', '🐶', '🐼', '🐨', '🦁', '🐯', '🐸', '🐙', '🦄', '🐲', '🦅'],
} as const;

export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const DICE_ODDS = {
  high_low: 1.0,
  exact_2: 15,
  exact_3: 8,
  exact_4: 5,
  exact_5: 3.5,
  exact_6: 2.5,
  exact_7: 2,
  exact_8: 2.5,
  exact_9: 3.5,
  exact_10: 5,
  exact_11: 8,
  exact_12: 15,
  range_low: 2,
  range_mid: 2,
  range_high: 2,
} as const;

export const ROULETTE_SEGMENTS = [
  { id: 'seg1', label: '紅1', color: '#e74c3c', odds: 5, size: 1 },
  { id: 'seg2', label: '藍2', color: '#3498db', odds: 5, size: 1 },
  { id: 'seg3', label: '綠3', color: '#2ecc71', odds: 2, size: 2 },
  { id: 'seg4', label: '黃4', color: '#f1c40f', odds: 2, size: 2 },
  { id: 'seg5', label: '紫5', color: '#9b59b6', odds: 5, size: 1 },
  { id: 'seg6', label: '橙6', color: '#e67e22', odds: 2, size: 2 },
  { id: 'seg7', label: '粉7', color: '#e91e8a', odds: 5, size: 1 },
  { id: 'seg8', label: '白8', color: '#ecf0f1', odds: 2, size: 2 },
] as const;

export const BOX_HINTS = {
  diamond: [
    '這個箱子異常沉重',
    '隱約發出金光',
    '表面刻有鑽石圖案',
    '拿起來感覺很有分量',
  ],
  normal: [
    '裡面有東西在滾動',
    '大小適中',
    '看起來很普通',
    '搖晃起來有聲響',
  ],
  bomb: [
    '傳來滴答聲',
    '表面有裂痕',
    '摸起來微微發燙',
    '散發著硫磺味',
  ],
  mystery: [
    '箱子在微微震動',
    '上面寫著問號',
    '不斷變換顏色',
    '發出神秘的嗡嗡聲',
  ],
} as const;

export const MISLEAD_RATE = 0.3;

export const CALC_CONFIG = {
  MAX_PLAYERS: 20,
  DEFAULT_INITIAL_CHIPS: 0,
  MAX_TRANSACTIONS: 200,
} as const;
