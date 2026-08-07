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
    .map((item) => `• <b>${item.productName}</b> (العدد: ${item.quantity}) (السعر: ${item.price.toLocaleString()} د.ع)`)
    .join('\n');

  // Format the comprehensive HTML notification message
  const message = `
<b>🔔 طلب جديد تم استلامه بنجاح كزائر!</b>

<b>رقم الطلب:</b> <code>${order.id}</code>
<b>اسم العميل:</b> ${order.customerName}
<b>رقم الجوال:</b> ${order.phone}
<b>المحافظة:</b> ${extra.governorate}
<b>المدينة:</b> ${order.city}
<b>العنوان:</b> ${order.address}
<b>معلم قريب:</b> ${extra.nearbyLandmark || 'لا يوجد'}
<b>ملاحظات العميل:</b> ${extra.notes || 'لا يوجد'}

<b>📦 المنتجات المطلوبة:</b>
${itemsText}

<b>الإجمالي الكلي:</b> ${order.totalAmount.toLocaleString()} د.ع
<b>حالة الطلب:</b> قيد المراجعة (Pending)
<b>طريقة الدفع:</b> الدفع عند الاستلام (Cash On Delivery)
<b>التاريخ:</b> ${dateStr}
<b>الوقت:</b> ${timeStr}
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
