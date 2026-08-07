import { Order } from '../types';

const metaEnv = (import.meta as any).env || {};
const BOT_TOKEN = metaEnv.VITE_BOT_TOKEN || metaEnv.BOT_TOKEN || '';
const CHAT_ID = metaEnv.VITE_CHAT_ID || metaEnv.CHAT_ID || '';

interface ExtraDetails {
  governorate: string;
  nearbyLandmark?: string;
  notes?: string;
}

/**
 * Helper to fetch with exponential retry logic
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Telegram API responded with status ${response.status}: ${errorText}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Telegram send failed. Retrying in ${delay}ms... (${retries} attempts left). Error:`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Sends a highly formatted HTML message to the specified Telegram Chat using the Telegram Bot API.
 */
export async function sendTelegramNotification(order: Order, extra: ExtraDetails): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('Telegram BOT_TOKEN or CHAT_ID is not configured in environment variables.');
    return false;
  }

  // Parse order created date and time
  const dateObj = new Date(order.createdAt);
  
  // Format as YYYY-MM-DD
  const dateStr = dateObj.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  
  // Format as HH:MM:SS
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Format products list
  const itemsText = order.items
    .map((item, idx) => {
      let optsDetail = '';
      if (item.optionsSummary) {
        optsDetail = `\n   └ ⚙️ <i>الخيارات: ${item.optionsSummary}</i>`;
      } else if (item.selectedColor || item.selectedOptions) {
        const parts = [];
        if (item.selectedColor) parts.push(`اللون: ${item.selectedColor}`);
        if (item.selectedOptions) {
          Object.entries(item.selectedOptions).forEach(([k, v]) => parts.push(`${k}: ${v}`));
        }
        if (parts.length > 0) optsDetail = `\n   └ ⚙️ <i>الخيارات: ${parts.join(' | ')}</i>`;
      }
      const itemSubtotal = (item.price * item.quantity).toLocaleString();
      return `${idx + 1}. <b>${item.productName}</b>\n   └ 📦 الكمية: ${item.quantity} × ${item.price.toLocaleString()} د.ع = <b>${itemSubtotal} د.ع</b>${optsDetail}`;
    })
    .join('\n\n');

  // Format the comprehensive HTML notification message
  const message = `
🛍️ <b>طلب جديد في المتجر (OMEN STORE)!</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>رقم الطلب:</b> <code>${order.id}</code>
👤 <b>اسم العميل:</b> ${order.customerName}
📞 <b>رقم الجوال:</b> <code>${order.phone}</code>
📍 <b>المحافظة:</b> ${extra.governorate || 'غير محدد'}
🏙️ <b>المدينة / المنطقة:</b> ${order.city}
🏠 <b>العنوان التفصيلي:</b> ${order.address}
🏢 <b>معلم قريب:</b> ${extra.nearbyLandmark || 'لا يوجد'}
💬 <b>ملاحظات العميل:</b> ${extra.notes || 'لا يوجد'}

🛒 <b>تفاصيل المنتجات المطلوبة:</b>
${itemsText}

━━━━━━━━━━━━━━━━━━
💰 <b>إجمالي المبلغ المستحق:</b> <b>${order.totalAmount.toLocaleString()} د.ع</b>
💳 <b>طريقة الدفع:</b> الدفع عند الاستلام (COD)
⏰ <b>تاريخ الطلب:</b> ${dateStr} | ${timeStr}
`.trim();

  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const payload = {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML',
    };

    await fetchWithRetry(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Telegram notification sent successfully to chat:', CHAT_ID);
    return true;
  } catch (err) {
    console.error('Failed to send Telegram notification after retries:', err);
    throw err;
  }
}
