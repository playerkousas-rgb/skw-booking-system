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
  
  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('未設定 TTLock 環境變數 (CLIENT_ID, CLIENT_SECRET, USERNAME, PASSWORD)');
  }
  
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
  
  if (!lockId) {
    throw new Error('未設定 TTLOCK_LOCK_ID 環境變數');
  }
  
  // 密碼 = 申請人手機號碼頭 4 位
  let phonePrefix = phone.replace(/\D/g, '').substring(0, 4);
  if (phonePrefix.length < 4) {
    phonePrefix = phonePrefix.padEnd(4, '8'); // 如果不夠 4 位，用 8 補足
  }
  
  const passcode = phonePrefix;
  
  // TTLock 時間格式需要毫秒時間戳
  // 提早 15 分鐘生效，延後 15 分鐘失效，增加使用彈性
  const start = new Date(startDate);
  start.setMinutes(start.getMinutes() - 15);
  
  const end = new Date(endDate);
  end.setMinutes(end.getMinutes() + 15);
  
  const params = {
    clientId,
    accessToken: token,
    lockId: lockId.toString(),
    keyboardPwd: passcode,
    keyboardPwdName: name.substring(0, 30),
    startDate: start.getTime().toString(),
    endDate: end.getTime().toString(),
    addType: '2', // 2 = 經網關 (遠端寫入)
    date: Date.now().toString()
  };
  
  const res = await fetch('https://api.ttlock.com/v3/keyboardPwd/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });
  
  const data = await res.json();
  
  // 如果成功，返回產生的密碼和時間
  if (data.keyboardPwdId || data.errcode === 0) {
    return {
      success: true,
      passcode,
      validFrom: start,
      validTo: end
    };
  }
  
  // 如果是密碼已存在或其他 TTLock 錯誤，拋出具體原因
  throw new Error(`建立密碼失敗 (錯誤碼 ${data.errcode}): ${data.errmsg || JSON.stringify(data)}`);
}