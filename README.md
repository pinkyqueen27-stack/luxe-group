# LUXE GROUP 精品團購管理系統(Prototype)

> 精選好物・限量成團・優雅選購

互動式團購網站:團員選購、成團進度即時計算、購物清單與最終確認、主召後台、最終確認公告、Excel 匯出。
技術:React + TypeScript + Vite、Firebase Firestore(雲端共用資料)、SheetJS(Excel)、Lucide 圖示。

**這是測試用 Prototype**:沒有真正的登入、不處理金流、不寄送任何通知。詳見「已知限制」。

---

## 一、先看這裡:目前驗證到哪裡

這個專案是在**無法連上 npm 套件庫**的環境裡寫成的,所以以下事項**沒有**用真正的 `npm install`、`vite build`、`vitest` 跑過:

| 項目 | 狀態 |
| --- | --- |
| 成團、數量驗證、訂單狀態、Excel 彙總、本機儲存等核心邏輯(57 項單元測試) | ✅ 已執行通過(用相容的簡易測試執行器跑同一批 `*.test.ts`) |
| 整個網站在瀏覽器中的實際操作(98 項:選購、成團、結帳、後台、公告、重新整理、手機版) | ✅ 已在無頭 Chromium 執行通過(本機測試模式) |
| TypeScript 型別檢查 | ⚠️ 以簡化的型別替身檢查通過,**尚未**用真正的 React / Firebase 型別檢查 |
| `npm install`、`npm test`(vitest)、`npm run build`(Vite) | ❌ 尚未執行,第一次由 GitHub 雲端執行 |
| 真正寫出 .xlsx 檔、開啟檢查 | ❌ 尚未執行(已驗證「交給 SheetJS 的三張表資料」與檔名正確) |
| 連線 Firebase 雲端 | ❌ 尚未對真實的 Firebase 專案測試(雲端程式碼已寫好,但沒有實際連線驗證) |

所以**第一次部署如果 GitHub Actions 失敗(紅色叉叉),很可能是套件版本或型別的小問題**。請打開失敗的步驟,把錯誤訊息貼給 Claude,通常很快能修好。這是正常的第一次磨合。

---

## 二、資料夾結構

```
luxe-group/
├─ index.html                  網頁入口
├─ package.json                套件清單與指令
├─ firestore.rules             Firestore 安全規則(貼到 Firebase 主控台)
├─ .github/workflows/deploy.yml  GitHub 自動測試、建置、發布
└─ src/
   ├─ types.ts                 資料型別(GroupBuy、Product、Member、Order、OrderItem、Announcement)
   ├─ lib/                     ★ 所有計算規則(純函式,有單元測試)
   │   ├─ calc.ts              成團進度、小計、總額、商品彙總、團員彙總、活動狀態
   │   ├─ quantity.ts          數量驗證(非負整數、最低/每人/總量限制)
   │   ├─ orderState.ts        訂單狀態轉換(編輯中→已確認→解鎖…)
   │   ├─ exportExcel.ts       Excel 三張工作表的資料與下載
   │   └─ format.ts, productForm.ts, productArt.ts, safeStorage.ts
   ├─ data/                    資料儲存層(畫面不直接碰儲存)
   │   ├─ repo.ts              統一介面
   │   ├─ localRepo.ts         本機測試模式(localStorage,含資料版本與重置)
   │   ├─ firebaseRepo.ts      雲端模式(Firestore + 匿名登入)
   │   └─ seed.ts              示範資料(5 位團員、6 項商品,不含任何訂單)
   ├─ context/AppContext.tsx   全站狀態與動作
   ├─ components/              商品卡片、數量輸入、公告、對話框、後台各分頁…
   └─ pages/                   首頁、購物清單、我的訂單、主召後台
```

**核心原則**:成團、小計、總額的公式只寫在 `src/lib/calc.ts` 一處,前台、後台與 Excel 共用,不會算出不同的數字。

---

## 三、你的電腦不能安裝程式?用 GitHub 雲端發布(不需要 Node.js)

整個流程只需要瀏覽器。**請先確認公司規定允許使用 GitHub 與 Firebase**(建議用個人帳號、只放模擬資料)。

### 步驟 1:建立 Firebase 專案(讓所有團員共用資料)

> Firebase 主控台的選單名稱可能略有調整,以下以意思為準。

1. 開啟 <https://console.firebase.google.com>,用 Google 帳號登入 →「新增專案」,名稱自訂(例如 `luxe-group`),Google Analytics 可以關閉。
2. 專案首頁按「網頁」圖示(`</>`)→ 註冊應用程式(名稱自訂,**不需要**勾選 Firebase Hosting)。畫面會顯示一段 `firebaseConfig`,請先留著,**步驟 3 要用**:
   `apiKey`、`authDomain`、`projectId`、`storageBucket`、`messagingSenderId`、`appId`。
3. 左側「建構」→ **Firestore Database** →「建立資料庫」→ 位置選 `asia-east1`(台灣)→ 選「**正式版模式**」。
4. 左側「建構」→ **Authentication** →「開始使用」→「Sign-in method」→ 啟用「**匿名**」。(團員不需要帳號,但規則要求「已登入(含匿名)」才能讀寫。)
5. 回到 Firestore Database →「**規則**」分頁 → 把本專案 `firestore.rules` 的**全部內容**貼上,取代原本內容 →「發布」。

### 步驟 2:把專案放上 GitHub

1. 開啟 <https://github.com>,登入 →「New repository」,取名(例如 `luxe-group`),選 **Public**(免費帳號的 GitHub Pages 需要公開儲存庫)。
2. 進入新儲存庫 →「uploading an existing file」,把本專案資料夾**裡面的所有檔案與資料夾**拖進去(不要連最外層資料夾一起拖),按「Commit changes」。
3. **檢查 `.github/workflows/deploy.yml` 有沒有上傳成功**:macOS 的 Finder 預設會隱藏以 `.` 開頭的資料夾,拖曳時可能漏掉。
   如果儲存庫裡看不到 `.github` 資料夾:按「Add file → Create new file」,檔名輸入 `.github/workflows/deploy.yml`(輸入 `/` 會自動建立資料夾),把本專案同名檔案的內容貼進去,Commit。

### 步驟 3:設定 GitHub Pages 與 Firebase 設定值

1. 儲存庫 **Settings → Pages → Build and deployment → Source** 選「**GitHub Actions**」。
2. **Settings → Secrets and variables → Actions → Variables 分頁 → New repository variable**,依序新增(名稱要完全一樣,值貼上步驟 1 取得的內容):

   | 變數名稱 | 值 |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | `apiKey` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `VITE_FIREBASE_PROJECT_ID` | `projectId` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `VITE_FIREBASE_APP_ID` | `appId` |
   | `VITE_ADMIN_PIN`(選填) | 主召後台「測試入口」密碼,沒設定時預設為 `luxe2026` |

   > Firebase 的網頁設定不是密碼,放在變數裡沒有問題;真正的保護來自 Firestore 規則。但 `VITE_ADMIN_PIN` 會被打包進網頁,**不是安全機制**。

### 步驟 4:發布與開啟

1. 到儲存庫的 **Actions** 分頁,會看到「測試、建置並發布到 GitHub Pages」正在執行(第一次約 2~4 分鐘)。綠色勾勾 = 成功。紅色叉叉 = 點進去看錯誤,把訊息貼給 Claude。
2. 成功後,網址是 `https://你的帳號.github.io/儲存庫名稱/`(也會顯示在 Settings → Pages)。
3. 第一次開啟會顯示「雲端資料庫尚未初始化」→ 前往「主召後台」→ 輸入測試密碼 → 按「**初始化雲端資料**」,示範的團購、商品、團員就會寫入 Firebase。
4. 把網址分享給團員,各自選擇姓名就能選購;主召在後台即時看到統計。

之後每次修改程式並更新到 `main` 分支,網站會自動重新測試、建置與發布。

> 如果頁面頂端顯示「資料連線發生問題」:
> - 提到「匿名登入」→ 回步驟 1-4 啟用 Anonymous。
> - 提到「沒有權限」→ 回步驟 1-5 確認規則已發布。
> - 提到 API Key 無效 → 檢查步驟 3 的變數有沒有貼錯、有沒有多餘空白。
> - 如果仍是「本機測試模式」(頁首寫「僅存在這個瀏覽器」)→ 代表建置時沒有讀到 Firebase 變數,檢查變數名稱後到 Actions 手動「Run workflow」重新發布。

---

## 四、如果你的電腦可以安裝 Node.js(選用)

需要 Node.js 20.19 以上(或 22.12 以上)。在專案資料夾執行:

```bash
npm install      # 安裝套件
npm test         # 單元測試
npm run dev      # 開發模式,依畫面提示的網址開啟
npm run build    # 正式建置,輸出到 dist/
```

不設定 Firebase 時,網站自動使用**本機測試模式**:資料只存在這個瀏覽器的 localStorage,**不會同步給其他人**。要在本機連雲端,複製 `.env.example` 為 `.env.local` 並填入 Firebase 設定。

---

## 五、如何測試每一項主要功能

| 要測的功能 | 操作方式 | 預期結果 |
| --- | --- | --- |
| 身分選擇 | 頁首「團員身分」選 王小美 | 顯示「目前身分:王小美」;頁面頂端有「測試模式」,說明身分未驗證 |
| 成團門檻(橄欖油每團 5 盒) | 數量輸入 4 | 灰色「尚未成團」,還差 1 盒 |
| | 輸入 5 | 橙色「第 1 團已成團」,下一團還差 5 盒(不是 0) |
| | 輸入 10 | 「第 2 團已成團」 |
| | 王小美 10 + 林佳佳 5 | 「第 3 團已成團」(橄欖油每人限購 10,所以要兩個人合計) |
| 數量輸入錯誤 | 輸入 `-1`、`2.5`、`abc`、`11` | 分別顯示負數、小數、非數字、「每人限購 10 盒」的繁體中文錯誤,且不會儲存 |
| 不同團員的訂單 | 切換團員 | 各自的數量互不影響,但「目前團購總數量」是所有人的合計 |
| 購物清單與最終確認 | 前往購物清單 →「我要結帳」→「確認送出」 | 顯示明細、總金額、確認時間;標示模擬結帳不收款 |
| 已確認訂單不可覆寫 | 確認後回首頁 | 數量輸入被鎖定,顯示「已最終確認」 |
| 解鎖流程 | 主召後台 → 團員訂單 → 該團員「解鎖」 | 狀態變回「編輯中」,團員可再次修改並重新確認 |
| 後台統計 | 主召後台 → 成團總覽 | 各商品總量、成團狀態、未成團數量、下一團差額、金額,皆即時計算 |
| 最終確認通知 | 後台 → 最終確認通知 →「發送最終確認通知」→ 編輯 →「確認發布」 | 前台進入時跳出公告,並常駐於首頁與「我的訂單」;介面標明站內公告、未寄送 Email/LINE/推播 |
| Excel 匯出 | 後台右上角「匯出 Excel」 | 下載 `LUXE_GROUP_團購名稱_YYYYMMDD.xlsx`,含「團員訂購明細」「商品彙總」「團員彙總」三張表,最後一列為合計;取消的訂單不計入 |
| 重新整理 | 按 F5 | 身分、訂單、公告都還在(本機模式存在瀏覽器,雲端模式存在 Firebase) |
| 活動狀態 | 後台 → 活動設定,改成「停止訂購」 | 前台所有數量輸入鎖定並說明原因 |
| 商品管理 | 後台 → 商品管理 | 可新增、編輯、下架、刪除(已有訂單的商品只能下架) |
| 重置測試資料 | 後台 → 活動設定 → 重置測試資料 | 清除所有訂單與公告,還原示範資料(雲端模式會影響所有人) |

---

## 六、已知限制(請務必閱讀)

1. **沒有真正的登入。** 團員選姓名就能操作,任何人都可以選別人的名字;後台「測試入口」的密碼會被打包進網頁,不安全。介面上已多處標示。
2. **Firestore 規則無法區分主召與團員。** 任何開啟網站的人都能修改商品、設定或他人訂單。只適合互相信任的小型測試。
3. **活動總限購量不是嚴格保證。** 兩個人在同一秒搶最後名額時,可能都通過檢查。系統會在「最終確認」前再檢查一次,但仍不是資料庫層級的鎖定。
4. **成團只代表數量達門檻**,不代表供應商接受訂單。
5. **不處理金流。** 「我要結帳」只是把訂單標記為「已最終確認」。
6. **通知只是站內公告**,不會寄 Email、LINE 或手機推播,請另外在原本的群組通知團員。
7. 本機測試模式的資料只存在單一瀏覽器,**不會**自動同步到其他裝置或其他人。
8. 沒有鎖定套件版本檔(`package-lock.json`)。第一次發布成功後,建議把 Actions 安裝後產生的版本固定下來,避免日後套件更新造成意外。
9. 團員名單目前固定為示範的 5 人(可在 `src/data/seed.ts` 修改後重置),後台尚無「新增 / 刪除團員」功能。
10. 資料版本:本機資料結構版本寫在 `localRepo.ts` 的 `LOCAL_DATA_VERSION`,日後結構改變時加 1,舊的本機資料會自動重新初始化。

---

## 七、後續升級成正式多人版需要做的事

- **真正的身分驗證**:Firebase Authentication(Email 連結、Google 或 LINE Login),團員用自己的帳號,訂單綁定帳號。
- **主召權限**:用自訂權限(custom claims)或管理員清單,Firestore 規則改成只有主召能寫入設定、商品、團員、解鎖與取消訂單;團員只能讀寫自己的訂單。
- **嚴格的限購控管**:用 Cloud Functions(或交易式計數器)在伺服器端驗證活動總限購量與截止時間,不信任前端時間。
- **真正的通知**:Cloud Functions 搭配 Email(例如 Firebase Extension)或 LINE Messaging API,並記錄寄送結果。
- **金流**:串接合法的支付服務(例如藍新、綠界、LINE Pay),由伺服器確認付款狀態;不要在前端處理卡號。
- **團員與多檔期管理**:後台新增 / 匯入團員、同時管理多個團購活動、歷史訂單查詢。
- **稽核紀錄**:記錄誰在何時修改了訂單、解鎖或取消,方便對帳。
- **品質**:加入元件測試與端對端測試(例如 Playwright)到 GitHub Actions、固定套件版本、加入錯誤監控。
- **資料備份與個資**:定期備份 Firestore;團員姓名屬個人資料,正式上線前確認隱私政策與公司規範。
