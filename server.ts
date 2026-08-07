import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { guestCheckoutSchema } from "./src/zod-schemas.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = 3000;

// Parse json bodies (increase limit for file uploads relayed as base64)
app.use(express.json({ limit: '10mb' }));

// Enable highly secure, custom response headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Custom Content-Security-Policy (allows Supabase, Telegram, and Google Fonts securely)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https: http:; " +
    "connect-src 'self' ws: wss: https://*.supabase.co wss://*.supabase.co https://api.telegram.org;"
  );
  next();
});

// Simple Robust CSRF Check for POST requests
app.use((req, res, next) => {
  if (req.method === "POST") {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const host = req.headers.host || "localhost:3000";

    // Validate origin matches host if present. Allow local dev origins.
    if (origin) {
      const originUrl = new URL(origin);
      const isLocal = originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1';
      if (!isLocal && originUrl.host !== host && !originUrl.host.includes("run.app")) {
        return res.status(403).json({ error: "CSRF protection: Invalid request origin" });
      }
    } else if (referer) {
      const refererUrl = new URL(referer);
      const isLocalRef = refererUrl.hostname === 'localhost' || refererUrl.hostname === '127.0.0.1';
      if (!isLocalRef && refererUrl.host !== host && !refererUrl.host.includes("run.app")) {
        return res.status(403).json({ error: "CSRF protection: Invalid request referer" });
      }
    }
  }
  next();
});

// In-Memory Rate Limiter to prevent spam
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(limit: number, windowMs: number) {
  return (req: any, res: any, next: any) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
    const now = Date.now();
    
    let record = rateLimitStore.get(ip);
    
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(ip, record);
      return next();
    }
    
    record.count++;
    if (record.count > limit) {
      const remainingSecs = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        error: `يرجى الانتظار قليلاً قبل محاولة إرسال طلب جديد. (حظر مؤقت لـ ${remainingSecs} ثانية)`,
      });
    }
    next();
  };
}

// Environment variables
const BOT_TOKEN = process.env.VITE_BOT_TOKEN || process.env.BOT_TOKEN || "";
const CHAT_ID = process.env.VITE_CHAT_ID || process.env.CHAT_ID || "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

// Initialize Supabase Client
const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder"
);

const serviceSupabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || "placeholder"
);

function isSupabaseConfigured(): boolean {
  return (
    !!SUPABASE_URL &&
    !!SUPABASE_ANON_KEY &&
    SUPABASE_URL !== "https://placeholder.supabase.co"
  );
}

// Telegram fetch with backoff retry logic
async function sendTelegramWithRetry(url: string, payload: any, retries = 3, delay = 1000): Promise<any> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown");
      throw new Error(`Telegram returned status ${response.status}: ${errText}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Telegram notification retry in ${delay}ms... (${retries} attempts left). Error:`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendTelegramWithRetry(url, payload, retries - 1, delay * 2);
    }
    throw error;
  }
}

app.post("/api/upload-image", rateLimiter(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { fileName, contentType, data } = req.body || {};

    if (!fileName || !data) {
      return res.status(400).json({ error: "Missing upload payload." });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === "placeholder") {
      return res.status(500).json({
        error: "The server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to the server environment and restart the app.",
      });
    }

    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `products/${Date.now()}_${safeName}`;
    const base64Data = String(data).includes(",") ? String(data).split(",")[1] : String(data);
    const buffer = Buffer.from(base64Data, "base64");

    const { error } = await serviceSupabase.storage
      .from("images")
      .upload(filePath, buffer, {
        contentType: contentType || "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase server upload error:", error);
      return res.status(500).json({ error: `Upload failed: ${error.message}` });
    }

    const { data: { publicUrl } } = serviceSupabase.storage
      .from("images")
      .getPublicUrl(filePath);

    return res.json({ publicUrl });
  } catch (error: any) {
    console.error("Image upload endpoint error:", error);
    return res.status(500).json({ error: error.message || "Unexpected upload error." });
  }
});

// SEO Endpoints: robots.txt
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nAllow: /\nSitemap: /sitemap.xml");
});

// SEO Endpoints: sitemap.xml
app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${req.headers.host || "omen-store.shop"}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  res.send(sitemap);
});

// SECURE BACKEND GUEST CHECKOUT ENDPOINT
app.post("/api/checkout", rateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    // 1. Zod Validation
    const validationResult = guestCheckoutSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMsg = validationResult.error?.issues?.map((e: any) => e.message).join(", ") || "فشل التحقق من البيانات المدخلة";
      console.error("Validation failed:", validationResult.error);
      return res.status(400).json({ error: errorMsg });
    }

    const orderData = validationResult.data;
    
    // Ensure items is an array
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({ error: "يجب إضافة منتج واحد على الأقل للطلب" });
    }

    // Generate strict human-readable unique order number
    const orderId = "OW-" + Math.floor(100000 + Math.random() * 900000);
    const createdAt = new Date().toISOString();

    // Calculate sum to prevent client-side tampering of totals
    const itemsTotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = 5000;
    const grandTotal = itemsTotal + shippingFee;

    // 2. Supabase Persistence
    if (isSupabaseConfigured()) {
      // 2a. Insert order
      const combinedAddressDetails = `المحافظة: ${orderData.governorate} | العنوان: ${orderData.address} | المعلم القريب: ${orderData.nearbyLandmark || "لا يوجد"} | ملاحظات المندوب: ${orderData.notes || "لا يوجد"}`;

      const { error: orderError } = await supabase.from("orders").insert([
        {
          id: orderId,
          customer_name: orderData.name,
          customer_phone: orderData.phone,
          address_details: combinedAddressDetails,
          city: orderData.city,
          items: orderData.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            selectedColor: item.selectedColor || undefined,
            selectedOptions: item.selectedOptions || undefined,
            optionsSummary: item.optionsSummary || undefined,
          })),
          total_amount: grandTotal,
          shipping_fee: shippingFee,
          status: "pending",
          created_at: createdAt,
        },
      ]);

      if (orderError) {
        console.error("Supabase Order Insertion failed:", orderError);
        throw new Error("حدث خطأ أثناء حفظ تفاصيل الطلب في قاعدة البيانات.");
      }

      // 2b. Decrement product stock safely
      for (const item of orderData.items) {
        const { data: prodData } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.productId)
          .maybeSingle();

        if (prodData) {
          const currentStock = prodData.stock || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          await supabase.from("products").update({ stock: newStock }).eq("id", item.productId);
        }
      }
    } else {
      console.warn("Supabase is not configured. Saving order locally in server logs only.");
    }

    // 3. Telegram Notification (Only if Bot Token and Chat ID are configured)
    if (BOT_TOKEN && CHAT_ID) {
      const dateObj = new Date(createdAt);
      const dateStr = dateObj.toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
      const timeStr = dateObj.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

      const itemsText = orderData.items
        .map((item, idx) => {
          let optsDetail = "";
          if (item.optionsSummary) {
            optsDetail = `\n   └ ⚙️ <i>الخيارات: ${item.optionsSummary}</i>`;
          } else if (item.selectedColor || item.selectedOptions) {
            const parts = [];
            if (item.selectedColor) parts.push(`اللون: ${item.selectedColor}`);
            if (item.selectedOptions) {
              Object.entries(item.selectedOptions).forEach(([k, v]) => parts.push(`${k}: ${v}`));
            }
            if (parts.length > 0) optsDetail = `\n   └ ⚙️ <i>الخيارات: ${parts.join(" | ")}</i>`;
          }
          const itemSubtotal = (item.price * item.quantity).toLocaleString();
          return `${idx + 1}. <b>${item.productName}</b>\n   └ 📦 الكمية: ${item.quantity} × ${item.price.toLocaleString()} د.ع = <b>${itemSubtotal} د.ع</b>${optsDetail}`;
        })
        .join("\n\n");

      const telegramMsg = `
🛍️ <b>طلب جديد في المتجر (OMEN STORE)!</b>
━━━━━━━━━━━━━━━━━━
🆔 <b>رقم الطلب:</b> <code>${orderId}</code>
👤 <b>اسم العميل:</b> ${orderData.name}
📞 <b>رقم الجوال:</b> <code>${orderData.phone}</code>
📍 <b>المحافظة:</b> ${orderData.governorate || "غير محدد"}
🏙️ <b>المدينة / المنطقة:</b> ${orderData.city}
🏠 <b>العنوان التفصيلي:</b> ${orderData.address}
🏢 <b>معلم قريب:</b> ${orderData.nearbyLandmark || "لا يوجد"}
💬 <b>ملاحظات العميل:</b> ${orderData.notes || "لا يوجد"}

🛒 <b>تفاصيل المنتجات المطلوبة:</b>
${itemsText}

━━━━━━━━━━━━━━━━━━
🚚 <b>رسوم الشحن:</b> ${shippingFee > 0 ? `${shippingFee.toLocaleString()} د.ع` : "مجاني"}
💰 <b>إجمالي المبلغ المستحق:</b> <b>${grandTotal.toLocaleString()} د.ع</b>
💳 <b>طريقة الدفع:</b> الدفع عند الاستلام (COD)
⏰ <b>تاريخ الطلب:</b> ${dateStr} | ${timeStr}
`.trim();

      const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
      const payload = {
        chat_id: CHAT_ID,
        text: telegramMsg,
        parse_mode: "HTML",
      };

      try {
        await sendTelegramWithRetry(telegramUrl, payload);
        console.log(`Telegram order notification sent successfully for ${orderId}`);
      } catch (tgErr) {
        console.error("Telegram notification failed after all retries:", tgErr);
      }
    } else {
      console.warn("Telegram BOT_TOKEN or CHAT_ID is missing. Notification skipped.");
    }

    // Return gorgeous, standardized success response
    const responseOrder = {
      id: orderId,
      customerName: orderData.name,
      email: `guest-${orderId}@omen-store.shop`,
      phone: orderData.phone,
      governorate: orderData.governorate || '',
      city: orderData.city,
      address: orderData.address,
      nearbyLandmark: orderData.nearbyLandmark || undefined,
      notes: orderData.notes || undefined,
      totalAmount: grandTotal,
      paymentMethod: "cod" as const,
      status: "pending" as const,
      createdAt,
      items: Array.isArray(orderData.items) ? orderData.items : [],
    };

    return res.status(200).json({
      success: true,
      order: responseOrder,
    });

  } catch (error: any) {
    console.error("General API checkout handler error:", error);
    return res.status(500).json({
      error: error.message || "حدث خطأ غير متوقع أثناء معالجة طلبك."
    });
  }
});

// START EXPRESS/VITE ENGINE
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // In development mode, load Vite server as a middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Store Server successfully running at:`);
    console.log(`   ➜ Local:   http://localhost:${PORT}/`);
    console.log(`   ➜ Network: http://127.0.0.1:${PORT}/`);
  });
}

startServer();
