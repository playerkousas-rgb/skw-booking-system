# 筲箕灣區總部全自動預約系統

**你的日曆**: https://teamup.com/c/w7ecfj
**狀態**: ✅ 已建立原型，可立即部署

## 你現在的進度
✅ Teamup API Key 已提供
⚠️ TTLock 需要完成「我的應用」設定 (下面有3分鐘教學)
⚠️ 需要取得 Lock ID (我已寫好自動抓取工具)

---

## 一鍵部署步驟

### 第一步：完成 TTLock 開發者設定 (卡住的地方)

你說卡在「我的應用」，跟著做：

1. 去 https://open.ttlock.com → 登入 (用你 lock2.sciener.com 同一帳密)
2. 左邊選單 → **應用管理** → **創建應用**
3. 填寫：
   - 應用名稱: `SKW Scout Auto`
   - 應用類型: **網頁應用**
   - Redirect URI: `https://skwscout.org.hk`
4. 按保存 → 你會得到：
   - **Client ID** (像 8位數字)
   - **Client Secret** (長字串)
   
**抄下來，等下用**

### 第二步：取得你的 Lock ID

我已寫好工具 `get-lock-id.js`：

```bash
cd skw-booking-system
node get-lock-id.js
```

它會問你：
- TTLock 用戶名 (lock2 登入的)
- 密碼
- Client ID
- Client Secret

執行後會顯示：
```
✅ 找到 1 個鎖
Lock ID: 1234567
名稱: 區總部大門
```

### 第三步：部署到 Vercel

1. 將整個 `skw-booking-system` 資料夾 push 到 GitHub
2. Vercel → New Project → Import
3. 環境變數設定：
```
TEAMUP_API_KEY=4032acf1e6d917809aeb334a16dd0bca82297e8f0f65cd6ec32e0d92bc37bbd2
TEAMUP_CALENDAR_ID=w7ecfj
TTLOCK_CLIENT_ID=你的
TTLOCK_CLIENT_SECRET=你的
TTLOCK_USERNAME=你的lock2帳號
TTLOCK_PASSWORD=你的lock2密碼
TTLOCK_LOCK_ID=上一步取得的
GMAIL_USER=INFO@SKWSCOUT.ORG.HK
GMAIL_APP_PASSWORD= (需申請)
APPROVER_EMAIL=職員收審批的email
```

4. Deploy

---

## 自動化流程

部署後會自動：

**每2分鐘** 檢查 Teamup 藍色事件 → 發 email 給職員：
```
主旨: [待審批] 陳大文 申請 6月15日 19:00
內容:
申請人: 陳大文
電話: 9123 4567
人數: 20
活動: 童軍集會

[✅ 一鍵批准]  [❌ 拒絕]
```

職員按批准 → 系統 3 秒內：
1. Teamup 藍→紅
2. TTLock 建立密碼 (手機頭4碼+日期，例如 9123+15=912315)
3. 自動寄 email 給申請人含密碼

---

## 檔案結構
```
/api/approve.js      - 批准 API
/api/reject.js       - 拒絕 API  
/api/cron.js         - 每2分鐘檢查
/lib/teamup.js       - Teamup 控制
/lib/ttlock.js       - TTLock 建密碼
/lib/email.js        - 發信
get-lock-id.js       - 取得 Lock ID 工具
```

**下一步**：我現在幫你寫好所有程式碼，你只需要提供 TTLock 的 Client ID/Secret。