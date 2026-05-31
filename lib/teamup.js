/**
 * Teamup API 控制
 */
const TEAMUP_KEY = process.env.TEAMUP_API_KEY;
const CALENDAR_ID = process.env.TEAMUP_CALENDAR_ID;

const headers = {
  'Teamup-Token': TEAMUP_KEY,
  'Content-Type': 'application/json'
};

// 取得待審批事件 (藍色 = 申請借用區總部)
export async function getPendingEvents() {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const end = new Date(now.getTime() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0];
  
  const res = await fetch(`https://api.teamup.com/${CALENDAR_ID}/events?startDate=${start}&endDate=${end}`, {
    headers
  });
  
  const data = await res.json();
  
  // 假設藍色是 subcalendar_id = 申請借用的 ID
  // 你需要去 Teamup > Settings > Calendars 看 ID
  // 暫時篩選標題含「申請」
  return data.events.filter(e => 
    e.title.includes('申請') || 
    (e.subcalendar_ids && e.subcalendar_ids.includes(12345678)) // 藍色日曆ID
  );
}

// 批准：藍轉紅
export async function approveEvent(eventId, eventData) {
  // 紅色日曆 ID (確認借用)
  const RED_CALENDAR_ID = 12345679; // 你需要改成實際ID
  
  const update = {
    subcalendar_ids: [RED_CALENDAR_ID],
    title: eventData.title.replace('申請', '已批准'),
    notes: `${eventData.notes || ''}\n\n✅ 已批准於 ${new Date().toLocaleString('zh-HK')}\n密碼將自動發送`
  };
  
  const res = await fetch(`https://api.teamup.com/${CALENDAR_ID}/events/${eventId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(update)
  });
  
  return res.json();
}

export async function getEvent(eventId) {
  const res = await fetch(`https://api.teamup.com/${CALENDAR_ID}/events/${eventId}`, { headers });
  return res.json();
}