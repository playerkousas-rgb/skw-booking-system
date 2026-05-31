/**
 * 發送 Email (用 Gmail SMTP)
 */
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD // 需在 Google 帳戶建立應用程式密碼
  }
});

export async function sendApprovalRequest(event) {
  const approveUrl = `${process.env.BASE_URL}/api/approve?eventId=${event.id}&token=${process.env.SECRET_TOKEN}`;
  const rejectUrl = `${process.env.BASE_URL}/api/reject?eventId=${event.id}&token=${process.env.SECRET_TOKEN}`;
  
  // 從 event notes 解析申請資料
  const info = parseEventNotes(event.notes);
  
  const html = `
    <div style="font-family: Arial; max-width: 600px;">
      <h2 style="color: #003366;">🏕️ 區總部借用申請</h2>
      <div style="background: #f0f8ff; padding: 20px; border-left: 4px solid #003366;">
        <p><strong>申請人:</strong> ${info.name || '未提供'}</p>
        <p><strong>電話:</strong> ${info.phone || '未提供'}</p>
        <p><strong>日期:</strong> ${new Date(event.start_dt).toLocaleString('zh-HK')}</p>
        <p><strong>至:</strong> ${new Date(event.end_dt).toLocaleString('zh-HK')}</p>
        <p><strong>人數:</strong> ${info.people || '未提供'}</p>
        <p><strong>活動:</strong> ${event.title}</p>
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${approveUrl}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px; display: inline-block; font-size: 16px;">✅ 一鍵批准</a>
        <a href="${rejectUrl}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px; display: inline-block; font-size: 16px;">❌ 拒絕</a>
      </div>
      
      <p style="color: #666; font-size: 12px;">按批准後系統會自動：1) 轉為紅色 2) 建立門鎖密碼 3) Email通知申請人</p>
    </div>
  `;
  
  await transporter.sendMail({
    from: `"筲箕灣區總部" <${process.env.GMAIL_USER}>`,
    to: process.env.APPROVER_EMAIL,
    subject: `[待審批] ${info.name} 申請 ${new Date(event.start_dt).toLocaleDateString('zh-HK')}`,
    html
  });
}

export async function sendPasscodeToApplicant({ email, name, passcode, startDate, endDate, eventTitle }) {
  const html = `
    <div style="font-family: Arial; max-width: 600px;">
      <h2 style="color: #003366;">✅ 區總部借用已批准</h2>
      <p>${name} 你好，</p>
      <p>你的申請 <strong>${eventTitle}</strong> 已獲批准。</p>
      
      <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">🔑 門鎖密碼</h3>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2e7d32; margin: 10px 0;">${passcode}</p>
        <p><strong>有效時間:</strong><br>
        ${new Date(startDate).toLocaleString('zh-HK')} 至<br>
        ${new Date(endDate).toLocaleString('zh-HK')}</p>
      </div>
      
      <h4>注意事項：</h4>
      <ul>
        <li>密碼只在上述時間內有效</li>
        <li>請準時歸還場地並鎖門</li>
        <li>如有問題請聯絡區職員</li>
      </ul>
      
      <p>香港童軍總會筲箕灣區</p>
    </div>
  `;
  
  await transporter.sendMail({
    from: `"筲箕灣區總部" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `✅ 區總部借用批准 - 密碼 ${passcode}`,
    html
  });
}

function parseEventNotes(notes) {
  // 簡單解析，實際可改進
  const phoneMatch = notes?.match(/電話[:：]?\s*(\d{8})/);
  const nameMatch = notes?.match(/姓名[:：]?\s*([^\n]+)/);
  const peopleMatch = notes?.match(/人數[:：]?\s*(\d+)/);
  
  return {
    phone: phoneMatch?.[1] || '',
    name: nameMatch?.[1]?.trim() || '',
    people: peopleMatch?.[1] || ''
  };
}