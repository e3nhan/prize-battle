import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../data');
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

function load(): ScratchData {
  if (!existsSync(DATA_FILE)) {
    return { people: [], scratchTypes: [], records: [] };
  }
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { people: [], scratchTypes: [], records: [] };
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
