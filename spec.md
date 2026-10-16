# 家庭盃戰鬥陀螺大賽 Beyblade Cup — 實作規格 v1

> 在家舉辦一場戰鬥陀螺比賽，邀請哥哥的同學、朋友與他們的兄弟姊妹來參加（不限同學、不限年級）。
> 這個網站負責：**活動資訊 → 線上報名 → 名單 → 分組／賽程 → 比賽當天即時對戰表與計分 → 最終排名**。
> 家長傳一個網址給其他家長就能報名；比賽當天客廳的電視／平板顯示即時對戰表，主辦家長用手機輸入勝負。

- repo：`geeksajen/beybladeCup`（本機資料夾 `D:\Game\BeybladeCup`）
- 網址：`https://geeksajen.github.io/beybladeCup/`
- 成本：**$0**（GitHub Pages ＋ Firebase Spark 免費方案）
- **使用獨立的 Firebase 專案**（例：`beyblade-cup`），與羽球專案（`geeksajen/badmintonHero`）完全分開：各自的 Firestore、Auth 使用者、安全規則與額度，互不影響。

---

## 1. 範圍

### 1.1 要做的（MVP）
0. **初次設定頁**：第一次使用時，主辦必須先完成比賽基本設定（名稱、日期時間、報名截止、名額、戰鬥盤數）才能使用其他功能；之後可在後台修改（見 §7.1）。
1. **活動首頁**：比賽名稱、日期時間、地點（只顯示「到了再說」等級的資訊，詳細地址不公開，見 §8）、規則說明、報名截止倒數、已報名人數／名額。
2. **報名**：家長填表替小孩報名，**只有暱稱必填**（頭像隨機給一個，點一下可換）；可修改、取消；名額滿了進候補。
3. **參賽名單**：公開顯示頭像、暱稱（舊資料的年級、陀螺名稱仍會顯示，報名表已不再詢問）。
4. **主辦後台**：審核／編輯報名、當天報到、抽籤分組、產生賽程、輸入比分、修正錯誤、結束比賽。
5. **對戰表（大螢幕模式）**：比賽當天電視／iPad 全螢幕顯示目前場次、下一場、分組積分、淘汰賽樹狀圖，即時更新。
6. **最終排名**：冠亞季軍、各項榮譽稱號（見 §5.4，不設實體獎品），可截圖分享。

### 1.2 不做的（避免範圍爆炸）
- 不做帳號註冊、密碼（訪客用匿名登入，見 §3）。
- 不做付費、報名費。
- 不做聊天、留言板、照片上傳（照片會變成兒童隱私問題，且 Spark 方案沒有 Storage 免費額度可依賴）。
- **只支援一場比賽**：系統裡只有一份活動設定（固定 `eventId = 'current'`），不做多場活動的建立、切換或歷史管理。下次辦第二屆再加。
- 不做 Email／LINE 通知（無伺服器，$0）。通知靠家長自己在 LINE 群組貼網址。

---

## 2. 技術棧（與羽球專案相同的技術組合，方便參考程式結構；Firebase 專案各自獨立）

| 項目 | 選擇 |
|---|---|
| 前端 | React 18 ＋ TypeScript ＋ Vite 5 |
| 樣式 | Tailwind CSS 3 |
| 路由 | `HashRouter`（GitHub Pages 沒有 SPA fallback） |
| 資料 | Firebase 11：Firestore ＋ Authentication（Email/Password ＋ **Anonymous**） |
| 測試 | Vitest（賽程產生器、積分計算、晉級規則都是純函式，必須有單元測試） |
| 部署 | GitHub Actions → GitHub Pages，`base: '/beybladeCup/'` |
| 伺服器端邏輯 | **無**。不使用 Cloud Functions，所有邏輯在前端計算後寫回 Firestore |

### 2.1 開發模式
- 與羽球專案相同，提供 **Local Mode**（`VITE_STORE_MODE=local`，資料存 localStorage，分頁間用 `storage` 事件同步）。
  開發、調畫面一律用 Local Mode；只在驗收時切 `firebase`。
- 用同一瀏覽器開三個分頁即可模擬：訪客報名頁、主辦後台、大螢幕對戰表。

### 2.2 額度預算（Spark：每日 5 萬讀、2 萬寫）
一場比賽約 8～24 位選手、數十位家長瀏覽，用量極低，但仍遵守：
- 賽程與比分**合併成一份文件** `events/{eventId}/state/bracket`（見 §6），大螢幕只需 1 個 `onSnapshot`。
- 報名名單用 1 個 `onSnapshot` 監聽 `entries` collection（筆數 ≤ 名額上限 ＋ 候補）。
- 全 app 最多 3 個常駐監聽：`events/{eventId}`、`entries`、`state/bracket`，集中在一個 Provider 建立。（例外：猜冠軍的 `predictions` 只在需要的頁面監聽，見 §13.5）
- 不需要羽球專案那麼嚴格的 ESLint 護欄，但 Firestore 存取仍集中在 `src/store/`。

---

## 3. 身分與權限

| 角色 | 怎麼登入 | 能做什麼 |
|---|---|---|
| **訪客／報名家長** | 進網站時自動 `signInAnonymously()`，無感 | 看活動資訊、名單、對戰表；新增報名；修改／取消**自己**新增的報名 |
| **主辦（我們家）** | `#/admin` 用**本專案自己的家庭帳號**（在新 Firebase 專案建立的 Email/Password 帳號）登入 | 全部讀寫：活動設定、所有報名（含聯絡資料）、報到、分組、比分 |

注意事項：
1. **匿名身分綁在瀏覽器上。** 家長換手機、清除瀏覽資料、用 LINE 內建瀏覽器開後又改用 Safari，都會變成新身分，就改不到原本的報名。
   → 報名成功頁要顯示「之後請用同一個瀏覽器修改；換裝置請直接聯絡主辦」，主辦可以在後台代改。
   → 建議報名頁偵測 LINE / FB 內建瀏覽器時，提示「請點右上角用 Safari／Chrome 開啟」。
2. **登入狀態與羽球 app 各自獨立。** 雖然兩個 app 都在 `geeksajen.github.io` 網域下，但使用不同的 Firebase 專案（不同 `apiKey`），Firebase Auth 的登入狀態不會互相影響。
   主辦即使在羽球 app 已登入，進比賽後台仍要用本專案的家庭帳號再登入一次；在這裡登出也不影響羽球 app。
   → 程式啟動時**只在 `currentUser == null` 時**才呼叫 `signInAnonymously()`，絕不能把已登入的家庭帳號登出或覆蓋。
   → 同網域的 localStorage 是共用的：Local Mode 的 key 一律加 `beybladeCup:` 前綴，避免與羽球 app 的本機資料互相干擾。
3. **報名資格：不限同學、不限年級，兄弟姊妹也可以報名。** 一位家長可能替兩個以上小孩報名：同一個匿名 uid 可以擁有多筆報名，上限 3 筆（前端檢查，見 §6.4）。
4. 後台額外的 PIN 不需要，權限完全由 Firestore 規則判斷是否為家庭帳號 UID。

---

## 4. 頁面與路由

| 路由 | 頁面 | 對象 |
|---|---|---|
| `#/` | 活動首頁：主視覺、日期、倒數、規則摘要、「我要報名」按鈕、報名人數 | 所有人 |
| `#/register` | 報名表單（新增） | 訪客 |
| `#/my` | 我的報名：列出此瀏覽器新增的報名，可修改／取消；顯示正取／候補序號 | 訪客 |
| `#/players` | 參賽名單（正取／候補分開；比賽中顯示報到狀態） | 所有人 |
| `#/bracket` | 對戰表：分組積分表 ＋ 淘汰賽樹狀圖 ＋ 目前場次 | 所有人 |
| `#/screen` | **大螢幕模式**：橫向全螢幕、大字，依比賽節奏自動切換（見 §15），不需要任何操作 | 電視／iPad |
| `#/results` | 最終排名與獎項（比賽結束後首頁自動導到這裡） | 所有人 |
| `#/rules` | 完整比賽規則 | 所有人 |
| `#/setup` | **初次設定頁**（見 §4.3；未登入家庭帳號時先顯示登入表單） | 主辦 |
| `#/admin` | 主辦後台（未登入家庭帳號時顯示登入表單） | 主辦 |

### 4.1 手機優先
報名的家長幾乎都用手機、從 LINE 點連結進來。所有訪客頁面以 375px 寬設計；`#/screen` 才以橫向大螢幕設計。

### 4.2 給小孩看的語氣
首頁、對戰表、結果頁要有「比賽感」：深色背景、霓虹配色、大字、對戰時「3, 2, 1, Go Shoot!」倒數動畫、勝利時彩帶。
報名表與後台則以清楚好填為主，不需要特效。

### 4.3 初次設定（第一次使用的強制流程）
「是否已設定」的判斷：`events/current` 文件**不存在** = 尚未設定。

- **尚未設定時**
  - 訪客開任何公開頁面（`#/`、`#/register`、`#/players`…）都只顯示「比賽準備中，請稍後再來 🌀」，不顯示其他內容、不能報名。
  - 主辦開任何頁面（含 `#/admin`）一律導到 `#/setup`；未登入家庭帳號時先登入。設定完成前，後台其他分頁都不能進入。
- **設定頁欄位**（全部必填，有預設值可直接改）：

  | 欄位 | 預設值 | 驗證 |
  |---|---|---|
  | 比賽名稱 | 「哥哥盃戰鬥陀螺大賽」 | 1～30 字 |
  | 比賽日期與開始時間 | 無（必選） | 必須晚於現在 |
  | 報名截止日期與時間 | 比賽前一天 21:00 | 必須早於比賽開始時間、晚於現在 |
  | 正取名額 | 16 | 4～24 |
  | 候補名額 | 4 | 0～10 |
  | 戰鬥盤數量 | 1 | 1 或 2 |

- 按「完成設定」→ 建立 `events/current`（`status = 'draft'`，其餘欄位用 §6.1 預設值）→ 進入後台「活動設定」分頁，並提示「確認無誤後按『開放報名』」。
- **設定完成後 `#/setup` 不再出現**（直接開網址會導到 `#/admin`）。之後要修改這些值，到後台「活動設定」（§7.1）。

---

## 5. 比賽規則（預設值，主辦可在後台調整）

> **確定使用 Beyblade X**，以 Beyblade X 官方規則為基礎簡化給小學生。不支援舊的 Burst 系列。分數仍以設定檔表達（`finishPoints`），不要寫死在程式裡。

### 5.1 單場（一局 Battle）的得分
| 終結方式 | 說明 | 得分 |
|---|---|---|
| Spin Finish | 對方先停止旋轉 | 1 |
| Over Finish | 把對方打出場外（進入 Over Zone） | 2 |
| Burst Finish | 把對方陀螺打到解體 | 2 |
| Xtreme Finish | 把對方打進 Xtreme Zone | 3 |
| 平手 | 同時停止／同時出場 | 0，重打 |

- **3on3**：每人 3 顆輪流上場，詳見 §14.1。
- **一場對戰（Match）先得 4 分者勝**（設定值 `pointsToWin`，可改 3 或 5）。
- 發射失誤（Launch Error）：第一次警告，同一場第二次判對方 +1 分。（給小孩寬鬆一點，主辦可關閉。）
- 輸入比分時，主辦在手機上逐局點選「誰贏 ＋ 終結方式」，系統自動累計，達到 `pointsToWin` 自動結束該場。也提供「直接輸入最終比分」的快速模式。

### 5.2 賽制
依報到人數自動建議，主辦可改：

| 人數 | 建議賽制 |
|---|---|
| 4～6 人 | **單循環**（每人都打每人），積分最高者冠軍 |
| 7～16 人 | **分組循環 → 單淘汰**：分 2～4 組，每組 3～4 人；每組前 2 名進淘汰賽 |
| 17～24 人 | 分組循環（4～6 組）→ 每組前 2 名進 8 或 16 強單淘汰 |

- 淘汰賽人數不是 2 的次方時，種子（分組第一名）輪空。
- 另打**季軍戰**（準決賽兩位敗者）。設定可關閉。
- 小孩最怕「打一場就出局」：分組循環保證每人至少打 2～3 場，是預設賽制的原因。

### 5.3 分組循環的排名規則（依序比較）
1. 勝場數
2. 總得分 − 總失分（積分差）
3. 總得分
4. 兩人對戰結果（僅限兩人同分時）
5. 仍相同 → 主辦在後台手動決定（現場加賽一局）

### 5.4 獎項（純榮譽稱號，**不設實體獎品**；設定可增刪）
- 冠軍、亞軍、季軍
- 🔥 **Xtreme 王**：全場 Xtreme Finish 次數最多
- 💥 **爆裂王**：Burst Finish 次數最多
- 🌀 **最佳陀螺命名**：主辦手動指定
- 🎖️ **全員參加獎**：每個報到的人都有，結果頁列出全部名單（每個小孩都能找到自己的名字）
- 系統只記錄與顯示稱號，不需要獎品欄位或獎品管理。

### 5.5 場次安排
- 循環賽排程用 **circle method**（輪轉法），盡量讓同一個人不要連續打兩場。
- 戰鬥盤數量在初次設定時填寫（§4.3）。只有一個戰鬥盤時同時只進行 1 場；`arenaCount` 為 2 時（兩個盤同時開打），排程時同一人不可同時出現在兩個盤。
- 每場預估 3 分鐘，首頁顯示「預計結束時間」。

---

## 6. 資料模型（Firestore）

所有比賽資料放在頂層 collection **`events/`**。本專案使用獨立的 Firebase 專案，資料庫裡只有比賽資料。

```
events/{eventId}                         活動設定（公開讀）
events/{eventId}/entries/{entryId}       報名（公開資訊，公開讀）
events/{eventId}/contacts/{entryId}      報名聯絡資料（只有主辦能讀）
events/{eventId}/state/bracket           賽程＋比分＋結果（一份文件，公開讀）
```

只有一場比賽，`eventId` 固定為 **`current`**（程式常數，不用環境變數）。文件不存在即代表尚未完成初次設定（§4.3）。

### 6.1 型別

```ts
type EventStatus = 'draft' | 'open' | 'closed' | 'running' | 'finished';

interface EventDoc {
  title: string;               // 初次設定填寫，預設「哥哥盃戰鬥陀螺大賽」
  subtitle?: string;
  startAt: Timestamp;          // 比賽開始（初次設定填寫）
  registerDeadline: Timestamp; // 報名截止（初次設定填寫）
  locationHint: string;        // 公開顯示，預設「主辦家（地址另於 LINE 群組提供）」
  capacity: number;            // 正取名額（初次設定填寫），預設 16
  waitlistCapacity: number;    // 候補名額（初次設定填寫），預設 4
  maxEntriesPerOwner: number;  // 每個匿名身分最多報名幾人，預設 3
  status: EventStatus;         // 初次設定完成時為 'draft'
  rules: RuleConfig;
  announcement?: string;       // 首頁公告（主辦隨時改）
  updatedAt: Timestamp;
}

interface RuleConfig {
  pointsToWin: number;                  // 4
  finishPoints: Record<FinishType, number>;
  launchErrorPenalty: boolean;
  format: 'roundRobin' | 'groupsThenKnockout' | 'knockout';
  groupCount?: number;
  advancePerGroup?: number;             // 2
  thirdPlaceMatch: boolean;
  arenaCount: number;                   // 1 或 2（初次設定填寫）
  minutesPerMatch: number;              // 3
}

type FinishType = 'spin' | 'over' | 'burst' | 'xtreme';

interface EntryDoc {                    // 公開
  ownerUid: string;                     // 建立者的 auth uid（匿名或家庭帳號）
  nickname: string;                     // 比賽暱稱，1～12 字，例：「閃電小明」
  grade?: string;                       // 「三年級」——報名表已不再詢問，只保留舊資料
  beyName?: string;                     // 陀螺名稱——報名表已不再詢問，只保留舊資料
  emoji?: string;                       // 頭像代號（components/avatars.tsx），報名時隨機；舊資料是 emoji，讀取時對應
  status: 'active' | 'cancelled';       // 正取／候補不存，依 createdAt 排序在顯示時推導（§6.3）
  checkedIn: boolean;                   // 當天報到（只有主辦能改）
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ContactDoc {                  // 私密，只有主辦能讀
  ownerUid: string;
  parentName?: string;                  // 選填（同學群組大家都認識）
  phone?: string;                       // 選填，當天聯絡用
  childRealName?: string;               // 選填，主辦自己認人用，不公開
  note?: string;                        // 「會晚到」「需要借陀螺」等
  needsBorrowBey: boolean;              // 需要借陀螺／發射器
}

interface BracketDoc {
  version: number;                      // 每次寫入 +1，前端用來偵測衝突
  generatedAt: Timestamp;
  playerIds: string[];                  // 有報到、參賽的 entryId
  groups: { id: string; name: string; playerIds: string[] }[];  // 'A', 'B'…
  matches: Match[];                     // 所有場次（循環＋淘汰）
  currentMatchIds: string[];            // 正在進行中的場次（每個戰鬥盤一個）
  awards?: { key: string; label: string; entryIds: string[] }[];
  finalRanking?: string[];              // entryId 依名次排序
}

interface Match {
  id: string;                           // 'G-A-1', 'KO-QF-1', 'KO-F', 'KO-3RD'
  stage: 'group' | 'knockout';
  groupId?: string;
  round: number;
  order: number;                        // 全場顯示順序
  arena?: number;
  p1?: string;                          // entryId；淘汰賽尚未決定時為空
  p2?: string;
  p1Source?: string;                    // 例 'winner:KO-QF-1'、'group:A:1'
  p2Source?: string;
  battles: Battle[];                    // 逐局紀錄
  p1Score: number;
  p2Score: number;
  status: 'pending' | 'live' | 'done';
  winner?: string;
  isBye?: boolean;                      // 輪空
}

interface Battle {
  winner: 'p1' | 'p2' | 'draw';
  finish?: FinishType | 'launchError';
  at: Timestamp;
}
```

### 6.2 為什麼賽程放一份文件
- 大螢幕只監聽一份文件，所有人看到的永遠是一致的完整狀態。
- 24 人分組＋淘汰約 40～50 場，每場 ≤ 10 局，文件大小遠低於 1MB 上限。
- 只有主辦會寫入；寫入一律用 `runTransaction` 讀最新版、套用純函式、寫回，避免主辦兩支手機同時操作時互相覆蓋。

### 6.3 報名序號與正取／候補
- `createdAt` 用 `serverTimestamp()` 寫入（規則驗證 `request.resource.data.createdAt == request.time`，避免訪客偽造時間插隊）。
- 正取／候補**不存在資料庫**：把 `status == 'active'` 的報名依 `createdAt` 排序，前 `capacity` 位為正取、接著 `waitlistCapacity` 位為候補，超過則前端擋下不給報名。
  - 不採「計數器 ＋ transaction」的原因：訪客得有權限改 `events/{eventId}`，規則會變複雜且不安全。
  - 極端情況（最後一個名額兩人同時送出）可能多一人進候補邊界，家庭活動可接受，主辦可手動調整。
- 有人取消時，候補第一位自動遞補（顯示時計算，自然成立）。主辦在 LINE 群組通知遞補的家長。

### 6.4 安全規則

> 本專案有自己的 Firebase 專案，**規則檔 `firestore.rules` 就放在本 repo**，由本 repo 的 `firebase.json` 部署（見 §10），不需要與羽球 repo 協調。
> `isFamily()` 以家庭帳號的 UID 判斷，UID 在本專案 Firebase Console 建立帳號後取得，直接寫進規則檔。

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

function isSignedIn() { return request.auth != null; }
function isFamily() { return isSignedIn() && request.auth.uid == '<FAMILY_UID>'; }

match /events/{eventId} {
  allow read: if true;
  allow write: if isFamily();

  match /entries/{entryId} {
    allow read: if true;
    allow create: if isSignedIn()
      && request.resource.data.ownerUid == request.auth.uid
      && validEntry(request.resource.data)
      && request.resource.data.checkedIn == false
      && request.resource.data.status == 'active'
      && request.resource.data.createdAt == request.time
      && get(/databases/$(database)/documents/events/$(eventId)).data.status == 'open';
    allow update: if isFamily()
      || (isSignedIn()
          && resource.data.ownerUid == request.auth.uid
          && request.resource.data.ownerUid == resource.data.ownerUid
          && request.resource.data.checkedIn == resource.data.checkedIn
          && request.resource.data.createdAt == resource.data.createdAt
          && validEntry(request.resource.data)
          && get(/databases/$(database)/documents/events/$(eventId)).data.status == 'open');
    allow delete: if isFamily();          // 訪客「取消」= 把 status 改成 cancelled
  }

  match /contacts/{entryId} {
    allow read: if isFamily()
      || (isSignedIn() && resource.data.ownerUid == request.auth.uid);
    allow create, update: if isFamily()
      || (isSignedIn() && request.resource.data.ownerUid == request.auth.uid);
    allow delete: if isFamily();
  }

  match /state/{doc} {
    allow read: if true;
    allow write: if isFamily();
  }
}

function validEntry(d) {
  return d.nickname is string && d.nickname.size() >= 1 && d.nickname.size() <= 12
    && (!('beyName' in d) || (d.beyName is string && d.beyName.size() <= 20))
    && d.status in ['active', 'cancelled'];
}

    // 其他路徑一律拒絕
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- 實作時（`firestore.rules`）比上面的草稿多加了三點：主辦可以在任何狀態代為報名；訪客新增／修改報名還要求 `request.time < registerDeadline`；聯絡資料的新增要求對應報名屬於自己（用 `getAfter`，因為與報名同一個 batch 寫入），修改要求原本就屬於自己。以 `firestore.rules` 為準。
- 「每人最多 3 筆」無法在規則中可靠計數 → 由前端檢查，主辦後台可以看到同一個 `ownerUid` 的筆數，異常時手動刪除。家庭內部活動，可接受。
- 規則需要用 Firebase Emulator 或 Rules Playground 驗證以下情境：
  訪客能新增自己的報名 ✓／不能改別人的報名 ✗／不能把自己設為已報到 ✗／不能讀別人的聯絡資料 ✗／
  截止後（status ≠ open）不能新增 ✗／家庭帳號全部可以 ✓／`events/` 以外的路徑一律拒絕 ✗。

---

## 7. 主辦後台（`#/admin`）

手機操作，分頁籤：

1. **活動設定**（§7.1）：狀態切換按鈕 `draft → open（開放報名）→ closed（截止）→ running（比賽中）→ finished（結束）`，以及所有設定值。
2. **報名管理**：列表（含私密聯絡資料、需要借陀螺標記）、代為新增／修改／取消、匯出名單（複製成文字貼 LINE）。
3. **報到**：比賽當天逐一點「已到」；未到者不排入賽程。
4. **產生賽程**：
   - 系統依報到人數建議賽制 → 主辦確認 → **抽籤動畫**（大螢幕同步播放，小孩會很興奮）→ 寫入 `state/bracket`。
   - 可以手動交換兩位選手的分組（同班好朋友想分開或在一起）。
   - 已開始比賽後重新產生賽程需要二次確認，且會清空比分。
5. **計分（比賽當天最常用）**：
   - 畫面上方大按鈕顯示目前場次「閃電小明 vs 火焰阿傑」。
   - 每局點：〔左邊贏〕〔右邊贏〕〔平手〕→ 再點終結方式（Spin／Over／Burst／Xtreme）。
   - 自動累計，到 `pointsToWin` 顯示「勝者確認？」→ 確認後該場 `done`，自動帶出下一場、淘汰賽自動晉級。
   - **復原**：可撤銷最後一局；已完成的場次可以「重新開啟」修改（若影響淘汰賽後續已開打的場次，要警告）。
6. **頒獎**：系統算出冠亞季軍、Xtreme 王、爆裂王；手動指定其他獎項；按「公布結果」→ `status = finished`，大螢幕播放頒獎動畫。

### 7.1 活動設定（修改初次設定的地方）
- 上半部是**與初次設定頁同一個表單元件**（`EventSetupForm`）：比賽名稱、比賽日期時間、報名截止、正取／候補名額、戰鬥盤數量，驗證規則同 §4.3。
- 下半部是其他設定：副標題、地點提示、首頁公告、每人報名上限、規則參數（`pointsToWin`、`finishPoints`、發射失誤罰則、賽制、季軍戰、每場分鐘數）。
- 修改時的保護：
  - 正取名額調低到少於目前有效報名數 → 提示「多出的人會變成候補」並要求確認。
  - 已產生賽程後修改戰鬥盤數量 → 提示「需要重新產生賽程」，不會自動改動現有賽程。
  - 比賽開始（`running`）後，日期與名額欄位改為唯讀。

---

## 8. 隱私（參加者是別人家的小學生）

- **公開頁面只顯示暱稱**，不顯示真實姓名、照片、學校全名。報名表的暱稱欄位提示「請用綽號，不要用真實全名」。
- **地址不放在網站上**（網站是公開的，任何人都能看到）。只寫「地址另於 LINE 群組提供」。
- 家長姓名、電話、小孩真名放在 `contacts/`，規則上只有主辦與該報名的建立者能讀。
- 比賽結束一個月後，主辦在後台按「清除聯絡資料」刪除所有 `contacts/` 文件。結果頁（只有暱稱）可以保留作紀念。
- 網站加 `<meta name="robots" content="noindex">`，避免被搜尋引擎收錄。

---

## 9. 專案結構（建議）

```
src/
├─ types/                 §6.1 的型別
├─ engine/                純函式，全部要有單元測試
│  ├─ scheduler.ts        循環賽排程（circle method）、分組（蛇形分配）、淘汰樹（含輪空）
│  ├─ scoring.ts          逐局 → 單場比分、勝負判定
│  ├─ standings.ts        分組積分與排名（§5.3 規則）
│  ├─ advance.ts          淘汰賽晉級、季軍戰
│  ├─ awards.ts           獎項計算
│  ├─ achievements.ts     成就徽章（§13.2）
│  ├─ player.ts           個人戰績、下一場（§13.3、§13.4）
│  ├─ arenaEvents.ts      大螢幕特效事件（§13.1）
│  ├─ predictions.ts      猜冠軍統計與獎項（§13.5）
│  ├─ deck.ts             3on3 出場順序、Deck 檢查（§14.1）
│  ├─ meta.ts             Meta 強勢榜統計（§14.7）
│  ├─ screen.ts           大螢幕模式判斷、積分變化、連勝（§15）
│  └─ registration.ts     正取／候補推導、每人上限檢查
├─ store/                 唯一可以 import firebase/firestore 的地方
│  ├─ types.ts            EventStore 介面
│  ├─ localAdapter.ts     localStorage（開發用）
│  ├─ firebaseAdapter.ts
│  └─ index.ts            依 VITE_STORE_MODE 選擇
├─ providers/EventProvider.tsx   ★ 3 個監聽在此建立
├─ lib/firebase.ts        初始化、匿名登入（只在沒有 currentUser 時）
├─ pages/                 Setup, Home, Register, MyEntries, Players, Bracket, Screen, Results, Rules, Admin
├─ components/SetupGate.tsx   尚未設定時：訪客顯示「準備中」、主辦導到 #/setup（§4.3）
├─ components/
│  ├─ bracket/            GroupTable, KnockoutTree, MatchCard, LiveMatch
│  ├─ admin/              EventSetupForm（設定頁與活動設定共用）, EventSettings, EntryManager, CheckIn, BracketGenerator, Scorer, Awards
│  └─ fx/                 Countdown（3,2,1 Go Shoot!）, Confetti, DrawAnimation
tests/
firestore.rules                  §6.4 的完整規則（本 repo 是唯一來源）
firestore.indexes.json
firebase.json                    只設定 firestore（rules ＋ indexes），供 firebase-tools 部署
.firebaserc                      default project = 本專案的 Firebase projectId
.github/workflows/deploy.yml     lint → test → build → deploy
```

---

## 10. 部署與 Firebase 設定步驟

1. **GitHub**：建立 repo `geeksajen/beybladeCup` → Settings → Pages → Source 選 **GitHub Actions**。
2. **建立 Firebase 專案**（新的、獨立的專案，Spark 免費方案）：
   - Firebase Console → 新增專案（例：`beyblade-cup`），不需要 Google Analytics。
   - 新增 **Web App**，取得 Firebase config。
   - Firestore Database → 建立資料庫（production mode，地區選 `asia-east1`）。
   - Authentication → Sign-in method → 啟用 **Email/Password** 與 **匿名**。
   - Authentication → Users → 新增**家庭帳號**（Email/Password），記下它的 UID。
   - Authentication → Settings → Authorized domains：新增 `geeksajen.github.io`。
3. **Secrets**（GitHub repo → Settings → Secrets and variables → Actions），填入**本專案** Web App 的值：
   `VITE_FIREBASE_API_KEY`、`VITE_FIREBASE_AUTH_DOMAIN`、`VITE_FIREBASE_PROJECT_ID`、
   `VITE_FIREBASE_STORAGE_BUCKET`、`VITE_FIREBASE_MESSAGING_SENDER_ID`、`VITE_FIREBASE_APP_ID`；
   另加 `VITE_FAMILY_UID`（前端用來判斷是否顯示後台功能；真正的權限仍由規則決定）。
   本機開發用 `.env.local`（列入 `.gitignore`）。
4. **規則**：把家庭帳號 UID 填進本 repo 的 `firestore.rules`，在本 repo 執行
   `npx firebase-tools deploy --only firestore --project <本專案 projectId>`。
   （`.firebaserc` 已指定本專案；部署前確認 `firebase use` 顯示的是比賽專案，不是羽球專案。）
5. **初次設定**：部署後用家庭帳號開網站，會自動進入 `#/setup`，填完即建立 `events/current`（§4.3）。
6. push 到 `main` → 自動部署。

---

## 11. 里程碑

| Step | 內容 | 驗收 |
|---|---|---|
| 0 | Vite＋React＋TS＋Tailwind 骨架、HashRouter、base path、deploy workflow、Local Mode store | 空白頁能在 GitHub Pages 開啟，重新整理不白畫面 |
| 1 | `engine/` 全部純函式＋單元測試 | 4／5／7／8／12／16／24 人的賽程都正確：每對只打一次、無人同時出現在兩盤、輪空正確、積分排序符合 §5.3、淘汰晉級與季軍戰正確 |
| 2 | 初次設定頁＋SetupGate；活動首頁、規則頁、報名、我的報名、參賽名單（Local Mode） | 清空資料後：訪客看到「準備中」、主辦被導到設定頁，設定完成才能使用；用手機寬度完成報名→修改→取消；超過名額顯示候補；取消後候補遞補 |
| 3 | 後台：活動設定、報名管理、報到 | 在活動設定修改初次設定的值並生效；狀態切換後報名頁正確開關；代報名、匯出名單文字 |
| 4 | 後台：產生賽程＋抽籤動畫；對戰表頁 | 依人數建議賽制；手動交換分組；對戰表正確顯示 |
| 5 | 後台計分＋復原；大螢幕模式；即時同步 | 兩個分頁：手機分頁計分 → 大螢幕分頁 1 秒內更新；撤銷最後一局正確 |
| 6 | 頒獎、結果頁、特效 | 完整模擬一場 8 人比賽從報名到頒獎 |
| 7 | 建立獨立 Firebase 專案；接 Firebase：匿名登入、規則部署、firebaseAdapter | §6.4 列出的規則情境全部驗證；換瀏覽器後無法修改原報名（符合預期） |
| 8 | 彩排 | 找家人用 3 支手機＋1 台電視實際跑一次；確認 LINE 內建瀏覽器提示、離線／斷線時計分不遺失 |

---

## 12. 已決定事項

| # | 問題 | 決定 |
|---|---|---|
| 1 | 比賽日期、時間、報名截止日 | **由初次設定頁填寫**（§4.3），之後可在活動設定修改 |
| 2 | 名額上限 | **由初次設定頁填寫**，預設 16 正取＋4 候補 |
| 3 | Beyblade X 還是 Burst | **Beyblade X**（§5） |
| 4 | 戰鬥盤數量 | **由初次設定頁填寫**，預設 1 |
| 5 | 報名資格 | **開放兄弟姊妹，不限同學、不限年級**（§3） |
| 6 | 獎品 | **不設實體獎品**，只有榮譽稱號（§5.4） |
| 7 | 比賽名稱 | **由初次設定頁填寫**，預設「哥哥盃戰鬥陀螺大賽」 |

---

## 13. 加碼功能 v1.1（讓比賽更好玩）

全部在前端從現有資料推導（除了 13.5 猜冠軍），不增加 `state/bracket` 的欄位。

### 13.1 終結技特效＋音效（大螢幕）
- 大螢幕比較前後兩版賽程（`engine/arenaEvents.ts` 的 `diffArenaEvents`），偵測：
  - **新的一局**：依終結方式播放全螢幕特效（Spin 藍／Over 橘／Burst 紅＋晃動／Xtreme 紫色閃光），顯示勝方與 `+分數`。平手、發射失誤不播。
  - **場次完成**：「WINNER」畫面＋彩帶＋比分，並顯示「（敗方）也打得很棒！」。
  - **解鎖成就**（13.2，「第一分」除外）：上方跳出「🔓 解鎖成就」。
- 逐局 `at` 超過 15 秒才收到（斷線重連）不播；重新產生賽程（`generatedAt` 改變）不播；排隊最多 6 個。抽籤動畫、倒數播放中時先等待。
- 音效用 Web Audio 即時合成（`lib/sound.ts`），不需要音檔。瀏覽器規定要點過畫面才能發聲 → 大螢幕右下角「🔇 點一下開啟音效」，按「全螢幕」也會一併開啟；可關閉（記在 localStorage）。

### 13.2 成就徽章（`engine/achievements.ts`）
只計算**已完成**的場次；場次重新開啟時相關成就會暫時消失。

| 徽章 | 條件 | 大螢幕跳出 |
|---|---|---|
| ⭐ 第一分 | 在比賽中拿到分數 | ✗（太常見） |
| 🎉 首勝 | 贏得第一場對戰 | ✓ |
| 🧱 完封 | 贏一場，對手 0 分 | ✓ |
| 🔄 絕地逆轉 | 對手曾領先且只差 1 分（≥ `pointsToWin − 1`）就贏，最後被逆轉；快速輸入比分的場次不計 | ✓ |
| ⚡ 三連勝 | 依場次順序連續贏 3 場 | ✓ |
| 💎 雙重 Xtreme | 同一場打出 2 次 Xtreme Finish | ✓ |
| 🎨 招式大師 | 四種終結方式都贏過 | ✓ |

- 顯示在：參賽名單（名字旁的小圖示）、結果頁全員參加獎、選手卡（13.4，未解鎖的灰色顯示）。

### 13.3 「下一場是你！」（`engine/player.ts` 的 `playerNextUp`）
- `#/my` 每位自己的選手、選手卡上顯示：
  - 比賽中 → 「⚔️ 比賽中！N 號戰鬥盤・對手：…」
  - 下一輪就輪到（排在待賽佇列前 `arenaCount` 場）→ 「📣 下一場就是你！請到戰鬥盤旁準備」
  - 否則 → 「前面還有 N 場，大約 M 分鐘後」（`ceil((N+1)/arenaCount) × minutesPerMatch`）
  - 分組名次未確定且有淘汰賽 → 「分組賽結束後，就知道有沒有晉級」；沒有場次了 → 「今天的比賽都打完了」
- 大螢幕「接下來」清單中，下一輪要上場的場次加上「📣 請準備」框。

### 13.4 選手卡 `#/player/:id`
- 卡片風格個人頁，方便截圖：emoji、暱稱、陀螺名稱、年級、名次與獲得的稱號（比賽結束後）、勝／敗／得分、四種終結次數、成就徽章、對戰紀錄、13.3 的狀態。
- 入口：參賽名單每一列、結果頁全員參加獎的名字、`#/my` 的「看選手卡」。
- 只有暱稱與戰績，沒有照片（§8）。

### 13.5 猜冠軍 `#/predict`
- **誰能投**：每位參賽小孩一票（`voterId` = 報名 id），由該報名的建立者（同一個匿名身分）投；主辦帳號可以替任何選手代投（現場用平板讓小孩輪流點）。截止前可以改票。可以投自己。
- **候選人**：已產生賽程時是 `bracket.playerIds`，否則是正取名單。
- **開放／截止**：主辦在後台「計分」分頁上方切換 `EventDoc.predictionsOpen`（建議抽籤後開放、淘汰賽開打前截止）；公布結果時自動關閉。
- **顯示**：首頁與對戰表在開放時顯示入口；大螢幕輪播多一頁「🔮 猜冠軍人氣榜」（開放期間）；比賽結束後投票頁顯示冠軍與猜中的人。
- **獎項**（公布結果時一起寫入 `awards`）：🔮 **小預言家**（猜中冠軍的所有人）、🌟 **人氣王**（得票最多，可並列）。
- **資料**：`events/{eventId}/predictions/{voterId}` = `{ voterId, pickId, ownerUid, updatedAt }`。
  - 這是第 4 個監聽，但**只在需要的頁面**建立（投票頁、大螢幕開放期間、後台計分／頒獎），筆數 ≤ 參賽人數。
  - 規則：公開讀；訪客新增／修改需 `predictionsOpen == true`、`voterId` 對應的報名 `ownerUid` 是自己、欄位只有上述 4 個、`pickId` 對應的報名存在、`updatedAt == request.time`；主辦全部可寫；只有主辦能刪除。以 `firestore.rules` 為準。
  - 需要驗證的規則情境：能替自己的小孩投票 ✓／不能替別人的小孩投票 ✗／未開放時不能投 ✗／投給不存在的報名 ✗／主辦可代投 ✓。

---

## 14. 3on3 Deck、零件紀錄與 Meta 強勢榜（v1.2）

### 14.1 3on3 規則（`RuleConfig.deckSize`，預設 3；設為 1 = 單顆）
- 每位選手一組 **Deck = 3 顆**陀螺，報到時登錄；**比賽開始（`running`）後整場固定**，只有主辦能改。
- 每場開打前可以重新決定出場順序：主辦在計分畫面「🔀 本場出場順序」調整後按「確定順序」；沒設定就用登錄時的預設順序（第一局輸入時自動套用）。第一局開始後不能再改。
- 上場順序：分出勝負的局（有終結方式）才換下一顆；**平手、發射失誤用同一顆重打**；3 顆用完從第 1 顆重新輪（`engine/deck.ts` 的 `slotAt`）。
- 同一組 Deck 的 Blade／Ratchet／Bit 重複：**只提醒、不擋**（小孩零件可能不夠）。顆數不足也只提醒。

### 14.2 資料
```ts
interface Combo { blade: string; assistBlade?: string; lockChip?: string; ratchet: string; bit: string }  // CX 才有 assist／lockChip
EntryDoc.deck?: Combo[]          // 陣列順序 = 預設出場順序
Match.p1Deck?, p2Deck?: Combo[]  // 本場實際順序；開打時從報名資料複製，之後改 Deck 不影響已開打的場次
```
- Deck 放在報名文件裡，不另開 collection、不多一個監聽。淘汰賽某格選手改變（`resetMatch`）時本場 Deck 一併清空。
- 規則：`validEntry` 允許 `deck`（list，≤ 3）；另外允許報名者在 `open`／`closed` 狀態**只修改** `deck`、`updatedAt`（`affectedKeys().hasOnly`），不受報名截止時間限制。`running` 之後只有主辦能改。
- 需要驗證的規則情境：截止後（closed）能改自己的 Deck ✓／截止後改暱稱 ✗／比賽中改 Deck ✗／改別人的 Deck ✗。

### 14.3 零件清單（`lib/parts.ts`）
- **來源：[Beydex](https://github.com/catgamer109/Beydex-Public-Resources) 社群資料**（`beyblade-data.ts`，社群維護、更新頻繁；沒有正式授權條款，README 表示公開給社群使用 → 規則頁與後台註明來源）。
- **同步：`npm run sync-parts`**（`scripts/sync-parts.mjs`，手動執行，例如每次比賽前）：
  - 下載來源檔，**只當文字解析**（括號配對＋去掉函式呼叫與註解後 `JSON.parse`），絕不 import／執行。
  - 只取 Takara Tomy、非 coming soon 的零件：Blade（含 CX Main Blade、CXE Metal Blade，標 `cx`）、Ratchet（`Turbo`／`Operate` 等融合型標 `fusion`）、Bit、Lock Chip、Assist Blade、Over Blade；縮寫、類型、**Hasbro 名稱（依 `identicalId`）當別名**。
  - **原廠組合**：完整陀螺（含 CX Full Blade 展開）→ `beys`。
  - 寫入 `src/data/parts.generated.json`（記錄來源 commit 與日期），並列出還沒有中文名稱的零件。用 git diff 檢查後再部署。
- **中文名稱**在 `src/data/parts-zh.ts`（暫譯，自己維護，同步不會覆蓋；同類零件中文不可重複）。
- 來源沒有、但需要認得的寫法放 `EXTRA_ALIASES`（例如舊拼法 `Disc Ball` → `Disk Ball`）。
- 儲存前正規化：忽略大小寫／空白／連字號比對英文名、中文、縮寫、別名；Ratchet 統一成 `3-60`。舊資料（例如 `Dran Sword`）讀取時自動對應到 `DranSword`，不需要搬資料。
- 顯示（官方寫法）：一般 `龍之劍 3-60F`；CX `龍勇者 S6-60V`（Lock Chip＋Main Blade，Over／Assist 縮寫直接接 Ratchet）；CXE `巴哈姆特閃擊 BK1-50I`；融合型 Ratchet 顯示縮寫（`Tr`）且沒有 Bit。
- **融合型 Ratchet** 不需要（也不能）選 Bit；Deck 檢查與 Meta 統計都會略過。
- **原廠組合一鍵帶入**：登錄精靈選好 Blade（CX 再加 Lock Chip）後，每一步上方列出相符的原廠組合（最多 3 個），點一下就填好其餘零件並跳到下一顆。
- 圖片：Beydex 的圖片多為原廠渲染圖，版權屬原廠，**不使用**。
### 14.4 公開時機
- Deck 在 `running` 之前只有自己與主辦看得到（`#/my`、選手卡）；每場的出場順序要等那一場在計分畫面確定後，才出現在大螢幕。
- **只是畫面上隱藏**：報名文件本身是公開讀，懂技術的人仍可直接讀資料庫。家庭比賽可接受；要真正保密需要另存私密 collection。

### 14.5 登錄的地方與報到流程
**原則：不登錄 Deck 也能比賽**，只是那位選手的場次不列入 Meta 統計。報到當下以「確認」為主，盡量不在現場輸入。

- **報名表**：選填的「🌀 3on3 Deck」區塊，可以現在登錄，也可以之後再填。
- **`#/my`**：每位自己的選手有 Deck 區塊（`open`／`closed` 可改）；有選手還沒登錄時，頁面上方顯示提醒。
- **登錄介面（`DeckEditor`，全站共用）＝逐步點選精靈，不用打字**：
  - 每顆依序：Blade → Ratchet → Bit（CX 系列：Lock Chip → Main Blade → Assist Blade → Ratchet → Bit），點完自動跳下一步，3 顆填完到確認畫面。
  - Blade／Bit：搜尋框（中文、英文、縮寫）＋「🔥 今天熱門」＋全部清單的大按鈕；清單沒有的可以「使用『…』」自由輸入。
  - Ratchet：兩排按鈕，點刃數（0～9、M）再點高度（50～85）；也有「今天熱門」與「其他寫法」。
  - 確認畫面：調整順序（↑）、清除某一顆、重複／顆數不足提醒、儲存。
  - 「今天熱門」= 其他選手已登錄的零件依次數排序；比賽開始前只有主辦看得到（避免家長藉此推測別人的 Deck）。
- **後台「報到」**：
  - 搜尋暱稱；**還沒到的排前面**；每列顯示 Deck 狀態：`✓ 已確認`／`📝 待確認`／`⚠️ 未登錄`。
  - 已到、Deck 待確認的選手自動展開 Deck，請小朋友拿出陀螺對照 → 按「正確 ✓」或「修改」。
  - 確認紀錄存在 `EntryDoc.deckCheckedKey`（= `deckSignature(deck)`），之後 Deck 被修改就自動變回「待確認」。主辦親自登錄／修改的 Deck 視為已確認。
- **計分畫面**：開打前發現選手沒有 Deck，顯示「⚠️ 還沒登錄 Deck」＋「現在補」，用同一個精靈補登錄；不補也能照常開打。

### 14.6 比賽中的顯示
- 計分畫面與對戰卡（大螢幕、首頁、對戰表）顯示雙方**下一局上場的那一顆**。
- 大螢幕終結技特效加上打出這一擊的組合（例：「🌀 Dran Sword 3-60F」）。

### 14.7 Meta 強勢榜（`engine/meta.ts`、`#/meta`）
- **以局計算**：只統計開打時有記錄 Deck 的場次；快速輸入比分的場次沒有逐局紀錄，不計。
- 分 Blade（CX 含 Lock Chip／Assist）、Ratchet、Bit、完整組合四種，每列：使用人數、局數、勝局、勝率、各終結方式次數。
- **同一個零件互打的局不計入該零件的勝負**。
- 勝率排名需至少 `META_MIN_BATTLES = 5` 局，不足的顯示灰色。頁面註明「樣本小，看看就好」。
- 亮點卡：🏆 冠軍 Deck（冠軍最後一場的 Deck）、📈 最高勝率 Blade、🎯 最高勝率 Bit、🔥 Xtreme 製造機（組合）、💥 Burst 製造機（Blade）、👥 最多人用的 Blade。
- 入口：對戰表頁、結果頁（Meta 摘要）；大螢幕在累積 ≥ 5 局後輪播多一頁 Meta。
- `running` 之前 `#/meta` 只顯示「比賽開始後公開」。

### 14.8 開發工具（本機模式）
- 模擬報名時每位選手自動帶一組隨機 Deck（集中在常見零件）。
- 「🎲 模擬打完所有比賽」：隨機打完所有能開打的場次（`lib/devSim.ts`），用來測試 Meta 與頒獎畫面；分組同分需要手動決定名次時會停下來。

### 14.9 之後可以做
- 報到平板自助站（小朋友點自己的名字登錄 Deck）。
- 後台編輯零件清單（不用改程式）與「未知零件」審核／合併同義詞。
- Meta 加上陀螺類型（Attack／Defense／Stamina／Balance）統計（來源資料已有）。
- 賽後 Meta 總結圖卡（方便截圖分享到 LINE 群組）。

---

## 15. 大螢幕：依比賽節奏切換（v1.3）

情境：75 吋以上電視放在客廳**戰鬥盤旁邊**，大家一抬頭就看。對打時眼睛在戰鬥盤上，抬頭是為了看「現在幾比幾、誰贏了、下一個是誰」，所以不再固定時間輪播。

### 15.1 三種模式（`engine/screen.ts`，從現有資料判斷，不新增欄位）
| 模式 | 條件 | 顯示 |
|---|---|---|
| **對打中** | 進行中的場次已有局數（或快速比分），或主辦按倒數後 60 秒內（`COUNTDOWN_FOCUS_MS`，用絕對值容忍兩台裝置時鐘差） | 鎖定主版面（15.2），**不輪播** |
| **賽後** | 一場剛結束後 15 秒內（`POST_MATCH_MS`，含 WINNER 特效），且下一場還沒開打 | 積分更新（15.3） |
| **中場** | 其他時候（下一場已帶出但還沒開打） | 輪播：主版面 15 秒 ↔ 其他頁 10 秒交替（分組積分、淘汰樹、猜冠軍、Meta），每次進入中場都從主版面開始 |

- 下一場一有局數就立刻切回「對打中」，賽後畫面會被打斷（以比賽為優先）。
- 抽籤動畫、倒數、終結技特效照舊蓋在最上層。

### 15.2 主版面（`components/screen/FocusView.tsx`）
- **左 2/3**：目前場次大字卡（`LiveMatchCard size="xl"`）：選手、這一局上場的陀螺、比分、「第 N 局」、逐局紀錄（每局誰贏、用什麼終結）。兩個戰鬥盤時兩張卡上下排（`size="lg"`）。還沒開打時上方顯示「📣 請選手上場準備！」。
- **右 1/3**：
  - 跟這場有關的資訊：分組賽 → **這一組**的積分表，正在比的兩人標黃；淘汰賽 → 「勝者晉級 ○○」與等著的對手；決賽／季軍戰有專屬標題。
  - 「📣 下一場請準備」（每個戰鬥盤一場，選手已確定的），再列之後 2 場。
- **底部跑馬燈**（`components/screen/Ticker.tsx`，只在主版面顯示）：比賽進度與預計結束時間、連勝中的選手、最近解鎖的成就、Xtreme 王／爆裂王目前領先者（並列超過 3 人不顯示）、猜冠軍人氣第一（開放投票時）、Meta 亮點（≥ 5 局）。
- 音效、全螢幕按鈕移到右上角（半透明），不擋跑馬燈。

### 15.3 賽後畫面（`components/screen/PostMatchView.tsx`）
- 分組賽：「A 組 積分更新」大表格，每列顯示名次**變化（▲▼）**，勝者標「勝」；晉級區（前 N 名）藍底，名次確定後標「✓ 晉級」；全組打完標題改「最終名次」，有同分時提示現場加賽。
- 淘汰賽：「🎉 ○○ 晉級 決賽！」（決賽「🏆 奪得冠軍」、季軍戰「🥉 獲得季軍」）＋ 淘汰樹。

### 15.4 之後再決定
- 主辦手動切換大螢幕畫面（計分畫面上的「📺 自動／目前場次／積分／淘汰樹」）——先不做。
- 兩個戰鬥盤的專屬版面——目前兩張卡上下排，之後依實際使用再調整。
