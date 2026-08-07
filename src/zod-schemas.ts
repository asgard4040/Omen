import { z } from "zod";

// 1. Category Validation Schema
export const categorySchema = z.object({
  id: z.string().min(2, "المعرف يجب أن يكون حرفين على الأقل / ID must be at least 2 chars"),
  name: z.string().min(2, "الاسم العربي مطلوب / Arabic Name is required"),
  name_en: z.string().min(2, "الاسم الإنجليزي مطلوب / English Name is required"),
  icon: z.string().min(1, "الأيقونة مطلوبة / Icon is required"),
  description: z.string().optional(),
  available: z.boolean().default(true),
});

// 2. Product Spec Schema
export const productSpecSchema = z.object({
  label: z.string().min(1, "العنوان مطلوب / Label is required"),
  value: z.string().min(1, "القيمة مطلوبة / Value is required"),
});

// 3. Product Validation Schema
export const productColorSchema = z.object({
  name: z.string().min(1, "اسم اللون مطلوب"),
  hex: z.string().optional(),
});

export const customOptionSchema = z.object({
  name: z.string().min(1, "اسم الخيار مطلوب"),
  choices: z.array(z.string()).default([]),
});

// 3. Product Validation Schema
export const productSchema = z.object({
  id: z.string().min(2, "المعرف مطلوب / ID is required"),
  category_id: z.string().min(1, "الفئة مطلوبة / Category is required"),
  name: z.string().min(2, "الاسم العربي مطلوب / Arabic Name is required"),
  name_en: z.string().min(2, "الاسم الإنجليزي مطلوب / English Name is required"),
  description: z.string().min(10, "الوصف يجب أن يكون 10 حروف على الأقل / Description must be at least 10 chars"),
  price: z.number().positive("السعر يجب أن يكون أكبر من صفر / Price must be greater than zero"),
  old_price: z.number().positive("السعر القديم اختياري ولكن يجب أن يكون أكبر من صفر").nullable().optional(),
  rating: z.number().min(0).max(5).default(5),
  reviews_count: z.number().int().nonnegative().default(0),
  image_url: z.string().url("رابط الصورة غير صحيح / Invalid Image URL"),
  stock: z.number().int().nonnegative("الكمية لا يمكن أن تكون سالبة / Stock must be >= 0"),
  is_featured: z.boolean().default(false),
  features: z.array(z.string()).default([]),
  specs: z.array(productSpecSchema).default([]),
  colors: z.array(productColorSchema).optional().default([]),
  custom_options: z.array(customOptionSchema).optional().default([]),
});

// 4. Order Item Validation Schema
export const orderItemSchema = z.object({
  product_id: z.string().min(1, "معرف المنتج مطلوب"),
  product_name: z.string().min(1, "اسم المنتج مطلوب"),
  price: z.number().positive("السعر غير صالح"),
  quantity: z.number().int().positive("الكمية يجب أن تكون أكبر من صفر / Quantity must be positive"),
  selected_color: z.string().optional(),
  selected_options: z.record(z.string(), z.string()).optional(),
  options_summary: z.string().optional(),
});

// 5. Order Validation Schema
export const orderSchema = z.object({
  customer_name: z.string().min(3, "الاسم الثلاثي مطلوب / Full Name is required"),
  email: z.string().email("البريد الإلكتروني غير صالح / Invalid Email Address"),
  phone: z.string().min(9, "رقم الجوال يجب أن يكون 9 أرقام على الأقل / Phone must be at least 9 digits"),
  address: z.string().min(5, "العنوان التفصيلي مطلوب / Address is required"),
  city: z.string().min(2, "يرجى تحديد المدينة / Please select a valid city"),
  payment_method: z.enum(["cod", "card"]).default("cod"),
  items: z.array(orderItemSchema).min(1, "يجب إضافة منتج واحد على الأقل للطلب / Order must have items"),
});

// 6. Settings Validation Schema
export const settingsSchema = z.object({
  key: z.string(),
  value: z.record(z.string(), z.any()),
});

// 7. Guest Checkout Schema
export const guestCheckoutSchema = z.object({
  name: z.string().min(3, "الاسم بالكامل مطلوب (ثنائي على الأقل)"),
  phone: z.string().regex(/^(07|5)\d{8,9}$/, "رقم الجوال غير صالح، يجب أن يبدأ بـ 07 أو 5 ويتكون من 10-11 أرقامًا"),
  governorate: z.string().min(2, "المحافظة مطلوبة للشحن"),
  city: z.string().min(2, "المدينة مطلوبة للشحن"),
  address: z.string().min(5, "العنوان التفصيلي مطلوب للشحن (5 حروف على الأقل)"),
  nearbyLandmark: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.literal("cod"),
  items: z.array(z.object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    selectedColor: z.string().optional(),
    selectedOptions: z.record(z.string(), z.string()).optional(),
    optionsSummary: z.string().optional(),
  })).min(1, "يجب إضافة منتج واحد على الأقل للطلب"),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>;

