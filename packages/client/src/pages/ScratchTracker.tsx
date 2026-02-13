import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;

interface ScratchType {
  id: string;
  name: string;
  price: number;
  winRate?: number;         // 官方整體中獎率 (%)
  jackpot?: number;         // 最高獎金
  jackpotCount?: number;    // 頭獎數量
  jackpotRate?: number;     // 頭獎率 (%)
  profitRate?: number;      // 賺錢率 (%)
  expectedReturn?: number;  // 回本率 (%)
  expectedValue?: number;   // 期望值（元）
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
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);

  if (data.people.length === 0 || data.scratchTypes.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p className="text-lg mb-2">請先到「設定」新增人員和刮刮樂種類</p>
      </div>
    );
  }

  const selectedType = data.scratchTypes.find((t) => t.id === typeId);

  const handleSubmit = async () => {
    if (!person || !typeId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/scratch/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person, scratchTypeId: typeId, prize: Number(prize) || 0 }),
      });
      if (res.ok) {
        const prizeVal = Number(prize) || 0;
        const msg = prizeVal > 0
          ? `${person} — ${selectedType?.name} 中 $${prizeVal}！`
          : `${person} — ${selectedType?.name} 已登記`;
        setToast({ text: msg, key: Date.now() });
        setPrize('');
        navigator.vibrate?.(50);
        onRefresh();
      } else {
        setToast({ text: '登記失敗，請再試一次', key: Date.now() });
      }
    } catch {
      setToast({ text: '網路錯誤，請檢查連線', key: Date.now() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onAnimationComplete={() => setTimeout(() => setToast(null), 2000)}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl
              bg-neon-green/20 border border-neon-green/40 text-neon-green text-sm font-bold
              backdrop-blur-sm shadow-lg"
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

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
        {selectedType && (selectedType.winRate != null || selectedType.jackpot != null) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-2">
            {selectedType.winRate != null && <span>中獎率 {selectedType.winRate}%</span>}
            {selectedType.profitRate != null && <span>賺錢率 {selectedType.profitRate}%</span>}
            {selectedType.expectedReturn != null && <span>回本率 {selectedType.expectedReturn}%</span>}
            {selectedType.expectedValue != null && <span className="text-accent">期望值 {selectedType.expectedValue}元</span>}
            {selectedType.jackpot != null && <span>頭獎 ${selectedType.jackpot.toLocaleString()}</span>}
          </div>
        )}
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
      <motion.button
        onClick={handleSubmit}
        disabled={!person || !typeId || submitting}
        whileTap={{ scale: 0.95 }}
        className="w-full py-4 rounded-xl text-lg font-bold transition-colors
          bg-neon-green/80 text-primary disabled:opacity-30"
      >
        {submitting ? '登記中...' : '登記'}
      </motion.button>
    </div>
  );
}

// ===== 記錄 Tab =====
function HistoryTab({ data, onRefresh }: { data: ScratchData; onRefresh: () => void }) {
  const typeMap = Object.fromEntries(data.scratchTypes.map((t) => [t.id, t]));
  const sorted = [...data.records].sort((a, b) => b.timestamp - a.timestamp);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await fetch(`${API}/api/scratch/records/${id}`, { method: 'DELETE' });
    setConfirmId(null);
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
        const isConfirming = confirmId === r.id;
        return (
          <div key={r.id} className="relative overflow-hidden rounded-xl">
            <AnimatePresence>
              {isConfirming && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center gap-3
                    bg-black/80 backdrop-blur-sm rounded-xl"
                >
                  <span className="text-sm text-gray-300">確定刪除？</span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-bold"
                  >
                    刪除
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="px-4 py-1.5 rounded-lg bg-white/10 text-gray-300 text-sm font-bold"
                  >
                    取消
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-3 p-3 bg-secondary">
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
              <div className="text-right text-xs text-gray-600 leading-relaxed">
                <div>{new Date(r.timestamp).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</div>
                <div>{new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <button
                onClick={() => setConfirmId(r.id)}
                className="text-gray-600 active:text-accent text-xl px-1"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== 統計 Tab =====
function StatsTab({ data }: { data: ScratchData }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const typeMap = Object.fromEntries(data.scratchTypes.map((t) => [t.id, t]));

  // 每人統計（含詳細資料）
  const personStats = data.people.map((p) => {
    const records = data.records.filter((r) => r.person === p);
    const spent = records.reduce((sum, r) => sum + (typeMap[r.scratchTypeId]?.price ?? 0), 0);
    const won = records.reduce((sum, r) => sum + r.prize, 0);
    const winCount = records.filter((r) => r.prize > 0).length;
    const maxPrize = records.length > 0 ? Math.max(...records.map((r) => r.prize)) : 0;
    const roi = spent > 0 ? ((won - spent) / spent) * 100 : 0;

    // 各種類明細
    const byType = data.scratchTypes
      .map((t) => {
        const tRecords = records.filter((r) => r.scratchTypeId === t.id);
        if (tRecords.length === 0) return null;
        const tSpent = tRecords.length * t.price;
        const tWon = tRecords.reduce((sum, r) => sum + r.prize, 0);
        return { type: t, count: tRecords.length, spent: tSpent, won: tWon, net: tWon - tSpent };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return { person: p, count: records.length, spent, won, net: won - spent, winCount, maxPrize, roi, byType };
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
          {personStats.map((s) => {
            const isOpen = expanded === s.person;
            return (
              <div key={s.person} className="rounded-xl bg-secondary overflow-hidden">
                {/* 摘要列 */}
                <button
                  onClick={() => setExpanded(isOpen ? null : s.person)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{s.person}</span>
                    <span className="text-sm text-gray-500">{s.count} 張</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${s.net >= 0 ? 'text-neon-green' : 'text-accent'}`}>
                      {s.net >= 0 ? '+' : ''}{s.net}
                    </span>
                    <span className={`text-gray-500 text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </div>
                </button>

                {/* 展開詳細 */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
                        {/* 花費 / 中獎 / 損益 */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-xs text-gray-500">花費</p>
                            <p className="text-sm font-bold text-white">${s.spent}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-xs text-gray-500">中獎</p>
                            <p className="text-sm font-bold text-gold">${s.won}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-xs text-gray-500">損益</p>
                            <p className={`text-sm font-bold ${s.net >= 0 ? 'text-neon-green' : 'text-accent'}`}>
                              {s.net >= 0 ? '+' : ''}{s.net}
                            </p>
                          </div>
                        </div>

                        {/* 中獎率 / 最大獎 / ROI */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-xs text-gray-500">中獎率</p>
                            <p className="text-sm font-bold text-white">
                              {s.count > 0 ? Math.round((s.winCount / s.count) * 100) : 0}%
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-xs text-gray-500">最大獎</p>
                            <p className="text-sm font-bold text-gold">${s.maxPrize}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-xs text-gray-500">ROI</p>
                            <p className={`text-sm font-bold ${s.roi >= 0 ? 'text-neon-green' : 'text-accent'}`}>
                              {s.roi >= 0 ? '+' : ''}{s.roi.toFixed(0)}%
                            </p>
                          </div>
                        </div>

                        {/* 各種類明細 */}
                        {s.byType.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1.5">各種類明細</p>
                            <div className="space-y-1">
                              {s.byType.map((bt) => (
                                <div
                                  key={bt.type.id}
                                  className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg bg-white/5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-white">{bt.type.name}</span>
                                    <span className="text-xs text-gray-500">×{bt.count}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-gray-400">花${bt.spent}</span>
                                    <span className="text-gold">中${bt.won}</span>
                                    <span className={bt.net >= 0 ? 'text-neon-green font-bold' : 'text-accent font-bold'}>
                                      {bt.net >= 0 ? '+' : ''}{bt.net}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 刮刮樂種類 */}
      {typeStats.length > 0 && (
        <div>
          <h3 className="text-sm text-gray-400 mb-2 font-bold">各種類統計</h3>
          <div className="space-y-2">
            {typeStats.map((s) => {
              const actualWinRate = s.count > 0 ? Math.round((s.winCount / s.count) * 100) : 0;
              const actualReturn = s.totalSpent > 0 ? Math.round((s.totalWon / s.totalSpent) * 100) : 0;
              const profitCount = data.records.filter((r) => r.scratchTypeId === s.type.id && r.prize > s.type.price).length;
              const actualProfitRate = s.count > 0 ? Math.round((profitCount / s.count) * 100) : 0;
              return (
                <div key={s.type.id} className="p-3 rounded-xl bg-secondary space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{s.type.name}</span>
                      <span className="text-sm text-gray-500 ml-2">${s.type.price} × {s.count}</span>
                    </div>
                    <span className={`font-bold ${s.net >= 0 ? 'text-neon-green' : 'text-accent'}`}>
                      {s.net >= 0 ? '+' : ''}{s.net}
                    </span>
                  </div>
                  {/* 實際 vs 官方 對比 */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-lg bg-white/5">
                      <p className="text-[10px] text-gray-500">中獎率</p>
                      <p className="text-sm font-bold text-white">{actualWinRate}%</p>
                      {s.type.winRate != null && (
                        <p className={`text-[10px] ${actualWinRate >= s.type.winRate ? 'text-neon-green' : 'text-accent'}`}>
                          官方 {s.type.winRate}%
                        </p>
                      )}
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/5">
                      <p className="text-[10px] text-gray-500">賺錢率</p>
                      <p className={`text-sm font-bold ${actualProfitRate > 0 ? 'text-neon-green' : 'text-accent'}`}>
                        {actualProfitRate}%
                      </p>
                      {s.type.profitRate != null && (
                        <p className={`text-[10px] ${actualProfitRate >= s.type.profitRate ? 'text-neon-green' : 'text-accent'}`}>
                          官方 {s.type.profitRate}%
                        </p>
                      )}
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/5">
                      <p className="text-[10px] text-gray-500">回本率</p>
                      <p className={`text-sm font-bold ${actualReturn >= 100 ? 'text-neon-green' : 'text-accent'}`}>
                        {actualReturn}%
                      </p>
                      {s.type.expectedReturn != null && (
                        <p className={`text-[10px] ${actualReturn >= s.type.expectedReturn ? 'text-neon-green' : 'text-accent'}`}>
                          官方 {s.type.expectedReturn}%
                        </p>
                      )}
                    </div>
                  </div>
                  {/* 頭獎 & 期望值資訊 */}
                  {(s.type.jackpot != null || s.type.jackpotCount != null || s.type.expectedValue != null) && (
                    <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                      {s.type.jackpot != null && (
                        <span>頭獎 ${s.type.jackpot.toLocaleString()}</span>
                      )}
                      {s.type.jackpotCount != null && (
                        <span>頭獎 {s.type.jackpotCount} 組</span>
                      )}
                      {s.type.jackpotRate != null && (
                        <span>頭獎率 {s.type.jackpotRate.toFixed(5)}%</span>
                      )}
                      {s.type.expectedValue != null && (
                        <span className="text-accent">期望值 {s.type.expectedValue}元</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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

  const updateType = (idx: number, field: keyof ScratchType, value: string) => {
    const next = [...types];
    if (field === 'name') {
      next[idx] = { ...next[idx], name: value };
    } else {
      const numVal = Number(value);
      next[idx] = { ...next[idx], [field]: value === '' ? undefined : (numVal || 0) };
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
        <div className="space-y-3">
          {types.map((t, i) => (
            <div key={t.id} className="p-3 rounded-xl bg-white/5 space-y-2">
              <div className="flex gap-2">
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
                  placeholder="售價"
                  className="w-20 px-3 py-2 rounded-lg bg-secondary border-2 border-white/10
                    text-white text-sm focus:border-neon-green/50 focus:outline-none"
                />
                <button
                  onClick={() => removeType(i)}
                  className="text-gray-600 hover:text-accent text-xl px-2"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  value={t.winRate ?? ''}
                  onChange={(e) => updateType(i, 'winRate', e.target.value)}
                  placeholder="中獎率%"
                  className="px-2 py-1.5 rounded-lg bg-secondary border-2 border-white/10
                    text-white text-xs focus:border-neon-green/50 focus:outline-none"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={t.profitRate ?? ''}
                  onChange={(e) => updateType(i, 'profitRate', e.target.value)}
                  placeholder="賺錢率%"
                  className="px-2 py-1.5 rounded-lg bg-secondary border-2 border-white/10
                    text-white text-xs focus:border-neon-green/50 focus:outline-none"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={t.expectedReturn ?? ''}
                  onChange={(e) => updateType(i, 'expectedReturn', e.target.value)}
                  placeholder="回本率%"
                  className="px-2 py-1.5 rounded-lg bg-secondary border-2 border-white/10
                    text-white text-xs focus:border-neon-green/50 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  value={t.jackpot ?? ''}
                  onChange={(e) => updateType(i, 'jackpot', e.target.value)}
                  placeholder="頭獎金額"
                  className="px-2 py-1.5 rounded-lg bg-secondary border-2 border-white/10
                    text-white text-xs focus:border-neon-green/50 focus:outline-none"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={t.jackpotCount ?? ''}
                  onChange={(e) => updateType(i, 'jackpotCount', e.target.value)}
                  placeholder="頭獎數量"
                  className="px-2 py-1.5 rounded-lg bg-secondary border-2 border-white/10
                    text-white text-xs focus:border-neon-green/50 focus:outline-none"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={t.jackpotRate ?? ''}
                  onChange={(e) => updateType(i, 'jackpotRate', e.target.value)}
                  placeholder="頭獎率%"
                  className="px-2 py-1.5 rounded-lg bg-secondary border-2 border-white/10
                    text-white text-xs focus:border-neon-green/50 focus:outline-none"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={t.expectedValue ?? ''}
                  onChange={(e) => updateType(i, 'expectedValue', e.target.value)}
                  placeholder="期望值"
                  className="px-2 py-1.5 rounded-lg bg-secondary border-2 border-white/10
                    text-white text-xs focus:border-neon-green/50 focus:outline-none"
                />
              </div>
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
