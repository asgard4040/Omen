import React, { useState, useEffect, Suspense, lazy } from 'react';
import ToastNotification, { ToastMessage } from './components/Toast';
import { PRODUCTS, CATEGORIES } from './data';
import { Product, Order, Category } from './types';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

// Pre-seeded realistic orders to make the admin dashboard look rich and ready on launch
const INITIAL_ORDERS: Order[] = [
  {
    id: 'OW-842910',
    customerName: 'فيصل بن عبد العزيز',
    email: 'faisal.az@outlook.sa',
    phone: '0543210987',
    address: 'حي الملقا، شارع الأمير محمد بن سعد',
    city: 'الرياض',
    items: [
      { productId: 'wraith-apex-pro', productName: 'أومين ريث "أيبكس" مغنيسيوم برو', price: 599, quantity: 1 }
    ],
    totalAmount: 599,
    status: 'shipping',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    paymentMethod: 'card',
  },
  {
    id: 'OW-194052',
    customerName: 'سارة خالد الحربي',
    email: 'sara.harbi9@gmail.com',
    phone: '0509876543',
    address: 'حي الشاطئ، طريق الكورنيش، برج ريفيرا',
    city: 'جدة',
    items: [
      { productId: 'wraith-v1', productName: 'أومين ريث V1 برو', price: 349, quantity: 1 },
      { productId: 'wraith-phantom', productName: 'أومين ريث "فانتوم" المحدودة', price: 449, quantity: 1 }
    ],
    totalAmount: 798,
    status: 'pending',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    paymentMethod: 'cod',
  },
  {
    id: 'OW-305194',
    customerName: 'سعد العريفي',
    email: 's_arifi@yahoo.com',
    phone: '0567654321',
    address: 'حي الحزام الذهبي، شارع الأمير فيصل',
    city: 'الخبر',
    items: [
      { productId: 'wraith-v1', productName: 'أومين ريث V1 برو', price: 349, quantity: 2 }
    ],
    totalAmount: 698,
    status: 'completed',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    paymentMethod: 'card',
  }
];

export default function AdminApp() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Mock handlers for offline demo mode
  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    addToast(`تم تحديث حالة الطلب ${orderId} إلى ${newStatus}`, 'success');
  };

  const handleUpdateProductStock = (productId: string, newStock: number, newPrice: number) => {
    setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock: newStock, price: newPrice } : p));
  };

  return (
    <div className="bg-[#0b071a] min-h-screen font-sans">
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-brand-blue"><div className="animate-spin h-8 w-8 border-4 border-brand-blue border-t-transparent rounded-full"></div></div>}>
        <AdminDashboard
          isOpen={true} // Always open in the standalone app
          onClose={() => { window.location.href = '/'; }} // Go back to store
          orders={orders}
          products={products}
          categories={categories}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateProductStock={handleUpdateProductStock}
          logoUrl={logoUrl}
          onUpdateLogo={setLogoUrl}
        />
      </Suspense>

      <ToastNotification toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
