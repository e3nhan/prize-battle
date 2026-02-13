import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = process.env.SCRATCH_DATA_DIR || join(__dirname, '../data');
const DATA_FILE = join(DATA_DIR, 'scratch-records.json');

export interface ScratchType {
  id: string;
  name: string;
  price: number;
  winRate?: number;         // 官方整體中獎率 (%)
  jackpot?: number;         // 最高獎金
  jackpotCount?: number;    // 頭獎數量
  jackpotRate?: number;     // 頭獎率 (%)
  profitRate?: number;      // 賺錢率 (%)（中獎金額 > 面額的機率）
  expectedReturn?: number;  // 回本率 (%)（期望報酬率）
  expectedValue?: number;   // 期望值（元），通常為負數
}

export interface ScratchRecord {
  id: string;
  person: string;
  scratchTypeId: string;
  prize: number; // 中獎金額，0 = 沒中
  timestamp: number;
}

export interface ScratchData {
  people: string[];
  scratchTypes: ScratchType[];
  records: ScratchRecord[];
}

// 預設資料：重新部署時若無持久化儲存，至少有初始人員與種類
const DEFAULT_DATA: ScratchData = {
  people: ['韓宗錡', '陳源德', '江家同', '羅致遠', '蘇彥齊', '林東餘', '趙偉康', '李祐德'],
  scratchTypes: [
    // 100 元
    { id: 'caiyuan-100', name: '財源滾滾', price: 100, jackpot: 300000, jackpotCount: 7, jackpotRate: 0.000086, winRate: 33.00, profitRate: 13.20, expectedReturn: 33.00, expectedValue: -37.00 },
    { id: 'horse-100', name: '馬年行大運', price: 100, jackpot: 50000, jackpotCount: 150, jackpotRate: 0.0018, winRate: 50.10, profitRate: 3.42, expectedReturn: 50.10, expectedValue: -38.02 },
    { id: 'pushcoin-100', name: '推金幣', price: 100, jackpot: 500000, jackpotCount: 8, jackpotRate: 0.0001, winRate: 30.00, profitRate: 16.36, expectedReturn: 30.00 },
    { id: 'caishen-100', name: '財神報到', price: 100, jackpot: 600000, jackpotCount: 8, jackpotRate: 0.00012, winRate: 32.00, profitRate: 12.00, expectedReturn: 32.00 },
    { id: 'bingo-100', name: '歡樂賓果', price: 100, jackpot: 300000, jackpotRate: 0.0001, winRate: 33.00, profitRate: 11.85, expectedReturn: 33.00, expectedValue: -37.03 },
    { id: 'jintianmi-100', name: '金甜蜜', price: 100, jackpot: 300000, jackpotRate: 0.000087, winRate: 33.00, profitRate: 13.36, expectedReturn: 33.00, expectedValue: -37.27 },
    // 200 元
    { id: 'goldhorse-200', name: '金馬報喜', price: 200, jackpot: 2000000, jackpotCount: 550, jackpotRate: 0.00719, winRate: 50.35, profitRate: 14.24, expectedReturn: 50.35, expectedValue: -70.14 },
    { id: 'golddiamond-200', name: '金好鑽', price: 200, jackpot: 2000000, jackpotCount: 8, jackpotRate: 0.000107, winRate: 34.50, profitRate: 18.89, expectedReturn: 34.50, expectedValue: -68.01 },
    { id: 'sanyuan-200', name: '大三元', price: 200, jackpot: 2000000, jackpotCount: 7, jackpotRate: 0.000092, winRate: 34.00, profitRate: 16.32, expectedReturn: 34.00, expectedValue: -65.99 },
    { id: 'lucky-200', name: '好運連發', price: 200, jackpot: 2000000, jackpotCount: 7, jackpotRate: 0.00011, winRate: 36.00, profitRate: 15.76, expectedReturn: 36.00 },
    { id: 'double-200', name: '獎金樂翻倍', price: 200, jackpot: 2000000, jackpotCount: 8, jackpotRate: 0.00013, winRate: 31.00, profitRate: 17.06, expectedReturn: 31.00 },
    { id: 'nianjhong-200', name: '百萬年終獎金', price: 200, jackpot: 1000000, jackpotRate: 0.0013, winRate: 33.72, profitRate: 16.73, expectedReturn: 33.72, expectedValue: -67.09 },
    { id: 'haoyun-200', name: '好運強強滾', price: 200, jackpot: 2000000, jackpotRate: 0.000087, winRate: 35.00, profitRate: 18.00, expectedReturn: 35.00, expectedValue: -76.04 },
    { id: 'jianian-200', name: '獎金嘉年華', price: 200, jackpot: 2000000, jackpotRate: 0.000065, winRate: 30.10, profitRate: 30.10, expectedReturn: 30.10, expectedValue: -68.03 },
    { id: 'jinzuan-200', name: '金鑽寶盒', price: 200, jackpot: 2000000, jackpotRate: 0.000065, winRate: 34.00, profitRate: 17.61, expectedReturn: 34.00, expectedValue: -69.21 },
    { id: 'yilufa-200', name: '一路發', price: 200, jackpot: 2000000, jackpotRate: 0.000109, winRate: 30.25, profitRate: 13.93, expectedReturn: 30.25, expectedValue: -70.04 },
    { id: 'jiabei-200', name: '加倍旺', price: 200, jackpot: 2000000, jackpotRate: 0.000066, winRate: 29.00, profitRate: 13.12, expectedReturn: 29.00, expectedValue: -70.02 },
    { id: 'guagua-200', name: '刮刮金樂透', price: 200, jackpot: 2000000, jackpotRate: 0.000112, winRate: 31.60, profitRate: 13.88, expectedReturn: 31.60, expectedValue: -66.04 },
    { id: 'jinwuji-200', name: '金五吉', price: 200, jackpot: 2000000, jackpotRate: 0.000087, winRate: 32.00, profitRate: 16.81, expectedReturn: 32.00, expectedValue: -65.98 },
    { id: 'xingji-200', name: '星際尋寶', price: 200, jackpot: 2000000, jackpotRate: 0.000091, winRate: 33.00, profitRate: 16.17, expectedReturn: 33.00, expectedValue: -75.95 },
    { id: 'huanle-200', name: '歡樂雙星', price: 200, jackpot: 2000000, jackpotRate: 0.000087, winRate: 31.99, profitRate: 14.37, expectedReturn: 31.99, expectedValue: -76.06 },
    { id: 'xingyun-200', name: '幸運接龍', price: 200, jackpot: 2000000, jackpotRate: 0.000078, winRate: 32.00, profitRate: 18.26, expectedReturn: 32.00, expectedValue: -76.03 },
    // 300 元
    { id: 'ocean-300', name: '海底大尋寶', price: 300, jackpot: 3000000, jackpotCount: 5, jackpotRate: 0.000049, winRate: 36.00, profitRate: 19.57, expectedReturn: 36.00, expectedValue: -99.35 },
    { id: 'chaopiao-300', name: '鈔票一把抓', price: 300, jackpot: 3000000, jackpotRate: 0.000098, winRate: 37.04, profitRate: 13.23, expectedReturn: 37.04, expectedValue: -99.10 },
    { id: 'wudi-300', name: '無敵威力', price: 300, jackpot: 3000000, jackpotRate: 0.000045, winRate: 36.00, profitRate: 18.40, expectedReturn: 36.00, expectedValue: -105.03 },
    // 500 元
    { id: 'goldhorseaward-500', name: '金馬獎', price: 500, jackpot: 3000000, jackpotCount: 14, jackpotRate: 0.000187, winRate: 100.00, profitRate: 14.44, expectedReturn: 38.44 },
    { id: 'wulu-500', name: '五路財神', price: 500, jackpot: 5000000, jackpotCount: 8, jackpotRate: 0.000123, winRate: 40.72, profitRate: 14.79, expectedReturn: 40.72, expectedValue: -150.00 },
    { id: 'hachu-500', name: '哈啾咪', price: 500, jackpot: 5000000, jackpotCount: 4, jackpotRate: 0.00008, winRate: 42.02, profitRate: 13.22, expectedReturn: 42.02 },
    { id: 'jinpai777-500', name: '金牌777', price: 500, jackpot: 5000000, jackpotRate: 0.000114, winRate: 40.02, profitRate: 18.02, expectedReturn: 40.02, expectedValue: -150.01 },
    // 1000 元
    { id: 'dajili-1000', name: '1200萬大吉利', price: 1000, jackpot: 12000000, jackpotCount: 8, jackpotRate: 0.000084, winRate: 70.00, profitRate: 19.07, expectedReturn: 37.47, expectedValue: -260.00 },
    // 2000 元
    { id: 'hongbao-2000', name: '2000萬超級紅包', price: 2000, jackpot: 20000000, jackpotCount: 10, jackpotRate: 0.000087, winRate: 69.33, profitRate: 10.29, expectedReturn: 29.33, expectedValue: -499.98 },
  ],
  records: [],
};

function load(): ScratchData {
  if (!existsSync(DATA_FILE)) {
    // 首次啟動：用預設資料建立檔案
    save(DEFAULT_DATA);
    return DEFAULT_DATA;
  }
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return DEFAULT_DATA;
  }
}

function save(data: ScratchData) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ===== People =====
export function getPeople(): string[] {
  return load().people;
}

export function setPeople(people: string[]): string[] {
  const data = load();
  data.people = people;
  save(data);
  return data.people;
}

// ===== Scratch Types =====
export function getScratchTypes(): ScratchType[] {
  return load().scratchTypes;
}

export function setScratchTypes(types: ScratchType[]): ScratchType[] {
  const data = load();
  data.scratchTypes = types;
  save(data);
  return data.scratchTypes;
}

// ===== Records =====
export function getRecords(): ScratchRecord[] {
  return load().records;
}

export function addRecord(record: Omit<ScratchRecord, 'id' | 'timestamp'>): ScratchRecord {
  const data = load();
  const newRecord: ScratchRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  data.records.push(newRecord);
  save(data);
  return newRecord;
}

export function deleteRecord(id: string): boolean {
  const data = load();
  const idx = data.records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  data.records.splice(idx, 1);
  save(data);
  return true;
}

export function getAllData(): ScratchData {
  return load();
}
