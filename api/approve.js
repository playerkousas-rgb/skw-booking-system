import { getEvent, approveEvent } from '../lib/teamup.js';
import { createPasscode } from '../lib/ttlock.js';
import { sendPasscodeToApplicant } from '../lib/email.js';

export default async function handler(req, res) {
  const { eventId, token } = req.query;
  
  // 簡單驗證
  if (token !== process.env.SECRET_TOKEN) {
    return res.status(401).send('未授權');
  }
  
  try {
    // 1. 取得事件資料
    const event = await getEvent(eventId);
    const eventData = event.event;
    
    // 解析申請人資料 (從 notes)
    const notes = eventData.notes || '';
    const phoneMatch = notes.match(/(\d{8})/);
    const emailMatch = notes.match(/[\w.-]+@[\w.-]+\.\w+/);
    const nameMatch = notes.match(/姓名[:：]\s*([^\n]+)/);
    
    const phone = phoneMatch?.[1] || '91230000';
    const email = emailMatch?.[0];
    const name = nameMatch?.[1]?.trim() || '申請人';
    
    if (!email) {
      return res.send(`
        <h1>❌ 缺少電郵</h1>
        <p>申請資料沒有電郵地址，無法發送密碼。</p>
        <p>請手動聯絡申請人。</p>
      `);
    }
    
    // 2. Teamup 藍轉紅
    await approveEvent(eventId, eventData);
    
    // 3. 建立 TTLock 密碼
    const passcodeResult = await createPasscode({
      phone,
      startDate: eventData.start_dt,
      endDate: eventData.end_dt,
      name: `${name} ${new Date(eventData.start_dt).toLocaleDateString('zh-HK')}`
    });
    
    // 4. 發 Email 給申請人
    await sendPasscodeToApplicant({
      email,
      name,
      passcode: passcodeResult.passcode,
      startDate: passcodeResult.validFrom,
      endDate: passcodeResult.validTo,
      eventTitle: eventData.title
    });
    
    // 回應成功頁面
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>批准成功</title>
      <style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f8ff}
      .card{background:white;padding:40px;border-radius:10px;max-width:500px;margin:auto;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
      h1{color:#28a745} .code{font-size:36px;letter-spacing:5px;color:#003366;margin:20px}
      </style></head>
      <body>
        <div class="card">
          <h1>✅ 批准成功</h1>
          <p><strong>${name}</strong> 的申請已處理</p>
          <p>日期: ${new Date(eventData.start_dt).toLocaleString('zh-HK')}</p>
          <div class="code">${passcodeResult.passcode}</div>
          <p>密碼已自動發送至 ${email}</p>
          <p style="color:#666;font-size:14px">Teamup 已轉為紅色 | TTLock 密碼已建立</p>
        </div>
      </body></html>
    `);
    
  } catch (error) {
    console.error(error);
    res.status(500).send(`<h1>❌ 錯誤</h1><pre>${error.message}</pre>`);
  }
}