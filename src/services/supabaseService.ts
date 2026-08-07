import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { Product, Category, Order } from '../types';

// Let's define the interface for order list item (which includes items)
export interface RichOrder extends Order {
  raw_items?: any[];
}

/**
 * Upload an image file to the Supabase Storage bucket 'images'
 */
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export async function uploadImage(file: File): Promise<string> {
  if (!isSupabaseConfigured()) {
    return URL.createObjectURL(file);
  }

  try {
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        data: await fileToBase64(file),
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || 'فشل رفع الصورة إلى الخادم');
    }

    if (!payload?.publicUrl) {
      throw new Error('لم يتم إرجاع رابط الصورة من الخادم');
    }

    return payload.publicUrl;
  } catch (error: any) {
    console.error('Server upload error:', error);
    throw new Error(`فشل رفع الصورة: ${error.message}`);
  }
}

/**
 * CATEGORIES SERVICE
 */
export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return (data || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    nameEn: cat.nameEn || cat.name_en,
    icon: cat.icon,
    description: cat.description || '',
    available: cat.available,
  }));
}

export async function createCategory(category: Omit<Category, 'id'> & { id: string }): Promise<Category> {
  if (!isSupabaseConfigured()) throw new Error('Supabase Not Configured');

  const { data, error } = await supabase
    .from('categories')
    .insert([
      {
        id: category.id,
        name: category.name,
        nameEn: category.nameEn,
        icon: category.icon,
        description: category.description,
        available: category.available,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    nameEn: data.nameEn || data.name_en,
    icon: data.icon,
    description: data.description || '',
    available: data.available,
  };
}

export async function updateCategory(id: string, category: Partial<Category>): Promise<Category> {
  if (!isSupabaseConfigured()) throw new Error('Supabase Not Configured');

  const payload: any = {};
  if (category.name !== undefined) payload.name = category.name;
  if (category.nameEn !== undefined) payload.nameEn = category.nameEn;
  if (category.icon !== undefined) payload.icon = category.icon;
  if (category.description !== undefined) payload.description = category.description;
  if (category.available !== undefined) payload.available = category.available;

  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    nameEn: data.nameEn || data.name_en,
    icon: data.icon,
    description: data.description || '',
    available: data.available,
  };
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase Not Configured');

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * PRODUCTS SERVICE (With search, filter, pagination)
 */
interface GetProductsParams {
  searchQuery?: string;
  categoryId?: string;
  stockStatus?: 'all' | 'low' | 'out';
  page?: number;
  pageSize?: number;
}

export async function getProducts(params: GetProductsParams = {}): Promise<{ products: Product[]; totalCount: number }> {
  if (!isSupabaseConfigured()) return { products: [], totalCount: 0 };

  const { searchQuery, categoryId, stockStatus, page = 1, pageSize = 12 } = params;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' });

  // Apply filters
  if (categoryId && categoryId !== 'all') {
    query = query.eq('category', categoryId);
  }

  if (stockStatus === 'low') {
    query = query.lte('stock', 5).gt('stock', 0);
  } else if (stockStatus === 'out') {
    query = query.eq('stock', 0);
  }

  if (searchQuery) {
    // Search by English or Arabic names
    query = query.or(`name.ilike.%${searchQuery}%,nameEn.ilike.%${searchQuery}%`);
  }

  // Sorting
  query = query.order('created_at', { ascending: false });

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }

  const mappedProducts: Product[] = (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    nameEn: p.nameEn || p.name_en || '',
    description: p.description,
    price: Number(p.price),
    oldPrice: p.originalPrice ? Number(p.originalPrice) : (p.old_price ? Number(p.old_price) : undefined),
    rating: Number(p.rating),
    reviewsCount: p.reviewsCount || p.reviews_count || 0,
    image: p.image || p.image_url || '',
    images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []),
    category: p.category || p.category_id || '',
    stock: p.stock,
    isFeatured: p.isFeatured || p.is_featured || false,
    features: p.features || [],
    specs: Array.isArray(p.specs) ? p.specs : [],
    colors: Array.isArray(p.colors) ? p.colors : [],
    customOptions: Array.isArray(p.customOptions || p.custom_options) ? (p.customOptions || p.custom_options) : [],
  }));

  return {
    products: mappedProducts,
    totalCount: count || 0,
  };
}

export async function createProduct(product: Omit<Product, 'rating' | 'reviewsCount'>): Promise<Product> {
  if (!isSupabaseConfigured()) throw new Error('Supabase Not Configured');

  let targetId = product.id;

  const candidates: any[] = [
    // 1. Full camelCase (if custom columns colors/customOptions/images exist)
    {
      id: targetId,
      category: product.category,
      name: product.name,
      nameEn: product.nameEn,
      description: product.description,
      price: product.price,
      originalPrice: product.oldPrice || null,
      image: product.image,
      images: product.images || [product.image],
      stock: product.stock,
      isFeatured: product.isFeatured || false,
      features: product.features || [],
      specs: product.specs || [],
      colors: product.colors || [],
      customOptions: product.customOptions || [],
      rating: 5.0,
      reviewsCount: 0,
    },
    // 2. Standard camelCase (without extended customOptions/colors/images)
    {
      id: targetId,
      category: product.category,
      name: product.name,
      nameEn: product.nameEn,
      description: product.description,
      price: product.price,
      originalPrice: product.oldPrice || null,
      image: product.image,
      stock: product.stock,
      isFeatured: product.isFeatured || false,
      features: product.features || [],
      specs: product.specs || [],
      rating: 5.0,
      reviewsCount: 0,
    },
    // 3. Minimal camelCase core
    {
      id: targetId,
      category: product.category,
      name: product.name,
      nameEn: product.nameEn,
      description: product.description,
      price: product.price,
      image: product.image,
      stock: product.stock,
    },
    // 4. Snake_case schema fallback
    {
      id: targetId,
      category_id: product.category,
      name: product.name,
      name_en: product.nameEn,
      description: product.description,
      price: product.price,
      old_price: product.oldPrice || null,
      image_url: product.image,
      stock: product.stock,
      is_featured: product.isFeatured || false,
      features: product.features || [],
      specs: product.specs || [],
      rating: 5.0,
      reviews_count: 0,
    }
  ];

  let lastError: any = null;
  let data: any = null;

  for (const candidate of candidates) {
    let payload = { ...candidate, id: targetId };
    let res = await supabase
      .from('products')
      .insert([payload])
      .select()
      .single();

    // If 409 Conflict (Duplicate Primary Key ID), append unique timestamp suffix and retry
    if (res.error && (res.error.code === '23505' || res.error.status === 409 || res.error.message?.includes('duplicate key'))) {
      targetId = `${product.id}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
      payload.id = targetId;
      console.warn(`Product ID collision detected (409). Retrying with new unique ID: ${targetId}`);
      res = await supabase
        .from('products')
        .insert([payload])
        .select()
        .single();
    }

    if (!res.error && res.data) {
      data = res.data;
      break;
    }
    lastError = res.error;
  }

  if (!data) {
    console.error('All createProduct candidate payloads failed:', lastError);
    throw new Error(`فشل إدراج المنتج بقاعدة البيانات: ${lastError?.message || 'خطأ غير معروف'}`);
  }

  return {
    id: data.id,
    name: data.name,
    nameEn: data.nameEn || data.name_en || '',
    description: data.description,
    price: Number(data.price),
    oldPrice: data.originalPrice ? Number(data.originalPrice) : (data.old_price ? Number(data.old_price) : undefined),
    rating: Number(data.rating || 5),
    reviewsCount: Number(data.reviewsCount || data.reviews_count || 0),
    image: data.image || data.image_url || '',
    images: Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []),
    category: data.category || data.category_id || '',
    stock: data.stock,
    isFeatured: data.isFeatured || data.is_featured || false,
    features: data.features || [],
    specs: data.specs || [],
    colors: Array.isArray(data.colors) ? data.colors : [],
    customOptions: Array.isArray(data.customOptions || data.custom_options) ? (data.customOptions || data.custom_options) : [],
  };
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  if (!isSupabaseConfigured()) throw new Error('Supabase Not Configured');

  const camelFull: any = {};
  if (product.category !== undefined) camelFull.category = product.category;
  if (product.name !== undefined) camelFull.name = product.name;
  if (product.nameEn !== undefined) camelFull.nameEn = product.nameEn;
  if (product.description !== undefined) camelFull.description = product.description;
  if (product.price !== undefined) camelFull.price = product.price;
  if (product.oldPrice !== undefined) camelFull.originalPrice = product.oldPrice || null;
  if (product.image !== undefined) camelFull.image = product.image;
  if (product.images !== undefined) camelFull.images = product.images;
  if (product.stock !== undefined) camelFull.stock = product.stock;
  if (product.isFeatured !== undefined) camelFull.isFeatured = product.isFeatured;
  if (product.features !== undefined) camelFull.features = product.features;
  if (product.specs !== undefined) camelFull.specs = product.specs;
  if (product.colors !== undefined) camelFull.colors = product.colors;
  if (product.customOptions !== undefined) camelFull.customOptions = product.customOptions;

  const camelStandard = { ...camelFull };
  delete camelStandard.colors;
  delete camelStandard.customOptions;
  delete camelStandard.images;

  // Candidate 3: Core camelCase (only standard guaranteed columns)
  const camelCore: any = {};
  if (product.category !== undefined) camelCore.category = product.category;
  if (product.name !== undefined) camelCore.name = product.name;
  if (product.nameEn !== undefined) camelCore.nameEn = product.nameEn;
  if (product.description !== undefined) camelCore.description = product.description;
  if (product.price !== undefined) camelCore.price = product.price;
  if (product.image !== undefined) camelCore.image = product.image;
  if (product.stock !== undefined) camelCore.stock = product.stock;

  const snakeFull: any = {};
  if (product.category !== undefined) snakeFull.category_id = product.category;
  if (product.name !== undefined) snakeFull.name = product.name;
  if (product.nameEn !== undefined) snakeFull.name_en = product.nameEn;
  if (product.description !== undefined) snakeFull.description = product.description;
  if (product.price !== undefined) snakeFull.price = product.price;
  if (product.oldPrice !== undefined) snakeFull.old_price = product.oldPrice || null;
  if (product.image !== undefined) snakeFull.image_url = product.image;
  if (product.images !== undefined) snakeFull.images = product.images;
  if (product.stock !== undefined) snakeFull.stock = product.stock;
  if (product.isFeatured !== undefined) snakeFull.is_featured = product.isFeatured;
  if (product.features !== undefined) snakeFull.features = product.features;
  if (product.specs !== undefined) snakeFull.specs = product.specs;
  if (product.colors !== undefined) snakeFull.colors = product.colors;
  if (product.customOptions !== undefined) snakeFull.custom_options = product.customOptions;

  const candidates = [camelFull, camelStandard, camelCore, snakeFull];
  let data: any = null;
  let lastError: any = null;

  for (const payload of candidates) {
    if (Object.keys(payload).length === 0) continue;
    const res = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!res.error && res.data) {
      data = res.data;
      break;
    }
    lastError = res.error;
  }

  if (!data) {
    console.error('All updateProduct candidate payloads failed:', lastError);
    throw new Error(`خطأ في تعديل المنتج بقاعدة البيانات: ${lastError?.message || 'خطأ غير معروف'}`);
  }

  return {
    id: data.id,
    name: data.name,
    nameEn: data.nameEn || data.name_en || '',
    description: data.description,
    price: Number(data.price),
    oldPrice: data.originalPrice ? Number(data.originalPrice) : (data.old_price ? Number(data.old_price) : undefined),
    rating: Number(data.rating || 5),
    reviewsCount: Number(data.reviewsCount || data.reviews_count || 0),
    image: data.image || data.image_url || '',
    images: Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []),
    category: data.category || data.category_id || '',
    stock: data.stock,
    isFeatured: data.isFeatured || data.is_featured || false,
    features: data.features || [],
    specs: data.specs || [],
    colors: Array.isArray(data.colors) ? data.colors : [],
    customOptions: Array.isArray(data.customOptions || data.custom_options) ? (data.customOptions || data.custom_options) : [],
  };
}

export async function deleteProduct(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase Not Configured');

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * ORDERS SERVICE
 */
interface GetOrdersParams {
  searchQuery?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function getOrders(params: GetOrdersParams = {}): Promise<{ orders: Order[]; totalCount: number }> {
  if (!isSupabaseConfigured()) return { orders: [], totalCount: 0 };

  const { searchQuery, status, page = 1, pageSize = 10 } = params;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' });

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply search query (customer name, phone, email, or order ID)
  if (searchQuery) {
    query = query.or(`customer_name.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%,id.ilike.%${searchQuery}%`);
  }

  // Order sorting
  query = query.order('created_at', { ascending: false });

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }

  const mappedOrders: Order[] = (data || []).map((order: any) => ({
    id: order.id,
    customerName: order.customer_name,
    email: '',
    phone: order.customer_phone || '',
    address: order.address_details || '',
    city: order.city,
    totalAmount: Number(order.total_amount),
    status: order.status,
    createdAt: order.created_at,
    paymentMethod: 'cod',
    items: (order.items || []).map((item: any) => ({
      productId: item.productId || item.product_id,
      productName: item.productName || item.product_name,
      price: Number(item.price),
      quantity: item.quantity,
    })),
  }));

  return {
    orders: mappedOrders,
    totalCount: count || 0,
  };
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase Not Configured');

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) throw error;
}

export async function deleteOrderInSupabase(orderId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (error) throw error;
}

/**
 * Creates a new guest order and its corresponding order items in Supabase
 */
export async function createOrderInSupabase(order: Order): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // 1. Insert order record
  const { error: orderError } = await supabase
    .from('orders')
    .insert([
      {
        id: order.id,
        customer_name: order.customerName,
        customer_phone: order.phone,
        address_details: order.address,
        city: order.city,
        items: order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
        })),
        total_amount: order.totalAmount,
        shipping_fee: 0,
        status: order.status || 'pending',
        created_at: order.createdAt || new Date().toISOString(),
      },
    ]);

  if (orderError) {
    console.error('Error inserting order:', orderError);
    throw orderError;
  }

  // 2. Decrement product stocks
  for (const item of order.items) {
    // Fetch current stock
    const { data: prodData } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.productId)
      .maybeSingle();

    if (prodData) {
      const currentStock = prodData.stock || 0;
      const newStock = Math.max(0, currentStock - item.quantity);
      
      await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.productId);
    }
  }
}

/**
 * SETTINGS SERVICE
 */
export async function getSettings(): Promise<Record<string, any>> {
  if (!isSupabaseConfigured()) return {};

  const { data, error } = await supabase
    .from('settings')
    .select('*');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const settingsMap: Record<string, any> = {};
  (data || []).forEach((row) => {
    settingsMap[row.key] = row.value;
  });

  return settingsMap;
}

export async function saveSettings(key: string, value: Record<string, any>): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase Not Configured');

  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) throw error;
}

/**
 * ADMIN PRIVILEGES CHECK & ROLE MANAGEMENT
 */
export async function checkIfCurrentUserIsAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;

  const { data, error } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error verifying admin status:', error);
    return false;
  }

  return !!data;
}
