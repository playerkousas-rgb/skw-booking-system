/**
 * TTLock 密碼建立
 * 文件: https://euopen.ttlock.com/doc/api/v3/keyboardPwd/add
 */
import crypto from 'crypto';

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  // 快取 token
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }
  
  const clientId = process.env.TTLOCK_CLIENT_ID;
  const clientSecret = process.env.TTLOCK_CLIENT_SECRET;
  const username = process.env.TTLOCK_USERNAME;
  const password = process.env.TTLOCK_PASSWORD;
  
  const passwordMD5 = crypto.createHash('md5').update(password).digest('hex');
  
  const res = await fetch('https://api.ttlock.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password: passwordMD5,
      grant_type: 'password'
    })
  });
  
  const data = await res.json();
  
  if (data.access_token) {
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return accessToken;
  }
  
  throw new Error('TTLock 登入失敗: ' + JSON.stringify(data));
}

export async function createPasscode({ phone, startDate, endDate, name }) {
  const token = await getAccessToken();
  const clientId = process.env.TTLOCK_CLIENT_ID;
  const lockId = parseInt(process.env.TTLOCK_LOCK_ID);
  
  // 密碼 = 手機頭4位 + 月日 (例如 9123 + 0615 = 91230615)
  // TTLock 支援 4-9 位數
  const phonePrefix = phone.replace(/\D/g, '').substring(0, 4);
  const dateSuffix = new Date(startDate).getDate().toString().padStart(2, '0');
  const passcode = phonePrefix + dateSuffix + Math.floor(Math.random() * 10);
  
  // TTLock 需要毫秒時間戳，且分鐘要為0
  const start = new Date(startDate);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() - 1); // 提早1小時生效
  
  const end = new Date(endDate);
  end.setMinutes(0, 0, 0);
  end.setHours(end.getHours() + 1); // 延後1小時
  
  const res = await fetch('https://api.ttlock.com/v3/keyboardPwd/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      clientId,
      accessToken: token,
      lockId: lockId.toString(),
      keyboardPwd: passcode,
      keyboardPwdName: name.substring(0, 20),
      startDate: start.getTime().toString(),
      endDate: end.getTime().toString(),
      addType: '2', // 2 = 經網關 (遠程)
      date: Date.now().toString()
    })
  });
  
  const data = await res.json();
  
  if (data.keyboardPwdId) {
    return {
      success: true,
      passcode,
      passcodeId: data.keyboardPwdId,
      validFrom: start,
      validTo: end
    };
  }
  
  throw new Error('建立密碼失敗: ' + JSON.stringify(data));
}