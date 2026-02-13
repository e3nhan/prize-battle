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
    { id: 'caiyuan-100', name: '財源滾滾', price: 100, jackpot: 300000, jackpotCount: 7, jackpotRate: 0.0000860, winRate: 33.00, profitRate: 13.20, expectedReturn: 33.00 },
    { id: 'horse-100', name: '馬年行大運', price: 100, jackpot: 50000, jackpotCount: 150, jackpotRate: 0.0018000, winRate: 50.10, profitRate: 3.42, expectedReturn: 50.10 },
    { id: 'pushcoin-100', name: '推金幣', price: 100, jackpot: 500000, jackpotCount: 8, jackpotRate: 0.0001000, winRate: 30.00, profitRate: 16.36, expectedReturn: 30.00 },
    { id: 'caishen-100', name: '財神報到', price: 100, jackpot: 600000, jackpotCount: 8, jackpotRate: 0.0001200, winRate: 32.00, profitRate: 12.00, expectedReturn: 32.00 },
    { id: 'goldhorse-200', name: '金馬報喜', price: 200, jackpot: 100000, jackpotCount: 550, jackpotRate: 0.0071900, winRate: 50.35, profitRate: 14.24, expectedReturn: 50.35 },
    { id: 'golddiamond-200', name: '金好鑽', price: 200, jackpot: 2000000, jackpotCount: 8, jackpotRate: 0.0001070, winRate: 34.50, profitRate: 18.89, expectedReturn: 34.50 },
    { id: 'sanyuan-200', name: '大三元', price: 200, jackpot: 2000000, jackpotCount: 7, jackpotRate: 0.0000920, winRate: 34.00, profitRate: 16.32, expectedReturn: 34.00 },
    { id: 'lucky-200', name: '好運連發', price: 200, jackpot: 2000000, jackpotCount: 7, jackpotRate: 0.0001100, winRate: 36.00, profitRate: 15.76, expectedReturn: 36.00 },
    { id: 'double-200', name: '獎金樂翻倍', price: 200, jackpot: 2000000, jackpotCount: 8, jackpotRate: 0.0001300, winRate: 31.00, profitRate: 17.06, expectedReturn: 31.00 },
    { id: 'ocean-300', name: '海底大尋寶', price: 300, jackpot: 3000000, jackpotCount: 5, jackpotRate: 0.0000490, winRate: 36.00, profitRate: 19.57, expectedReturn: 36.00 },
    { id: 'goldhorseaward-500', name: '金馬獎', price: 500, jackpot: 3000000, jackpotCount: 14, jackpotRate: 0.0001870, winRate: 100.00, profitRate: 14.44, expectedReturn: 38.44 },
    { id: 'wulu-500', name: '五路財神', price: 500, jackpot: 5000000, jackpotCount: 8, jackpotRate: 0.0001230, winRate: 40.72, profitRate: 14.79, expectedReturn: 40.72 },
    { id: 'hachu-500', name: '哈啾咪', price: 500, jackpot: 5000000, jackpotCount: 4, jackpotRate: 0.0000800, winRate: 42.02, profitRate: 13.22, expectedReturn: 42.02 },
    { id: 'dajili-1000', name: '1200萬大吉利', price: 1000, jackpot: 12000000, jackpotCount: 8, jackpotRate: 0.0000840, winRate: 70.00, profitRate: 19.07, expectedReturn: 37.47 },
    { id: 'hongbao-2000', name: '2000萬超級紅包', price: 2000, jackpot: 20000000, jackpotCount: 10, jackpotRate: 0.0000870, winRate: 69.33, profitRate: 10.29, expectedReturn: 29.33 },
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
