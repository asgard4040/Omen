import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  ShieldCheck, 
  Truck, 
  Check, 
  Star, 
  Cpu, 
  Sparkles, 
  Compass, 
  MousePointer, 
  Lock, 
  Zap, 
  ArrowLeft,
  RefreshCw,
  Bell,
  Sliders,
  Mail,
  Gamepad2,
  AlertCircle,
  Phone
} from 'lucide-react';

import Header from './components/Header';
import ProductCard from './components/ProductCard';
import ToastNotification, { ToastMessage } from './components/Toast';
import { PRODUCTS, CATEGORIES } from './data';
import { Product, CartItem, Order, Category, ProductColor } from './types';
import { isSupabaseConfigured } from './supabaseClient';
import { getProducts, getCategories, getOrders, createOrderInSupabase, getSettings } from './services/supabaseService';

const ProductDetailsModal = lazy(() => import('./components/ProductDetailsModal'));
const CartDrawer = lazy(() => import('./components/CartDrawer'));

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
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3 hours ago
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
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), // 12 hours ago
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
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), // 2 days ago
    paymentMethod: 'card',
  }
];

export default function App() {
  // Check if DB is live
  const isDbLive = isSupabaseConfigured();

  // State managers (start empty if DB is configured to prevent flashing sample products)
  const [products, setProducts] = useState<Product[]>(isDbLive ? [] : PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(isDbLive ? [] : CATEGORIES);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [currentCategory, setCurrentCategory] = useState<string>('mouses');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');

  // Drawer & Modal control
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Full Preloader Screen - stays active until real products are loaded
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load live data from Supabase if configured, or fallbacks if not
  useEffect(() => {
    async function fetchLiveStorefront() {
      if (!isDbLive) {
        setProducts(PRODUCTS);
        setCategories(CATEGORIES);
        setIsInitialLoading(false);
        return;
      }

      try {
        const liveCats = await getCategories();
        if (liveCats.length > 0) {
          setCategories(liveCats);
          const firstAvail = liveCats.find((c) => c.available);
          if (firstAvail) {
            setCurrentCategory(firstAvail.id);
          }
        }

        const liveProdsResult = await getProducts({ pageSize: 100 });
        setProducts(liveProdsResult.products);

        const liveOrdersResult = await getOrders({ pageSize: 100 });
        if (liveOrdersResult.orders.length > 0) {
          setOrders(liveOrdersResult.orders);
        }

        const fetchedSettings = await getSettings();
        if (fetchedSettings && fetchedSettings.logo && fetchedSettings.logo.url) {
          setLogoUrl(fetchedSettings.logo.url);
        }
      } catch (err) {
        console.error('Failed to load live storefront data:', err);
      } finally {
        setIsInitialLoading(false);
      }
    }

    fetchLiveStorefront();
  }, [isDbLive]);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Email Coming Soon subscription state
  const [comingSoonCategory, setComingSoonCategory] = useState<string | null>(null);
  const [comingSoonEmail, setComingSoonEmail] = useState('');
  const [comingSoonSuccess, setComingSoonSuccess] = useState(false);

  // Hotspots for interactive mouse blueprint
  const [activeHotspot, setActiveHotspot] = useState<number>(0);

  // Custom Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Cart actions
  const handleAddToCart = (
    product: Product,
    selectedColor?: ProductColor,
    selectedOptions?: Record<string, string>
  ) => {
    if (product.stock <= 0) {
      addToast('عذرًا، نفذ هذا الملحق الفاخر من المخزن حاليًا!', 'error');
      return;
    }

    // Default color/options if product has them but direct add-to-cart was clicked
    let colorToUse = selectedColor;
    if (!colorToUse && product.colors && product.colors.length > 0) {
      colorToUse = product.colors[0];
    }

    let optionsToUse = selectedOptions;
    if (!optionsToUse && product.customOptions && product.customOptions.length > 0) {
      const initialOpts: Record<string, string> = {};
      product.customOptions.forEach((opt) => {
        if (opt.choices && opt.choices.length > 0) {
          initialOpts[opt.name] = opt.choices[0];
        }
      });
      optionsToUse = initialOpts;
    }

    const itemId = `${product.id}-${colorToUse?.name || 'nocolor'}-${JSON.stringify(optionsToUse || {})}`;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => (item.id || item.product.id) === itemId);
      if (existingIndex > -1) {
        const existing = prevItems[existingIndex];
        if (existing.quantity >= product.stock) {
          addToast(`عذرًا، الحد الأقصى المتاح بالمستودع هو ${product.stock} قطع فقط!`, 'error');
          return prevItems;
        }
        addToast(`تم تحديث كمية ${product.name} بحقيبة التسوق!`);
        return prevItems.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      addToast(`تمت إضافة ${product.name} لحقيبة المشتريات!`);
      return [
        ...prevItems,
        {
          id: itemId,
          product,
          quantity: 1,
          selectedColor: colorToUse,
          selectedOptions: optionsToUse,
        },
      ];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const currentId = item.id || item.product.id;
        if (currentId === itemId) {
          if (quantity > item.product.stock) {
            addToast(`عذرًا، الحد الأقصى للطلب المتوفر هو ${item.product.stock} قطع!`, 'error');
            return item;
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => (item.id || item.product.id) !== itemId));
    addToast('تمت إزالة العتاد من السلة.');
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Admin Navigation
  const handleAdminLaunch = () => {
    window.location.href = '/admin.html';
  };

  // Live order state management from checkout
  const handleCheckoutComplete = (newOrder: Order) => {
    // Add to orders log
    setOrders((prev) => [newOrder, ...prev]);
    
    // Decrement stocks in state
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const orderItem = newOrder.items.find((item) => item.productId === p.id);
        if (orderItem) {
          return { ...p, stock: Math.max(0, p.stock - orderItem.quantity) };
        }
        return p;
      })
    );

    addToast(`تم تأكيد طلبك ${newOrder.id} بنجاح! شكراً لثقتك.`, 'success');
  };

  // Update Orders from Dashboard
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    addToast(`تم تحديث حالة الشحنة ${orderId} بنجاح.`);
  };

  // Update Inventory from Dashboard
  const handleUpdateProductStock = (productId: string, newStock: number, newPrice: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock, price: newPrice } : p))
    );
    addToast('تمت مزامنة السعر والمخزون بنجاح!');
  };

  // Pre-subscribe coming soon categories
  const handleSubscribeComingSoon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comingSoonEmail.trim()) return;
    setComingSoonSuccess(true);
    setTimeout(() => {
      setComingSoonEmail('');
      setComingSoonSuccess(false);
      setComingSoonCategory(null);
      addToast('تم تسجيل بريدك في قائمة الحجز المبكر بنجاح!', 'success');
    }, 2000);
  };

  const hotspots = [
    {
      id: 0,
      title: 'هيكل مفرغ خارق الخفة (39 غرام)',
      desc: 'مسبوك بعناية متناهية من سبائك المغنيسيوم الصلبة المخصصة لصناعات الفضاء والطيران لتحدي قوانين الجاذبية وتسهيل الحركات الخاطفة السريعة.',
      coords: 'top-[30%] right-[32%]',
    },
    {
      id: 1,
      title: 'مفاتيح بصرية هجينة 100M كليك',
      desc: 'أسرع نقرة في الكون بزمن استجابة 0.125 ملي ثانية فقط. خالية تمامًا من تأخير ارتداد النقرات المزدوجة المزعجة.',
      coords: 'top-[22%] left-[45%]',
    },
    {
      id: 2,
      title: 'مستشعر Wraith Apex 32K DPI',
      desc: 'معدل دقة استثنائي يصل لـ 99.8% مع تعقب متناهي الدقة على أي سطح حتى لو كان زجاجيًا بالكامل، وتسارع هائل يصل لـ 50G.',
      coords: 'bottom-[42%] right-[51%]',
    },
    {
      id: 3,
      title: 'شريحة استجابة لاسلكية 8000Hz حقيقية',
      desc: 'سرعة سبر متفوقة بـ 8 أضعاف مقارنة بالفارات اللاسلكية القياسية الأخرى، تضمن نقاء تام لتدفق إشارات اللعب دون أي تشويش.',
      coords: 'bottom-[25%] left-[34%]',
    }
  ];

  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b071a]">
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 rounded-full border-4 border-brand-blue/20 border-t-brand-blue animate-spin" />
          <div className="absolute w-8 h-8 rounded-full bg-brand-blue/30 blur-md animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-24 text-gray-100 font-sans selection:bg-brand-blue/30 selection:text-brand-lavender relative cyber-grid">
      
      {/* Dynamic Animated background visual shapes with soft blur */}
      <div className="absolute top-[10%] left-[5%] -z-20 h-96 w-96 rounded-full bg-brand-blue/10 blur-[130px] animate-float-1" />
      <div className="absolute bottom-[20%] right-[5%] -z-20 h-[500px] w-[500px] rounded-full bg-brand-blue/5 blur-[150px] animate-float-2" />

      {/* Header component */}
      <Header
        cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
        onAdminClick={handleAdminLaunch}
        isAdminLoggedIn={false}
        onLogout={() => {}}
        currentCategory={currentCategory}
        onCategorySelect={setCurrentCategory}
        categories={categories}
        logoUrl={logoUrl}
      />

      {/* HERO HERO SECTION */}
      <section className="relative w-full h-[520px] overflow-hidden flex items-center justify-center text-center">
        {/* Full background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center select-none"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1600&auto=format&fit=crop&q=80')` }}
        />
        {/* Deep black/blue overlay to make text highly readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-black/95" />
        
        {/* Content container */}
        <div className="relative z-10 max-w-4xl px-4 mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.2] tracking-tight">
            اللعب مو حظ.
          </h1>
          
          <p className="text-brand-lavender/80 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-medium font-sans">
            إذا تريد أداء يفرق، فأنت بالمكان الصح. اختر من أفضل الماوسات وملحقات الـPC المختارة بعناية حتى تلعب براحة، سرعة، ودقة بكل مواجهة.
          </p>

          {/* Action launcher */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <a 
              href="#storefront" 
              className="inline-flex h-12 items-center justify-center bg-brand-blue hover:bg-brand-blue/80 px-8 text-sm font-bold text-white transition-all duration-300 cursor-pointer"
            >
              تصفح منتجاتنا الراقية
            </a>
          </div>
        </div>
      </section>

      {/* CORE STOREFRONT GRID */}
      <section id="storefront" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-right scroll-mt-20">
        
        {/* Section Title */}
        <div className="mb-10 flex flex-col gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">منتجات تخلي اداءك يفرق 
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 font-medium">
              انقر على أي منتج لاستعراض مميزاته ومواصفاته التقنية الكاملة أو إضافته مباشرة لسلتك.
            </p>
          </div>
          
          {/* Horizontal mini-category tags */}
          <div className="flex flex-wrap justify-start gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.available) {
                    setCurrentCategory(cat.id);
                  } else {
                    setComingSoonCategory(cat.name);
                    setComingSoonSuccess(false);
                  }
                }}
                className={`px-3.5 py-2 text-xs font-bold transition-all ${
                  currentCategory === cat.id && cat.available
                    ? 'bg-brand-blue/15 border border-brand-blue text-white'
                    : 'bg-brand-lavender/5 border border-brand-lavender/10 text-brand-lavender/60 hover:border-brand-blue/40 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {cat.name}
                  {!cat.available && (
                    <span className="text-[8px] bg-black px-1 py-0.5 border border-brand-lavender/10 text-brand-lavender/40">قريباً</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Categories display toggle */}
        {products.filter((p) => p.category === currentCategory).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products
               .filter((p) => p.category === currentCategory)
               .map((product) => (
                 <ProductCard
                   key={product.id}
                   product={product}
                   onAddToCart={handleAddToCart}
                   onViewDetails={setSelectedProduct}
                 />
               ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-black border border-brand-lavender/10 p-8 max-w-xl mx-auto">
            <Compass className="h-12 w-12 text-brand-blue mx-auto mb-4 animate-spin-slow" />
            <h3 className="text-lg font-bold text-white">ترقب الملحقات القادمة قريباً</h3>
            <p className="text-xs text-brand-lavender/60 mt-2 leading-relaxed">
              هذا القسم قيد التطوير التقني. نقوم حاليًا باختبار لوحات مفاتيح مغناطيسية متطورة وأسطح هجينة لتكتمل ترسانتك التنافسية.
            </p>
          </div>
        )}

      </section>

      {/* FOOTER AND TRUST SECTION */}
      <footer className="bg-black border-t border-brand-lavender/10 py-10 text-right relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Logo and Simple Branding */}
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="OMEN WRAITH Logo" className="h-10 w-auto" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10 border border-brand-blue/30 text-brand-blue">
                  <Cpu className="h-5 w-5 animate-pulse" />
                </div>
              )}
              <div>
                <h3 className="font-orbitron text-lg font-black text-white leading-none">
                  Omen Store
                </h3>
                <p className="text-xs text-brand-lavender/60 font-medium mt-1">
                  متجر Omen Store الرسمي لملحقات الألعاب الفاخرة والأجهزة التنافسية في العراق
                </p>
              </div>
            </div>

            {/* Direct Contact Info */}
            <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 px-5 py-3 rounded-2xl backdrop-blur-md shadow-[0_0_20px_rgba(33,42,220,0.1)]">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-blue animate-bounce" />
                <span className="text-xs font-bold text-white/80">خدمة العملاء والطلب الفوري:</span>
              </div>
              <a 
                href="tel:07771295870" 
                className="font-orbitron font-black text-base text-emerald-400 hover:text-emerald-300 transition-colors tracking-wider dir-ltr"
              >
                07771295870
              </a>
            </div>

            {/* Copyright */}
            <div className="flex items-center gap-4 text-xs text-brand-lavender/40 font-medium">
              <span>جميع الحقوق محفوظة © 2026 Omen Store</span>
            </div>

          </div>
        </div>
      </footer>

      {/* GUEST CHECKOUT CART SIDEBAR */}
      <Suspense fallback={null}>
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveCartItem}
          onClearCart={handleClearCart}
          onCheckoutComplete={handleCheckoutComplete}
        />

        {/* FULL SPECIFICATIONS MODAL OVERLAY */}
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      </Suspense>

      {/* SUBSCRIBE NOTIFICATION MODAL (COMING SOON) */}
      {comingSoonCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="absolute inset-0 cursor-default" onClick={() => setComingSoonCategory(null)} />
          
          <div className="relative z-10 w-full max-w-sm bg-black border border-brand-lavender/20 p-6 text-right">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-1.5 justify-start">
              <Bell className="h-5 w-5 text-brand-blue animate-bounce" />
              <span>ترقب تدفق {comingSoonCategory}!</span>
            </h3>
            <p className="text-xs text-brand-lavender/60 leading-relaxed mb-4">
              مجموعتنا القادمة من {comingSoonCategory} في مراحل التصنيع المتقدمة والتشطيب الميكانيكي. سجل بريدك لتكون أول من يحصل على إشعار بالتوفر الحصري وخصم 10% الحجز المبكر!
            </p>

            <form onSubmit={handleSubscribeComingSoon} className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  placeholder="username@domain.com"
                  value={comingSoonEmail}
                  onChange={(e) => setComingSoonEmail(e.target.value)}
                  className="w-full text-center bg-black border border-brand-lavender/15 px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-brand-blue font-orbitron"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setComingSoonCategory(null)}
                  className="flex-1 h-10 bg-black hover:bg-brand-lavender/5 border border-brand-lavender/10 text-xs font-bold text-brand-lavender/80"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={comingSoonSuccess}
                  className="flex-1 h-10 bg-brand-blue hover:brightness-115 text-xs font-bold text-white flex items-center justify-center gap-1"
                >
                  {comingSoonSuccess ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>تم الاشتراك!</span>
                    </>
                  ) : (
                    <span>سجلني في الانتظار</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM CONTAINER */}
      <ToastNotification toasts={toasts} onRemove={removeToast} />

    </div>
  );
}
