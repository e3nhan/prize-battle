import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;

interface ScratchType {
  id: string;
  name: string;
  price: number;
}

interface ScratchRecord {
  id: string;
  person: string;
  scratchTypeId: string;
  prize: number;
  timestamp: number;
}

interface ScratchData {
  people: string[];
  scratchTypes: ScratchType[];
  records: ScratchRecord[];
}

type Tab = 'add' | 'history' | 'stats' | 'settings';

export default function ScratchTracker({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<ScratchData>({ people: [], scratchTypes: [], records: [] });
  const [tab, setTab] = useState<Tab>('add');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/scratch`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">載入中...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button onClick={onBack} className="text-gray-400 text-2xl">←</button>
        <h1 className="text-xl font-bold text-neon-green">🎫 刮刮樂記錄器</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {([
          ['add', '登記'],
          ['history', '記錄'],
          ['stats', '統計'],
          ['settings', '設定'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === key ? 'text-neon-green border-b-2 border-neon-green' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {tab === 'add' && <AddTab data={data} onRefresh={fetchData} />}
            {tab === 'history' && <HistoryTab data={data} onRefresh={fetchData} />}
            {tab === 'stats' && <StatsTab data={data} />}
            {tab === 'settings' && <SettingsTab data={data} onRefresh={fetchData} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ===== 登記 Tab =====
function AddTab({ data, onRefresh }: { data: ScratchData; onRefresh: () => void }) {
  const [person, setPerson] = useState('');
  const [typeId, setTypeId] = useState('');
  const [prize, setPrize] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (data.people.length === 0 || data.scratchTypes.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p className="text-lg mb-2">請先到「設定」新增人員和刮刮樂種類</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!person || !typeId) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/scratch/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person, scratchTypeId: typeId, prize: Number(prize) || 0 }),
      });
      setPrize('');
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = data.scratchTypes.find((t) => t.id === typeId);

  return (
    <div className="space-y-5">
      {/* 選人 */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">誰刮的？</label>
        <div className="flex flex-wrap gap-2">
          {data.people.map((p) => (
            <button
              key={p}
              onClick={() => setPerson(p)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                person === p
                  ? 'bg-neon-green/20 border-2 border-neon-green text-neon-green'
                  : 'bg-secondary border-2 border-white/10 text-gray-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 選刮刮樂 */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">刮哪種？</label>
        <div className="flex flex-wrap gap-2">
          {data.scratchTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeId(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                typeId === t.id
                  ? 'bg-gold/20 border-2 border-gold text-gold'
                  : 'bg-secondary border-2 border-white/10 text-gray-400'
              }`}
            >
              {t.name} (${t.price})
            </button>
          ))}
        </div>
      </div>

      {/* 中獎金額 */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">
          中獎金額 {selectedType && <span className="text-gold">(花費 ${selectedType.price})</span>}
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          placeholder="0 = 沒中"
          className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-white/10
            text-white text-lg focus:border-neon-green/50 focus:outline-none"
        />
      </div>

      {/* 送出 */}
      <button
        onClick={handleSubmit}
        disabled={!person || !typeId || submitting}
        className="w-full py-4 rounded-xl text-lg font-bold transition-all active:scale-95
          bg-neon-green/80 text-primary disabled:opacity-30 disabled:active:scale-100"
      >
        {submitting ? '登記中...' : '登記'}
      </button>
    </div>
  );
}

// ===== 記錄 Tab =====
function HistoryTab({ data, onRefresh }: { data: ScratchData; onRefresh: () => void }) {
  const typeMap = Object.fromEntries(data.scratchTypes.map((t) => [t.id, t]));
  const sorted = [...data.records].sort((a, b) => b.timestamp - a.timestamp);

  const handleDelete = async (id: string) => {
    await fetch(`${API}/api/scratch/records/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  if (sorted.length === 0) {
    return <p className="text-center py-10 text-gray-500">還沒有記錄</p>;
  }

  return (
    <div className="space-y-2">
      {sorted.map((r) => {
        const t = typeMap[r.scratchTypeId];
        const net = r.prize - (t?.price ?? 0);
        return (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{r.person}</span>
                <span className="text-sm text-gray-500">{t?.name ?? '?'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">花 ${t?.price ?? '?'}</span>
                <span className={r.prize > 0 ? 'text-gold font-bold' : 'text-gray-500'}>
                  中 ${r.prize}
                </span>
                <span className={net >= 0 ? 'text-neon-green' : 'text-accent'}>
                  {net >= 0 ? '+' : ''}{net}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-gray-600">
              {new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              onClick={() => handleDelete(r.id)}
              className="text-gray-600 hover:text-accent text-lg ml-1"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ===== 統計 Tab =====
function StatsTab({ data }: { data: ScratchData }) {
  const typeMap = Object.fromEntries(data.scratchTypes.map((t) => [t.id, t]));

  // 每人統計
  const personStats = data.people.map((p) => {
    const records = data.records.filter((r) => r.person === p);
    const spent = records.reduce((sum, r) => sum + (typeMap[r.scratchTypeId]?.price ?? 0), 0);
    const won = records.reduce((sum, r) => sum + r.prize, 0);
    return { person: p, count: records.length, spent, won, net: won - spent };
  });

  // 每種刮刮樂統計
  const typeStats = data.scratchTypes.map((t) => {
    const records = data.records.filter((r) => r.scratchTypeId === t.id);
    const totalSpent = records.length * t.price;
    const totalWon = records.reduce((sum, r) => sum + r.prize, 0);
    const winCount = records.filter((r) => r.prize > 0).length;
    return { type: t, count: records.length, totalSpent, totalWon, winCount, net: totalWon - totalSpent };
  });

  const totalSpent = personStats.reduce((s, p) => s + p.spent, 0);
  const totalWon = personStats.reduce((s, p) => s + p.won, 0);

  return (
    <div className="space-y-6">
      {/* 總計 */}
      <div className="p-4 rounded-xl bg-secondary text-center">
        <p className="text-gray-400 text-sm mb-1">全體損益</p>
        <p className={`text-3xl font-black ${totalWon - totalSpent >= 0 ? 'text-neon-green' : 'text-accent'}`}>
          {totalWon - totalSpent >= 0 ? '+' : ''}{totalWon - totalSpent}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          花 ${totalSpent} / 中 ${totalWon} / 共 {data.records.length} 張
        </p>
      </div>

      {/* 個人 */}
      <div>
        <h3 className="text-sm text-gray-400 mb-2 font-bold">個人統計</h3>
        <div className="space-y-2">
          {personStats.map((s) => (
            <div key={s.person} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
              <div>
                <span className="font-bold text-white">{s.person}</span>
                <span className="text-sm text-gray-500 ml-2">{s.count} 張</span>
              </div>
              <div className="text-right">
                <span className={`font-bold ${s.net >= 0 ? 'text-neon-green' : 'text-accent'}`}>
                  {s.net >= 0 ? '+' : ''}{s.net}
                </span>
                <div className="text-xs text-gray-500">花 ${s.spent} / 中 ${s.won}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 刮刮樂種類 */}
      {typeStats.length > 0 && (
        <div>
          <h3 className="text-sm text-gray-400 mb-2 font-bold">各種類統計</h3>
          <div className="space-y-2">
            {typeStats.map((s) => (
              <div key={s.type.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary">
                <div>
                  <span className="font-bold text-white">{s.type.name}</span>
                  <span className="text-sm text-gray-500 ml-2">${s.type.price} × {s.count}</span>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${s.net >= 0 ? 'text-neon-green' : 'text-accent'}`}>
                    {s.net >= 0 ? '+' : ''}{s.net}
                  </span>
                  <div className="text-xs text-gray-500">
                    中獎率 {s.count > 0 ? Math.round((s.winCount / s.count) * 100) : 0}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 設定 Tab =====
function SettingsTab({ data, onRefresh }: { data: ScratchData; onRefresh: () => void }) {
  const [peopleText, setPeopleText] = useState(data.people.join('\n'));
  const [types, setTypes] = useState<ScratchType[]>(
    data.scratchTypes.length > 0 ? data.scratchTypes : [{ id: crypto.randomUUID(), name: '', price: 0 }]
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const people = peopleText.split('\n').map((s) => s.trim()).filter(Boolean);
      const validTypes = types.filter((t) => t.name.trim());

      await Promise.all([
        fetch(`${API}/api/scratch/people`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ people }),
        }),
        fetch(`${API}/api/scratch/types`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ types: validTypes }),
        }),
      ]);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const addType = () => {
    setTypes([...types, { id: crypto.randomUUID(), name: '', price: 0 }]);
  };

  const updateType = (idx: number, field: 'name' | 'price', value: string) => {
    const next = [...types];
    if (field === 'price') {
      next[idx] = { ...next[idx], price: Number(value) || 0 };
    } else {
      next[idx] = { ...next[idx], [field]: value };
    }
    setTypes(next);
  };

  const removeType = (idx: number) => {
    setTypes(types.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* 人員 */}
      <div>
        <label className="block text-sm text-gray-400 mb-2 font-bold">人員名單（一行一人）</label>
        <textarea
          value={peopleText}
          onChange={(e) => setPeopleText(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-white/10
            text-white focus:border-neon-green/50 focus:outline-none resize-none"
          placeholder="小明&#10;小華&#10;小美"
        />
      </div>

      {/* 刮刮樂種類 */}
      <div>
        <label className="block text-sm text-gray-400 mb-2 font-bold">刮刮樂種類</label>
        <div className="space-y-2">
          {types.map((t, i) => (
            <div key={t.id} className="flex gap-2">
              <input
                value={t.name}
                onChange={(e) => updateType(i, 'name', e.target.value)}
                placeholder="名稱"
                className="flex-1 px-3 py-2 rounded-lg bg-secondary border-2 border-white/10
                  text-white text-sm focus:border-neon-green/50 focus:outline-none"
              />
              <input
                type="number"
                inputMode="numeric"
                value={t.price || ''}
                onChange={(e) => updateType(i, 'price', e.target.value)}
                placeholder="價格"
                className="w-24 px-3 py-2 rounded-lg bg-secondary border-2 border-white/10
                  text-white text-sm focus:border-neon-green/50 focus:outline-none"
              />
              <button
                onClick={() => removeType(i)}
                className="text-gray-600 hover:text-accent text-xl px-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addType}
          className="mt-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-sm
            hover:bg-white/10 transition-colors"
        >
          + 新增種類
        </button>
      </div>

      {/* 儲存 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-xl text-lg font-bold transition-all active:scale-95
          bg-neon-green/80 text-primary disabled:opacity-30"
      >
        {saving ? '儲存中...' : '儲存設定'}
      </button>
    </div>
  );
}
