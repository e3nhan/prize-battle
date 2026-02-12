# 獎金爭奪戰 (Prize Battle)

多人即時互動遊戲，玩家透過手機加入遊戲，在大螢幕上進行押注預測與拍賣競標，爭奪最高獎金排名。

## 技術架構

| 層級 | 技術 |
|------|------|
| Server | Node.js + Express + Socket.io |
| Client (手機端) | React + Vite + Tailwind CSS + Zustand |
| Display (大螢幕端) | React + Vite + Tailwind CSS + Zustand |
| Shared | TypeScript 共用型別、常數、遊戲邏輯 |
| Monorepo | pnpm workspaces |

## 快速開始

### 前置需求

- Node.js >= 18
- pnpm >= 8

### 安裝與啟動

```bash
cd prize-battle
pnpm install
pnpm dev
```

啟動後會開啟三個服務：

| 服務 | 網址 |
|------|------|
| Server | http://localhost:3000 |
| Client (玩家手機) | http://localhost:5173 |
| Display (大螢幕) | http://localhost:5174/display/ |

### Production 建置

```bash
pnpm build
pnpm start
```

建置後 Client 和 Display 靜態檔案由 Server 統一提供服務。

## 遊戲流程

### 1. 加入遊戲
- 玩家在手機瀏覽器開啟 Client 頁面，輸入暱稱後加入遊戲
- 大螢幕 Display 端會顯示 QR Code 供掃碼加入
- 每位玩家起始持有 1000 籌碼

### 2. 押注預測 (6 回合)
每回合進行不同類型的隨機事件，玩家選擇選項並下注：

| 回合 | 類型 | 說明 |
|------|------|------|
| 1 | 骰子大小 | 3 顆骰子，猜大或小 |
| 2 | 輪盤 | 8 個色塊，不同賠率 |
| 3 | 翻硬幣 | 選擇翻 1/2/3 枚，全正面獲勝 |
| 4 | 神秘箱 | 5 個箱子，各有不同倍率 |
| 5 | 骰子點數 | 2 顆骰子，猜精確點數或範圍 |
| 6 | 群體預測 | 猜多數人的選擇 |

### 3. 拍賣戰 (6 回合)
每回合出現一個神秘箱子，玩家競標出價：

| 箱子類型 | 效果 |
|----------|------|
| 鑽石箱 | 獲得 3 倍出價回報 |
| 普通箱 | 獲得 1.3~1.6 倍回報 |
| 炸彈箱 | 損失 80% 出價 |
| 神秘箱 | 隨機特殊效果（偷取、交換、重分配等） |

### 4. 最終結算
依照籌碼排名分配獎金，排名越高獲得比例越大。

## 電腦玩家 (Bot)

為方便單人開發測試，內建電腦玩家功能：

1. 在 Lobby 畫面點擊「+ 電腦玩家」按鈕新增 bot
2. Bot 自動準備就緒，與真人玩家一起算入準備完成判定
3. 遊戲中 bot 會自動進行下注和出價
4. 點擊「移除電腦」可移除所有 bot

最少需要 2 名玩家（含 bot）才能開始遊戲。

## 專案結構

```
prize-battle/
├── packages/
│   ├── shared/          # 共用型別、常數、遊戲邏輯
│   │   └── src/
│   │       ├── types.ts       # Room, Player, GameState 等型別
│   │       ├── events.ts      # Socket.io 事件介面
│   │       ├── constants.ts   # 遊戲配置常數
│   │       └── game-logic.ts  # 純函式遊戲邏輯
│   ├── server/          # 後端服務
│   │   └── src/
│   │       ├── index.ts       # Express + Socket.io 入口
│   │       ├── room.ts        # 房間管理
│   │       ├── game-engine.ts # 遊戲引擎（計時、階段控制）
│   │       ├── betting.ts     # 押注邏輯
│   │       ├── auction.ts     # 拍賣邏輯
│   │       └── bot.ts         # 電腦玩家模組
│   ├── client/          # 玩家手機端 UI
│   │   └── src/
│   │       ├── pages/         # JoinRoom, Lobby, Betting, Auction 等頁面
│   │       ├── stores/        # Zustand 狀態管理
│   │       └── hooks/         # Socket.io hook
│   └── display/         # 大螢幕投放端 UI
│       └── src/
│           ├── pages/         # WaitingScreen, BettingDisplay, AuctionDisplay 等
│           ├── stores/        # Zustand 狀態管理
│           └── hooks/         # Socket.io hook
├── package.json         # Workspace 根設定
└── pnpm-workspace.yaml  # pnpm workspace 配置
```
