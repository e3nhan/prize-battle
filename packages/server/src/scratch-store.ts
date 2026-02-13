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
    { id: 'caiyuan-100', name: '財源滾滾', price: 100 },
    { id: 'horse-100', name: '馬年行大運', price: 100 },
    { id: 'pushcoin-100', name: '推金幣', price: 100 },
    { id: 'caishen-100', name: '財神報到', price: 100 },
    { id: 'goldhorse-200', name: '金馬報喜', price: 200 },
    { id: 'golddiamond-200', name: '金好鑽', price: 200 },
    { id: 'sanyuan-200', name: '大三元', price: 200 },
    { id: 'lucky-200', name: '好運連發', price: 200 },
    { id: 'double-200', name: '獎金樂翻倍', price: 200 },
    { id: 'ocean-300', name: '海底大尋寶', price: 300 },
    { id: 'goldhorseaward-500', name: '金馬獎', price: 500 },
    { id: 'wulu-500', name: '五路財神', price: 500 },
    { id: 'hachu-500', name: '哈啾咪', price: 500 },
    { id: 'dajili-1000', name: '1200萬大吉利', price: 1000 },
    { id: 'hongbao-2000', name: '2000萬超級紅包', price: 2000 },
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
