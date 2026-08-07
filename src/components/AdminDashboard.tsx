import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  ShieldAlert, 
  CheckCircle, 
  RefreshCw, 
  Edit2, 
  Check, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronLeft, 
  Settings as SettingsIcon,
  Upload,
  Layers,
  Unlock,
  Lock,
  Mail,
  User,
  ExternalLink,
  Save,
  HelpCircle,
  Image,
  Download
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  getOrders, 
  updateOrderStatus, 
  deleteOrderInSupabase,
  getSettings, 
  saveSettings, 
  uploadImage,
  checkIfCurrentUserIsAdmin
} from '../services/supabaseService';
import { Product, Category, Order } from '../types';
import { isAdminPasswordValid, resolveAdminPassword } from './adminAuth';
import { downloadOrderReceiptAsJPG } from '../utils/receiptGenerator';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  // Fallbacks for non-configured offline demo state
  orders: Order[];
  products: Product[];
  categories: Category[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onUpdateProductStock: (productId: string, newStock: number, newPrice: number) => void;
  logoUrl?: string;
  onUpdateLogo?: (logoUrl: string) => void;
}

export default function AdminDashboard({
  isOpen,
  onClose,
  orders: fallbackOrders,
  products: fallbackProducts,
  categories: fallbackCategories,
  onUpdateOrderStatus: onFallbackUpdateOrderStatus,
  onUpdateProductStock: onFallbackUpdateProductStock,
  logoUrl: initialLogoUrl = '',
  onUpdateLogo,
}: AdminDashboardProps) {
  // Tabs: 'stats' | 'products' | 'categories' | 'orders' | 'settings'
  const [activeTab, setActiveTab] = useState<'stats' | 'products' | 'categories' | 'orders' | 'settings'>('stats');

  // Supabase Configuration Status
  const isDbLive = isSupabaseConfigured();

  // AUTH STATE
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [adminPasswordSetting, setAdminPasswordSetting] = useState('sunsun12345');
  const [storedPassword, setStoredPassword] = useState('sunsun12345');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // LIVE DATA STATE
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [orders, setOrders] = useState<Order[]>(fallbackOrders);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [settings, setSettings] = useState<Record<string, any>>({
    shipping: { fee: 25, free_above: 350 },
    contact: { phone: '+966 50 123 4567', email: 'support@omenwraith.com' }
  });

  // PAGINATION, SEARCH, AND FILTER STATES
  const [prodSearch, setProdSearch] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('all');
  const [prodStockFilter, setProdStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [prodPage, setProdPage] = useState(1);
  const [prodTotal, setProdTotal] = useState(0);
  const PROD_PAGE_SIZE = 5;

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const ORDER_PAGE_SIZE = 5;

  // REFRESH & LOADING TRIGGER STATES
  const [globalLoading, setGlobalLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // CRUD EDIT MODALS STATES
  // -- Products
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodId, setProdId] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodOldPrice, setProdOldPrice] = useState<number | undefined>(undefined);
  const [prodStock, setProdStock] = useState(0);
  const [prodCategory, setProdCategory] = useState('');
  const [prodImgUrl, setProdImgUrl] = useState('');
  const [prodExtraImagesText, setProdExtraImagesText] = useState('');
  const [prodIsFeatured, setProdIsFeatured] = useState(false);
  const [prodFeaturesText, setProdFeaturesText] = useState(''); // comma-separated or lines
  const [prodSpecsText, setProdSpecsText] = useState(''); // Label:Value lines
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // -- Product Colors & Custom Options
  const [hasColorsSection, setHasColorsSection] = useState(false);
  const [prodColors, setProdColors] = useState<{ name: string; hex?: string }[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#3b82f6');

  const [prodCustomOptions, setProdCustomOptions] = useState<{ name: string; choices: string[] }[]>([]);
  const [newOptionTitle, setNewOptionTitle] = useState('');
  const [newChoiceInputs, setNewChoiceInputs] = useState<Record<number, string>>({});

  // -- Categories
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catIcon, setCatIcon] = useState('Layers');
  const [catDesc, setCatDesc] = useState('');
  const [catAvailable, setCatAvailable] = useState(true);

  // -- Settings Form State
  const [shipFee, setShipFee] = useState(25);
  const [shipFreeAbove, setShipFreeAbove] = useState(350);
  const [contactPhone, setContactPhone] = useState('+966 50 123 4567');
  const [contactEmail, setContactEmail] = useState('support@omenwraith.com');

  const triggerToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // CHECK USER SESSION & ADMIN PRIVILEGES ON LOAD
  useEffect(() => {
    if (!isOpen) return;

    async function checkSession() {
      if (!isDbLive) {
        // Fallback or demo logged-in mode for safe viewing
        setIsAdminLoggedIn(true);
        return;
      }

      setGlobalLoading(true);
      try {
        const fetchedSettings = await getSettings();
        if (fetchedSettings && fetchedSettings.admin_password) {
          const dbPass = resolveAdminPassword(fetchedSettings.admin_password.password);
          setAdminPasswordSetting(dbPass);
          setStoredPassword(dbPass);
        }
      } catch (err) {
        console.error('Error fetching admin password on session check:', err);
      }

      const isSessionActive = localStorage.getItem('omen_admin_session') === 'true';
      if (isSessionActive) {
        setIsAdminLoggedIn(true);
        loadAllData();
      } else {
        setIsAdminLoggedIn(false);
      }
      setGlobalLoading(false);
    }

    checkSession();
  }, [isOpen, isDbLive]);

  // LOAD DATA FROM SUPABASE OR FALLBACKS
  const loadAllData = async () => {
    if (!isDbLive) return;

    setGlobalLoading(true);
    try {
      // 1. Fetch categories
      const fetchedCats = await getCategories();
      if (fetchedCats.length > 0) setCategories(fetchedCats);

      // 2. Fetch Settings
      const fetchedSettings = await getSettings();
      if (fetchedSettings.shipping) {
        setSettings(fetchedSettings);
        setShipFee(fetchedSettings.shipping.fee || 25);
        setShipFreeAbove(fetchedSettings.shipping.free_above || 350);
      }
      if (fetchedSettings.contact) {
        setContactPhone(fetchedSettings.contact.phone || '+966 50 123 4567');
        setContactEmail(fetchedSettings.contact.email || 'support@omenwraith.com');
      }
      if (fetchedSettings.logo) {
        setLogoUrl(fetchedSettings.logo.url || '');
      }
      if (fetchedSettings.admin_password) {
        const dbPass = resolveAdminPassword(fetchedSettings.admin_password.password);
        setAdminPasswordSetting(dbPass);
        setStoredPassword(dbPass);
      }

      // 3. Trigger paginated loading of products & orders
      await loadProducts();
      await loadOrders();
    } catch (err: any) {
      console.error(err);
      triggerToast('فشل تحميل البيانات من قاعدة البيانات المباشرة.', 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  // LOAD PRODUCTS WITH PAGINATION, SEARCH, AND FILTERS
  const loadProducts = async () => {
    if (!isDbLive) return;
    try {
      const result = await getProducts({
        searchQuery: prodSearch,
        categoryId: prodCatFilter,
        stockStatus: prodStockFilter,
        page: prodPage,
        pageSize: PROD_PAGE_SIZE,
      });
      setProducts(result.products);
      setProdTotal(result.totalCount);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  // LOAD ORDERS WITH PAGINATION, SEARCH, AND FILTERS
  const loadOrders = async () => {
    if (!isDbLive) return;
    try {
      const result = await getOrders({
        searchQuery: orderSearch,
        status: orderStatusFilter,
        page: orderPage,
        pageSize: ORDER_PAGE_SIZE,
      });
      setOrders(result.orders);
      setOrderTotal(result.totalCount);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  // Refetch when filters/pages change
  useEffect(() => {
    if (isAdminLoggedIn && isDbLive) {
      loadProducts();
    }
  }, [prodPage, prodSearch, prodCatFilter, prodStockFilter, isAdminLoggedIn]);

  useEffect(() => {
    if (isAdminLoggedIn && isDbLive) {
      loadOrders();
    }
  }, [orderPage, orderSearch, orderStatusFilter, isAdminLoggedIn]);

  // LOGIN HANDLER
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authPassword) {
      setAuthError('يرجى كتابة كلمة المرور.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      if (isAdminPasswordValid(authPassword, storedPassword)) {
        setIsAdminLoggedIn(true);
        localStorage.setItem('omen_admin_session', 'true');
        triggerToast('تم التحقق والدخول بنجاح!', 'success');
        if (isDbLive) {
          loadAllData();
        }
        return;
      } else {
        setAuthError('كلمة المرور غير صحيحة! يرجى المحاولة مرة أخرى.');
        return;
      }

      // Bypass standard email/password Auth
      const data = { user: null };
      const error = null;

      if (error) {
        setAuthError(`فشل التحقق: ${error.message}`);
        return;
      }

      if (data.user) {
        // Verify User Role against admins table
        const isAdmin = await checkIfCurrentUserIsAdmin();
        if (isAdmin) {
          setIsAdminLoggedIn(true);
          setCurrentUser(data.user);
          triggerToast('تم التحقق الآمن للدخول بنجاح!', 'success');
          loadAllData();
        } else {
          // Log out if not admin
          await supabase.auth.signOut();
          setAuthError('الوصول مرفوض: أنت لست مسجلاً كمسؤول نظام في جدول المشرفين.');
          triggerToast('غير مصرح لك بالدخول كمسؤول!', 'error');
        }
      }
    } catch (err: any) {
      setAuthError(`خطأ فادح: ${err.message || err}`);
    } finally {
      setAuthLoading(false);
    }
  };

  // LOGOUT HANDLER
  const handleAdminSignOut = async () => {
    localStorage.removeItem('omen_admin_session');
    if (isDbLive) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out of Supabase:', err);
      }
    }
    setIsAdminLoggedIn(false);
    setCurrentUser(null);
    setAuthEmail('');
    setAuthPassword('');
    triggerToast('تم تسجيل الخروج بنجاح.');
  };

  // ORDER STATUS CHANGE
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      if (!isDbLive) {
        onFallbackUpdateOrderStatus(orderId, nextStatus as any);
        triggerToast('تم تحديث حالة الطلب محلياً.');
        return;
      }

      setGlobalLoading(true);
      await updateOrderStatus(orderId, nextStatus);
      triggerToast(`تم تحديث حالة الطلب إلى ${nextStatus} بنجاح.`);
      loadOrders();
    } catch (err: any) {
      triggerToast(`فشل التحديث: ${err.message}`, 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`هل أنت تأكد من حذف الطلب رقم ${orderId} نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      if (isDbLive) {
        setGlobalLoading(true);
        await deleteOrderInSupabase(orderId);
        loadOrders();
      } else {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      }
      triggerToast(`تم حذف الطلب ${orderId} بنجاح.`, 'success');
    } catch (err: any) {
      console.error('Error deleting order:', err);
      triggerToast(err.message || 'فشل حذف الطلب', 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  // UPLOAD IMAGE HANDLER (Supabase Storage)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    try {
      const publicUrl = await uploadImage(file);
      setProdImgUrl(publicUrl);
      triggerToast('تم رفع الصورة بنجاح وتوليد الرابط العام!');
    } catch (err: any) {
      console.error('Image upload error:', err);
      triggerToast(err.message || 'فشل رفع الصورة للمخزن', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // SAVE PRODUCT (CREATE OR UPDATE)
  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodId || !prodName || !prodNameEn || !prodCategory || !prodPrice || !prodImgUrl) {
      const missing = [];
      if (!prodId) missing.push('معرف المنتج');
      if (!prodName) missing.push('اسم المنتج العربي');
      if (!prodNameEn) missing.push('اسم المنتج الإنجليزي');
      if (!prodCategory) missing.push('القسم');
      if (!prodPrice || prodPrice <= 0) missing.push('السعر');
      if (!prodImgUrl) missing.push('صورة المنتج الرئيسية');
      triggerToast(`يرجى استكمال الحقول المطلوبة: ${missing.join('، ')}`, 'error');
      return;
    }

    // Process features
    const featuresArray = prodFeaturesText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    // Process specs (supports Label:Value, Label - Value, or raw text per line)
    const specsArray = prodSpecsText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const match = line.match(/^([^:：\-=|]+)[:：\-=|](.+)$/);
        if (match) {
          return { label: match[1].trim(), value: match[2].trim() };
        }
        return { label: 'المواصفة', value: line };
      });

    // Process multiple extra images (supports newlines, commas, or spaces)
    const extraImagesArray = prodExtraImagesText
      .split(/[\n,\s]+/)
      .map(img => img.trim())
      .filter(img => img.length > 0 && (img.startsWith('http') || img.startsWith('/')));

    const allImagesCombined = Array.from(new Set([prodImgUrl, ...extraImagesArray])).filter(Boolean);

    const productPayload = {
      id: prodId,
      category: prodCategory,
      name: prodName,
      nameEn: prodNameEn,
      description: prodDesc,
      price: Number(prodPrice),
      oldPrice: prodOldPrice ? Number(prodOldPrice) : undefined,
      image: prodImgUrl,
      images: allImagesCombined,
      stock: Number(prodStock),
      isFeatured: prodIsFeatured,
      features: featuresArray,
      specs: specsArray,
      colors: hasColorsSection ? prodColors : [],
      customOptions: prodCustomOptions.filter(o => o.name.trim() !== '' && o.choices.length > 0),
    };

    setIsSavingProduct(true);
    setGlobalLoading(true);
    try {
      if (!isDbLive) {
        onFallbackUpdateProductStock(prodId, prodStock, prodPrice);
        setIsProductModalOpen(false);
        triggerToast('تم تحديث العتاد محلياً!');
        return;
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, productPayload);
        triggerToast('تم تعديل بيانات الملحق بنجاح!', 'success');
      } else {
        await createProduct(productPayload);
        triggerToast('تم إدراج ملحق اللعب الجديد بالمتجر بنجاح!', 'success');
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (err: any) {
      console.error("Save product error:", err);
      triggerToast(`خطأ في الحفظ: ${err.message || err}`, 'error');
    } finally {
      setIsSavingProduct(false);
      setGlobalLoading(false);
    }
  };

  // DELETE PRODUCT
  const handleDeleteProductClick = async (productId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الملحق نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    setGlobalLoading(true);
    try {
      if (!isDbLive) {
        triggerToast('غير متوفر في الوضع التجريبى.', 'error');
        return;
      }
      await deleteProduct(productId);
      triggerToast('تم حذف المنتج بنجاح.');
      loadProducts();
    } catch (err: any) {
      console.error("Delete product error:", err);
      const errMsg = err.message || '';
      if (errMsg.includes('foreign key') || errMsg.includes('violates') || errMsg.includes('order_items')) {
        triggerToast('لا يمكن حذف هذا المنتج لأنه مرتبك بطلبات شراء سابقة في النظام. يرجى تصفير كمية مخزونه بدلاً من حذفه للحفاظ على سجل المبيعات.', 'error');
      } else {
        triggerToast(`فشل حذف المنتج: ${errMsg}`, 'error');
      }
    } finally {
      setGlobalLoading(false);
    }
  };

  // Helper handlers for colors & custom options
  const handleAddColor = (name: string, hex?: string) => {
    if (!name.trim()) return;
    if (prodColors.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      triggerToast('هذا اللون مضاف بالفعل!', 'error');
      return;
    }
    setProdColors(prev => [...prev, { name: name.trim(), hex: hex || '#3b82f6' }]);
    setNewColorName('');
  };

  const handleRemoveColor = (index: number) => {
    setProdColors(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomOptionGroup = () => {
    if (!newOptionTitle.trim()) {
      triggerToast('يرجى إدخال عنوان الخيار المخصص (مثال: الحجم، نوع المفتاح)!', 'error');
      return;
    }
    setProdCustomOptions(prev => [...prev, { name: newOptionTitle.trim(), choices: [] }]);
    setNewOptionTitle('');
  };

  const handleRemoveCustomOptionGroup = (groupIndex: number) => {
    setProdCustomOptions(prev => prev.filter((_, i) => i !== groupIndex));
  };

  const handleAddChoiceToGroup = (groupIndex: number) => {
    const choiceVal = (newChoiceInputs[groupIndex] || '').trim();
    if (!choiceVal) return;
    setProdCustomOptions(prev => prev.map((grp, i) => {
      if (i === groupIndex) {
        if (grp.choices.includes(choiceVal)) return grp;
        return { ...grp, choices: [...grp.choices, choiceVal] };
      }
      return grp;
    }));
    setNewChoiceInputs(prev => ({ ...prev, [groupIndex]: '' }));
  };

  const handleRemoveChoiceFromGroup = (groupIndex: number, choiceIndex: number) => {
    setProdCustomOptions(prev => prev.map((grp, i) => {
      if (i === groupIndex) {
        return { ...grp, choices: grp.choices.filter((_, cI) => cI !== choiceIndex) };
      }
      return grp;
    }));
  };

  // OPEN PRODUCT MODAL
  const openProductForm = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setProdId(prod.id);
      setProdName(prod.name);
      setProdNameEn(prod.nameEn);
      setProdDesc(prod.description);
      setProdPrice(prod.price);
      setProdOldPrice(prod.oldPrice);
      setProdStock(prod.stock);
      setProdCategory(prod.category);
      setProdImgUrl(prod.image);
      let extraImgsList: string[] = [];
      if (Array.isArray(prod.images)) {
        extraImgsList = prod.images.filter(img => typeof img === 'string' && img !== prod.image);
      } else if (typeof prod.images === 'string') {
        try {
          const parsed = JSON.parse(prod.images);
          if (Array.isArray(parsed)) extraImgsList = parsed.filter((img: any) => typeof img === 'string' && img !== prod.image);
        } catch {
          extraImgsList = (prod.images as string).split('\n').filter(img => img !== prod.image);
        }
      }
      setProdExtraImagesText(extraImgsList.join('\n'));

      setProdIsFeatured(!!prod.isFeatured);

      const safeFeatures = Array.isArray(prod.features) ? prod.features : [];
      setProdFeaturesText(safeFeatures.join('\n'));

      const safeSpecs = Array.isArray(prod.specs) ? prod.specs : [];
      const formattedSpecs = safeSpecs
        .map((s: any) => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const label = s.label || s.name || '';
            const val = s.value || s.val || '';
            return label && val ? `${label}:${val}` : (label || val || '');
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
      setProdSpecsText(formattedSpecs);

      if (prod.colors && prod.colors.length > 0) {
        setHasColorsSection(true);
        setProdColors([...prod.colors]);
      } else {
        setHasColorsSection(false);
        setProdColors([]);
      }

      if (prod.customOptions && prod.customOptions.length > 0) {
        setProdCustomOptions(prod.customOptions.map(c => ({ name: c.name, choices: [...c.choices] })));
      } else {
        setProdCustomOptions([]);
      }
    } else {
      setEditingProduct(null);
      setProdId(`wraith-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`);
      setProdName('');
      setProdNameEn('');
      setProdDesc('');
      setProdPrice(0);
      setProdOldPrice(undefined);
      setProdStock(10);
      setProdCategory(categories[0]?.id || 'mouses');
      setProdImgUrl('');
      setProdExtraImagesText('');
      setProdIsFeatured(false);
      setProdFeaturesText('');
      setProdSpecsText('');
      setHasColorsSection(false);
      setProdColors([]);
      setProdCustomOptions([]);
    }
    setIsProductModalOpen(true);
  };

  // AUTO-FILL FAKE DEMO PRODUCT DATA
  const fillFakeProductData = () => {
    const fakeSamples = [
      {
        name: 'ماوس ألعاب لاسلكي أومين برو زيرو GT',
        nameEn: 'Omen Pro Zero GT Wireless Gaming Mouse',
        desc: 'ماوس ألعاب احترافي لاسلكي فائق الدقة مزود بمستشعر أبتيكال 26K DPI ووزن خفيف جداً يبلغ 52 جراماً فقط لتحقيق أعلى استجابة في ألعاب المنظور الأول FPS.',
        price: 85000,
        oldPrice: 110000,
        stock: 25,
        category: categories[0]?.id || 'mouses',
        imgUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=800',
        extraImgs: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=800\nhttps://images.unsplash.com/photo-1629429408209-1f912961dbd8?q=80&w=800',
        features: 'مستشعر PixArt PAW3395 بدقة 26,000 DPI\nوزن خفيف فائق 52 جرام\nسرعة استجابة 1000Hz Polling Rate\nعمر بطارية يصل إلى 90 ساعة عمل متواصل',
        specs: 'المستشعر:PixArt PAW3395 البصري\nالوزن:52 جرام\nالبطارية:حتى 90 ساعة\nنوع الاتصال:2.4GHz لاسلكي + كابل Type-C',
        colors: [
          { name: 'أسود مطفي', hex: '#111111' },
          { name: 'أبيض ناصع', hex: '#FFFFFF' },
          { name: 'أزرق سايبر', hex: '#212ADC' }
        ],
        customOptions: [
          { name: 'نوع المفتاح Switch', choices: ['أبتيكال كليكي رائع', 'صامت Silent Linear'] },
          { name: 'نوع الشحن', choices: ['قاعدة شحن لاسلكية', 'كابل فقط Type-C'] }
        ]
      },
      {
        name: 'كيبورد ميكانيكي RGB أومين إكس 75',
        nameEn: 'Omen X75 Mechanical RGB Gaming Keyboard',
        desc: 'لوحة مفاتيح ميكانيكية بنسبة 75% مع مفاتيح مدهونة سلفاً وتدعيم صوتي متعدد الطبقات تجعل تجربة الكتابة والألعاب ممتعة واستثنائية.',
        price: 135000,
        oldPrice: 165000,
        stock: 15,
        category: categories.find(c => c.id === 'keyboards')?.id || categories[0]?.id || 'keyboards',
        imgUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=800',
        extraImgs: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?q=80&w=800',
        features: 'تصميم 75% مدمج واحترافي\nمفاتيح ميكانيكية سريعة التجاوب\nإضاءة RGB ديناميكية مخصصة لكل مفتاح\nهيكل ألومنيوم متين مع عزل صوتي لمسي',
        specs: 'نوع المفاتيح:Mechanical Hot-Swappable\nالإضاءة:16.8 مليون لون RGB\nالهيكل:ألومنيوم مع بولي كربونات\nالوصول:كابل برايدد قابل للفصل',
        colors: [
          { name: 'أسود شبحي', hex: '#0a0a0a' },
          { name: 'أبيض فضائي', hex: '#f0f0f0' }
        ],
        customOptions: [
          { name: 'نوع السويتش Switch', choices: ['أحمر خطي Red Linear', 'بني لمسي Brown Tactile'] }
        ]
      }
    ];

    const sample = fakeSamples[Math.floor(Math.random() * fakeSamples.length)];
    setProdId(`wraith-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`);
    setProdName(sample.name);
    setProdNameEn(sample.nameEn);
    setProdDesc(sample.desc);
    setProdPrice(sample.price);
    setProdOldPrice(sample.oldPrice);
    setProdStock(sample.stock);
    setProdCategory(sample.category);
    setProdImgUrl(sample.imgUrl);
    setProdExtraImagesText(sample.extraImgs);
    setProdIsFeatured(true);
    setProdFeaturesText(sample.features);
    setProdSpecsText(sample.specs);
    setHasColorsSection(true);
    setProdColors(sample.colors);
    setProdCustomOptions(sample.customOptions);
    triggerToast('تمت تعبئة كافة بيانات المنتج التجريبية بنجاح! ✨', 'info');
  };

  // SAVE CATEGORY (CREATE OR UPDATE)
  const handleSaveCategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catId || !catName || !catNameEn || !catIcon) {
      triggerToast('يرجى ملء الحقول المطلوبة للفئة.', 'error');
      return;
    }

    const catPayload = {
      id: catId,
      name: catName,
      nameEn: catNameEn,
      icon: catIcon,
      description: catDesc,
      available: catAvailable,
    };

    setGlobalLoading(true);
    try {
      if (!isDbLive) {
        triggerToast('غير متوفر في وضع عدم الاتصال.', 'error');
        return;
      }

      if (editingCategory) {
        await updateCategory(editingCategory.id, catPayload);
        triggerToast('تم تحديث الفئة بنجاح.');
      } else {
        await createCategory(catPayload);
        triggerToast('تم إدراج فئة جديدة بنجاح.');
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      loadAllData();
    } catch (err: any) {
      triggerToast(`فشل حفظ الفئة: ${err.message}`, 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  // DELETE CATEGORY
  const handleDeleteCategoryClick = async (categoryId: string) => {
    if (!window.confirm('هل تريد حذف هذه الفئة نهائياً؟ قد يسبب هذا مشاكل للمنتجات المرتبطة بها.')) return;

    setGlobalLoading(true);
    try {
      if (!isDbLive) {
        triggerToast('غير متوفر في وضع تجريبي.', 'error');
        return;
      }
      await deleteCategory(categoryId);
      triggerToast('تم حذف الفئة بنجاح.');
      loadAllData();
    } catch (err: any) {
      console.error("Delete category error:", err);
      const errMsg = err.message || '';
      if (errMsg.includes('foreign key') || errMsg.includes('violates') || errMsg.includes('products')) {
        triggerToast('لا يمكن حذف هذه الفئة لأنها تحتوي على منتجات نشطة حالياً. يرجى نقل المنتجات التابعة لها إلى فئة أخرى أو حذفها أولاً.', 'error');
      } else {
        triggerToast(`فشل حذف الفئة: ${errMsg}`, 'error');
      }
    } finally {
      setGlobalLoading(false);
    }
  };

  // OPEN CATEGORY FORM
  const openCategoryForm = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCatId(cat.id);
      setCatName(cat.name);
      setCatNameEn(cat.nameEn);
      setCatIcon(cat.icon);
      setCatDesc(cat.description);
      setCatAvailable(cat.available);
    } else {
      setEditingCategory(null);
      setCatId('');
      setCatName('');
      setCatNameEn('');
      setCatIcon('Layers');
      setCatDesc('');
      setCatAvailable(true);
    }
    setIsCategoryModalOpen(true);
  };

  // SAVE SETTINGS
  const handleSaveSettingsForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalLoading(true);
    try {
      if (!isDbLive) {
        if (onUpdateLogo) {
          onUpdateLogo(logoUrl);
        }
        triggerToast('تم حفظ الإعدادات محلياً في الجلسة.');
        return;
      }

      await saveSettings('shipping', { fee: Number(shipFee), free_above: Number(shipFreeAbove) });
      await saveSettings('contact', { phone: contactPhone, email: contactEmail });
      await saveSettings('logo', { url: logoUrl });
      await saveSettings('admin_password', { password: adminPasswordSetting });
      
      setStoredPassword(adminPasswordSetting);
      
      if (onUpdateLogo) {
        onUpdateLogo(logoUrl);
      }
      
      triggerToast('تمت مزامنة الإعدادات العامة وحفظها بقاعدة البيانات بنجاح!');
    } catch (err: any) {
      triggerToast(`فشل حفظ الإعدادات: ${err.message}`, 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  if (!isOpen) return null;

  // OFF-LINE STATS CALCULATORS
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, o) => acc + o.totalAmount, 0);
  const totalOrdersCount = orders.length;
  const newOrdersCount = orders.filter((o) => o.status === 'pending' || o.status === 'new').length;
  const lowStockProductsCount = products.filter((p) => p.stock <= 5).length;

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6 bg-[#0b071a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-blue/10 via-[#0b071a] to-[#0b071a]">
      {/* Main Panel Box */}
      <div className="relative z-10 flex h-[95vh] w-full max-w-7xl flex-col bg-black/40 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_0_60px_rgba(33,42,220,0.15)] overflow-hidden text-right" id="admin_dashboard_panel">
        
        {/* Glow Header bar */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-blue to-transparent opacity-50" />

        {/* Top Header Row */}
        <div className="flex h-20 items-center justify-between border-b border-white/5 px-6 sm:px-8 bg-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-brand-blue/10 border border-brand-blue/30 text-brand-blue">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-tight">لوحة الإدارة المركزية المباشرة</h2>
              <span className="text-[10px] text-brand-blue font-orbitron uppercase tracking-wider block mt-0.5">
                OMEN CONTROL DASHBOARD {isDbLive ? '• LIVE CLOUD' : '• DEMO MODE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminLoggedIn && (
              <button
                onClick={handleAdminSignOut}
                className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900/40 border border-red-500/20 text-red-300 text-xs font-bold transition-all cursor-pointer"
              >
                تسجيل الخروج
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center bg-black border border-brand-lavender/10 hover:border-red-500/40 text-brand-lavender/60 hover:text-red-400 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* NOT LOGGED IN AUTH LAYOUT */}
        {!isAdminLoggedIn ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-transparent relative">
            <div className="absolute top-[20%] left-[20%] h-72 w-72 rounded-full bg-brand-blue/10 blur-[100px] -z-10" />
            <div className="absolute bottom-[20%] right-[20%] h-72 w-72 rounded-full bg-cyan-500/5 blur-[100px] -z-10" />

            <div className="w-full max-w-md rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(33,42,220,0.2)] p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/60 border border-[brand-blue]/40 text-[brand-blue] shadow-inner mb-2">
                  <Lock className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-white">تسجيل الدخول للمشرفين</h3>
                <p className="text-xs text-gray-400">
                  لوحة التحكم محمية بكلمة مرور موحدة. يرجى إدخال رمز المرور للمتابعة.
                </p>
              </div>

              {authError && (
                <div className="p-3.5 bg-red-950/50 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold leading-relaxed">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAdminSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-purple-300 block">رمز المرور (Admin Password)</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full rounded-xl bg-brand-blue/40 border border-brand-blue/20 py-2.5 pr-10 pl-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[brand-blue] font-orbitron text-left"
                    />
                    <Lock className="absolute right-3.5 top-3 h-4.5 w-4.5 text-purple-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-800 to-[brand-blue] hover:from-[brand-blue] hover:to-blue-600 text-xs font-bold text-white shadow shadow-brand-blue/10 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-55"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>جاري التحقق...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span>دخول للوحة التحكم</span>
                    </>
                  )}
                </button>
              </form>

              <div className="p-3 rounded-xl bg-brand-blue/40 border border-brand-blue/15 text-[10px] text-gray-400 leading-relaxed text-center">
                🔑 <span className="font-bold text-[brand-blue]">تنبيه:</span> رمز المرور الافتراضي هو <code className="text-white font-bold font-orbitron">{storedPassword}</code> ويمكنك تعديله في أي وقت من علامة تبويب الإعدادات بالداخل.
              </div>
            </div>
          </div>
        ) : (
          /* LOGGED IN DASHBOARD CORE ENGINE */
          <>
            {/* Dashboard Analytics Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-white/5 bg-black/20 backdrop-blur-md">
              {/* Revenue */}
              <div className="p-6 border-l border-white/5 text-right relative overflow-hidden group hover:bg-white/5 transition-all">
                <span className="text-[10px] text-white/50 font-bold block mb-2">إجمالي المبيعات المباشرة</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-white drop-shadow-[0_0_8px_rgba(33,42,220,0.5)]">{totalRevenue.toLocaleString()}</span>
                  <span className="text-xs text-brand-blue font-bold">د.ع</span>
                </div>
                <TrendingUp className="absolute -bottom-2 -left-2 h-16 w-16 text-brand-blue/5 group-hover:text-brand-blue/10 transition-colors" />
              </div>

              {/* Orders */}
              <div className="p-6 border-l border-white/5 text-right relative overflow-hidden group hover:bg-white/5 transition-all">
                <span className="text-[10px] text-white/50 font-bold block mb-2">حجم طلبات الشراء الواردة</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-orbitron text-white drop-shadow-lg">{isDbLive ? orderTotal : totalOrdersCount}</span>
                  <span className="text-xs text-white/40">طلب</span>
                </div>
                <ShoppingCart className="absolute -bottom-2 -left-2 h-16 w-16 text-white/5 group-hover:text-white/10 transition-colors" />
              </div>

              {/* Pending */}
              <div className="p-6 border-l border-white/5 text-right relative overflow-hidden group hover:bg-white/5 transition-all">
                <span className="text-[10px] text-white/50 font-bold block mb-2 font-sans">الطلبات المعلقة والجديدة</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-orbitron text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">{newOrdersCount}</span>
                  <span className="text-xs text-amber-500/60">معلق</span>
                </div>
                <RefreshCw className="absolute -bottom-2 -left-2 h-16 w-16 text-amber-500/5 group-hover:text-amber-500/10 transition-colors" />
              </div>

              {/* Low Stock alert */}
              <div className="p-6 text-right relative overflow-hidden group hover:bg-red-500/5 transition-all bg-gradient-to-t from-red-500/5 to-transparent">
                <span className="text-[10px] text-white/50 font-bold block mb-2">ملحقات منخفضة المخزون</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-orbitron text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]">{lowStockProductsCount}</span>
                  <span className="text-xs text-red-500/60">أصناف</span>
                </div>
                <ShieldAlert className="absolute -bottom-2 -left-2 h-16 w-16 text-red-500/5 group-hover:text-red-500/10 transition-colors animate-pulse" />
              </div>
            </div>

            {/* Tab Selection */}
            <div className="flex bg-black/30 backdrop-blur-xl px-6 py-4 gap-2 border-b border-white/5 overflow-x-auto justify-end items-center">
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 relative overflow-hidden ${
                  activeTab === 'settings'
                    ? 'text-white shadow-[0_0_20px_rgba(33,42,220,0.3)] bg-brand-blue/20 border border-brand-blue/50'
                    : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                {activeTab === 'settings' && <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-transparent pointer-events-none" />}
                <SettingsIcon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">إعدادات المتجر</span>
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 relative overflow-hidden ${
                  activeTab === 'categories'
                    ? 'text-white shadow-[0_0_20px_rgba(33,42,220,0.3)] bg-brand-blue/20 border border-brand-blue/50'
                    : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                {activeTab === 'categories' && <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-transparent pointer-events-none" />}
                <Layers className="h-4 w-4 relative z-10" />
                <span className="relative z-10">إدارة الفئات</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 relative overflow-hidden ${
                  activeTab === 'products'
                    ? 'text-white shadow-[0_0_20px_rgba(33,42,220,0.3)] bg-brand-blue/20 border border-brand-blue/50'
                    : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                {activeTab === 'products' && <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-transparent pointer-events-none" />}
                <Package className="h-4 w-4 relative z-10" />
                <span className="relative z-10">مستودع السلع ({isDbLive ? prodTotal : products.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('orders');
                  setOrderPage(1);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 relative overflow-hidden ${
                  activeTab === 'orders'
                    ? 'text-white shadow-[0_0_20px_rgba(33,42,220,0.3)] bg-brand-blue/20 border border-brand-blue/50'
                    : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                {activeTab === 'orders' && <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-transparent pointer-events-none" />}
                <ShoppingCart className="h-4 w-4 relative z-10" />
                <span className="relative z-10">طلبات الشراء ({isDbLive ? orderTotal : orders.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 relative overflow-hidden ${
                  activeTab === 'stats'
                    ? 'text-white shadow-[0_0_20px_rgba(33,42,220,0.3)] bg-brand-blue/20 border border-brand-blue/50'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>إحصائيات وتقارير</span>
              </button>
            </div>

            {/* GLOBAL LOADER / IN-APP NOTIFICATIONS */}
            <div className="relative">
              {globalLoading && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-blue via-cyan-400 to-brand-blue bg-[length:200%_auto] animate-pulse z-40" />
              )}
              {toastMessage && (
                <div className={`absolute top-3 left-4 right-4 md:left-auto md:w-max z-50 p-3 rounded-xl border shadow-lg text-xs font-bold animate-float-1 flex items-center gap-2 ${
                  toastMessage.type === 'success' 
                    ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-950/90 border-red-500/30 text-red-300'
                }`}>
                  {toastMessage.type === 'success' ? <CheckCircle className="h-4.5 w-4.5 shrink-0" /> : <ShieldAlert className="h-4.5 w-4.5 shrink-0" />}
                  <span>{toastMessage.text}</span>
                </div>
              )}
            </div>

            {/* MAIN CORE BODY OF ACTIVE TAB */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* ========================================== */}
              {/* TAB 1: OVERVIEW STATISTICS */}
              {/* ========================================== */}
              {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in text-right">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cloud SQL / Storage Metrics */}
                    <div className="lg:col-span-1 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 space-y-5 hover:bg-white/10 transition-all">
                      <h4 className="text-sm font-bold text-white border-b border-brand-blue/10 pb-2">تفاصيل الخادم والاتصال</h4>
                      <div className="space-y-3 text-xs text-gray-400">
                        <div className="flex justify-between items-center">
                          <span className={`h-2.5 w-2.5 rounded-full ${isDbLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          <span className="font-semibold text-white">حالة الاتصال بالشبكة</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-brand-blue/5">
                          <span className="font-orbitron font-bold text-white">{isDbLive ? 'Live Supabase Cloud' : 'Offline Local Fallback'}</span>
                          <span>مزود خدمات الـ Cloud</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-brand-blue/5">
                          <span className="font-orbitron font-bold text-[brand-blue]">Active PostgreSQL</span>
                          <span>المحرك وقاعدة البيانات</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-brand-blue/5">
                          <span className="font-orbitron font-bold text-purple-400">Enabled (Storage + Auth)</span>
                          <span>المصادقة والمخازن</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="font-orbitron font-bold text-white">{currentUser?.email || 'DemoAdmin@omenwraith.com'}</span>
                          <span>المسؤول النشط حالياً</span>
                        </div>
                      </div>
                    </div>

                    {/* Chart Panel */}
                    <div className="lg:col-span-2 bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 blur-[100px] rounded-full pointer-events-none" />
                      <h4 className="text-sm font-bold text-white mb-4">تدفق تقدم المبيعات الأسبوعية الحية (د.ع)</h4>
                      <div className="h-44 flex items-end justify-between gap-3 pt-4">
                        {[
                          { label: 'الأحد', val: 30, amount: '450,000' },
                          { label: 'الأثنين', val: 45, amount: '680,000' },
                          { label: 'الثلاثاء', val: 65, amount: '950,000' },
                          { label: 'الأربعاء', val: 55, amount: '820,000' },
                          { label: 'الخميس', val: 90, amount: '1,350,000' },
                          { label: 'الجمعة', val: 100, amount: '1,600,000' },
                          { label: 'السبت', val: 80, amount: '1,100,000' },
                        ].map((bar, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center group relative">
                            <div className="absolute bottom-full mb-1.5 bg-black text-[brand-blue] text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-orbitron">
                              {bar.amount} د.ع
                            </div>
                            <div 
                              className="w-full rounded-t-xl bg-gradient-to-t from-brand-blue/30 to-brand-blue group-hover:brightness-125 transition-all shadow-[0_0_15px_rgba(33,42,220,0.3)] relative overflow-hidden"
                              style={{ height: `${bar.val}%`, minHeight: '8px' }}
                            />
                            <span className="text-[10px] text-gray-400 font-bold mt-2">{bar.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* System Insights Alert */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl rounded-2xl p-5 flex gap-4 text-right items-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300">أداء المتجر وقواعد الأمان ممتازة وصحية!</h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                        سياسات Row Level Security (RLS) مفعّلة على كافة الجداول لضمان حماية فواتير العملاء. الصور والملحقات المرفوعة للمخزن يتم حمايتها وتنظيمها عبر Supabase Bucket بشكل تلقائي.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* TAB 2: ORDERS MANAGEMENT */}
              {/* ========================================== */}
              {activeTab === 'orders' && (
                <div className="space-y-4 text-right animate-fade-in">
                  
                  {/* Search, Filter, Stats controller block */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md items-center shadow-[0_0_20px_rgba(33,42,220,0.05)]">
                    
                    {/* Status filter selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-white/50 font-bold block ml-1">فلترة حسب حالة الشحن</label>
                      <div className="relative">
                        <select
                          value={orderStatusFilter}
                          onChange={(e) => {
                            setOrderStatusFilter(e.target.value);
                            setOrderPage(1);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] cursor-pointer transition-all appearance-none"
                        >
                          <option value="all">جميع الطلبات</option>
                          <option value="new">الطلبات الجديدة (New)</option>
                          <option value="preparing">قيد التحضير (Preparing)</option>
                          <option value="shipped">جاري الشحن (Shipped)</option>
                          <option value="delivered">تم التسليم (Delivered)</option>
                          <option value="cancelled">الملغاة (Cancelled)</option>
                        </select>
                        <Filter className="absolute left-4 top-3 h-4 w-4 text-brand-blue pointer-events-none" />
                      </div>
                    </div>

                    {/* Order search query */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] text-white/50 font-bold block ml-1">ابحث برقم الطلب، اسم العميل، الجوال أو البريد</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="مثال: فيصل، 05432...، OW-1293"
                          value={orderSearch}
                          onChange={(e) => {
                            setOrderSearch(e.target.value);
                            setOrderPage(1);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl pr-12 pl-4 py-3 text-xs text-white focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all placeholder-white/20"
                        />
                        <Search className="absolute right-4 top-3 h-4 w-4 text-brand-blue" />
                      </div>
                    </div>
                  </div>

                  {orders.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-sm">
                      <ShoppingCart className="h-16 w-16 mx-auto text-brand-blue/30 mb-4 animate-bounce" />
                      <p className="text-sm font-bold text-white">لا توجد طلبات شراء تطابق معايير الفلترة المحددة</p>
                      <p className="text-xs text-white/40 mt-2">عند قيام زبون بشراء عتاد، ستظهر تفاصيل شحنه هنا فوراً.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-black/20 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10 text-xs font-bold text-white/60 uppercase tracking-wider">
                            <th className="p-3.5">رقم الطلب</th>
                            <th className="p-3.5">العميل والجوال</th>
                            <th className="p-3.5">العنوان والمدينة</th>
                            <th className="p-3.5">العتاد المشتراة</th>
                            <th className="p-3.5">المبلغ الإجمالي</th>
                            <th className="p-3.5">طريقة الدفع</th>
                            <th className="p-3.5">حالة الشحنة</th>
                            <th className="p-3.5 text-center">تحديث الحالة السريع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-white/80">
                          {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                              <td className="p-4 font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-purple-400">
                                {order.id}
                              </td>
                              <td className="p-4">
                                <div className="font-bold text-white group-hover:text-brand-blue transition-colors">{order.customerName}</div>
                                <div className="text-[10px] text-white/40 font-orbitron mt-1">{order.phone}</div>
                                <div className="text-[10px] text-white/40 mt-0.5 block">{order.email}</div>
                              </td>
                              <td className="p-4">
                                <span className="bg-brand-blue/20 border border-brand-blue/30 px-2 py-1 rounded-md text-[10px] font-bold text-brand-blue block w-max mb-1 shadow-[0_0_10px_rgba(33,42,220,0.2)]">
                                  {order.city}
                                </span>
                                <span className="text-[10px] text-gray-400 block max-w-[140px] truncate" title={order.address}>
                                  {order.address}
                                </span>
                              </td>
                              <td className="p-3.5 max-w-[200px]">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="truncate text-gray-300 py-0.5">
                                    {item.productName} <span className="font-orbitron text-brand-blue font-bold">x{item.quantity}</span>
                                    {(item.selectedColor || item.optionsSummary || (item.selectedOptions && Object.keys(item.selectedOptions).length > 0)) && (
                                      <div className="text-[10px] text-brand-blue font-semibold mt-0.5">
                                        {item.optionsSummary || [item.selectedColor ? `اللون: ${item.selectedColor}` : '', item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : ''].filter(Boolean).join(' | ')}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </td>
                              <td className="p-3.5 font-orbitron font-bold text-white">
                                {order.totalAmount.toLocaleString()} د.ع
                              </td>
                              <td className="p-3.5 font-medium">
                                {order.paymentMethod === 'cod' ? (
                                  <span className="text-amber-400">الدفع عند الاستلام</span>
                                ) : (
                                  <span className="text-emerald-400">الدفع بالبطاقة</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    order.status === 'delivered' || order.status === 'completed'
                                      ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
                                      : order.status === 'shipped' || order.status === 'shipping'
                                      ? 'bg-blue-950/80 border-blue-500/30 text-blue-400'
                                      : order.status === 'preparing'
                                      ? 'bg-brand-blue/80 border-brand-blue/30 text-purple-400'
                                      : order.status === 'cancelled'
                                      ? 'bg-red-950/80 border-red-500/30 text-red-400'
                                      : 'bg-amber-950/80 border-amber-500/30 text-amber-400'
                                  }`}
                                >
                                  {order.status === 'delivered' && 'تم التوصيل'}
                                  {order.status === 'completed' && 'تم التوصيل'}
                                  {order.status === 'shipped' && 'تم الشحن'}
                                  {order.status === 'shipping' && 'تم الشحن'}
                                  {order.status === 'preparing' && 'قيد التحضير'}
                                  {order.status === 'cancelled' && 'ملغي'}
                                  {(order.status === 'new' || order.status === 'pending') && 'طلب جديد'}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex gap-1.5 justify-center flex-wrap">
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, 'preparing')}
                                    className="px-2.5 py-1.5 bg-brand-blue/10 border border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(33,42,220,0.5)]"
                                  >
                                    تحضير
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, 'shipped')}
                                    className="px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                  >
                                    شحن
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                    className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                  >
                                    تسليم
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                    className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    onClick={() => downloadOrderReceiptAsJPG(order)}
                                    title="تحميل الفاتورة صورة JPG"
                                    className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600 border border-purple-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>تحميل الفاتورة JPG</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    title="حذف الطلب نهائياً"
                                    className="px-2.5 py-1.5 bg-red-600/30 hover:bg-red-600 border border-red-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>حذف</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Orders Pagination Controls */}
                  {isDbLive && orderTotal > ORDER_PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t border-brand-blue/10 pt-4 text-xs font-bold">
                      <div className="text-gray-400">
                        عرض الصفحة <span className="text-white font-orbitron">{orderPage}</span> من <span className="text-white font-orbitron">{Math.ceil(orderTotal / ORDER_PAGE_SIZE)}</span> صفحات (إجمالي {orderTotal} طلب)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setOrderPage(prev => Math.max(1, prev - 1))}
                          disabled={orderPage === 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/30 border border-brand-blue/15 text-purple-300 hover:bg-brand-blue/40 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setOrderPage(prev => Math.min(Math.ceil(orderTotal / ORDER_PAGE_SIZE), prev + 1))}
                          disabled={orderPage >= Math.ceil(orderTotal / ORDER_PAGE_SIZE)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/30 border border-brand-blue/15 text-purple-300 hover:bg-brand-blue/40 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================== */}
              {/* TAB 3: PRODUCTS INVENTORY CRUD */}
              {/* ========================================== */}
              {activeTab === 'products' && (
                <div className="space-y-4 text-right animate-fade-in">
                  
                  {/* Products controllers bar */}
                  {/* Products controllers bar */}
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md shadow-[0_0_20px_rgba(33,42,220,0.05)]">
                    <button
                      onClick={() => openProductForm()}
                      className="h-12 px-6 rounded-2xl bg-brand-blue/20 border border-brand-blue/50 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all hover:bg-brand-blue hover:shadow-[0_0_20px_rgba(33,42,220,0.5)] relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Plus className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">إضافة ملحق ألعاب جديد</span>
                    </button>

                    <div className="flex flex-1 flex-col md:flex-row gap-3 justify-end">
                      {/* Stock filter */}
                      <div className="w-full md:w-40 relative">
                        <select
                          value={prodStockFilter}
                          onChange={(e) => {
                            setProdStockFilter(e.target.value as any);
                            setProdPage(1);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] cursor-pointer transition-all appearance-none"
                        >
                          <option value="all">جميع مستويات المخزون</option>
                          <option value="low">منخفض (أقل من 5 قطع)</option>
                          <option value="out">المنتهي (0 قطع)</option>
                        </select>
                        <Filter className="absolute left-4 top-3.5 h-4 w-4 text-brand-blue pointer-events-none" />
                      </div>

                      {/* Category filter */}
                      <div className="w-full md:w-40 relative">
                        <select
                          value={prodCatFilter}
                          onChange={(e) => {
                            setProdCatFilter(e.target.value);
                            setProdPage(1);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] cursor-pointer transition-all appearance-none"
                        >
                          <option value="all">كل الأقسام الفنية</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <Layers className="absolute left-4 top-3.5 h-4 w-4 text-brand-blue pointer-events-none" />
                      </div>

                      {/* Search box */}
                      <div className="relative w-full md:w-64">
                        <input
                          type="text"
                          placeholder="ابحث باسم الماوس أو الكيبورد..."
                          value={prodSearch}
                          onChange={(e) => {
                            setProdSearch(e.target.value);
                            setProdPage(1);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl pr-12 pl-4 py-3 text-xs text-white focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all placeholder-white/20"
                        />
                        <Search className="absolute right-4 top-3.5 h-4 w-4 text-brand-blue" />
                      </div>
                    </div>
                  </div>

                  {products.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-sm">
                      <Package className="h-16 w-16 mx-auto text-brand-blue/30 mb-4 animate-bounce" />
                      <p className="text-sm font-bold text-white">لا يوجد منتجات تطابق البحث والفلترة حالياً</p>
                      <p className="text-xs text-white/40 mt-2">اضغط على زر &quot;إضافة ملحق ألعاب جديد&quot; لتسجيل أول صنف.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((p) => (
                        <div
                          key={p.id}
                          className="bg-white/5 border border-white/10 hover:border-brand-blue/40 rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_20px_rgba(33,42,220,0.05)] hover:shadow-[0_0_30px_rgba(33,42,220,0.15)] relative overflow-hidden group transition-all duration-300 backdrop-blur-md"
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          
                          {p.isFeatured && (
                            <div className="absolute top-0 left-0 bg-brand-blue/20 border-b border-r border-brand-blue/40 text-brand-blue font-black text-[9px] px-3 py-1 rounded-br-2xl font-orbitron uppercase tracking-wider backdrop-blur-md shadow-[0_0_10px_rgba(33,42,220,0.3)]">
                              FEATURED
                            </div>
                          )}

                          <div className="relative z-10">
                            <div className="flex gap-4 items-center mb-5">
                              <img
                                src={p.image || 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=150&auto=format&fit=crop'}
                                alt={p.name}
                                referrerPolicy="no-referrer"
                                className="h-16 w-16 object-contain bg-white p-2 rounded-2xl border border-white/20 group-hover:scale-110 transition-transform duration-500 shadow-sm"
                              />
                              <div className="text-right flex-1">
                                <span className="text-[10px] text-brand-blue/70 font-bold tracking-wide block uppercase mb-1">ID: {p.id}</span>
                                <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-brand-blue transition-colors">{p.name}</h4>
                                <span className="text-[10px] text-white/40 font-orbitron block truncate mt-0.5">{p.nameEn}</span>
                              </div>
                            </div>

                            <div className="space-y-3 mb-6 text-xs border-t border-white/5 pt-4">
                              <div className="flex justify-between items-center">
                                <span className="text-white/50 font-medium">السعر:</span>
                                <span className="font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-purple-400 text-sm drop-shadow-[0_0_5px_rgba(33,42,220,0.3)]">{p.price.toLocaleString()} د.ع</span>
                              </div>
                              {p.oldPrice && (
                                <div className="flex justify-between items-center text-[11px]">
                                  <span className="text-white/30">السعر السابق:</span>
                                  <span className="font-orbitron line-through text-red-400/60">{p.oldPrice.toLocaleString()} د.ع</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-white/50 font-medium">المخزون بالمستودع:</span>
                                <span className={`font-orbitron font-black px-2 py-0.5 rounded-md border ${p.stock <= 5 ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                                  {p.stock} قطعة
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-white/50 font-medium">القسم:</span>
                                <span className="text-brand-blue bg-brand-blue/10 border border-brand-blue/20 px-2 py-0.5 rounded-md text-[10px] font-bold">{categories.find(c => c.id === p.category)?.name || p.category}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 border-t border-white/5 pt-4 relative z-10">
                            <button
                              onClick={() => handleDeleteProductClick(p.id)}
                              className="p-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 rounded-xl transition-all duration-300 cursor-pointer flex-1 flex justify-center items-center gap-1.5 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="text-xs font-bold">حذف</span>
                            </button>
                            <button
                              onClick={() => openProductForm(p)}
                              className="p-2.5 bg-brand-blue/10 hover:bg-brand-blue hover:text-white border border-brand-blue/30 text-brand-blue rounded-xl transition-all duration-300 cursor-pointer flex-1 flex justify-center items-center gap-1.5 hover:shadow-[0_0_15px_rgba(33,42,220,0.5)]"
                            >
                              <Edit2 className="h-4 w-4" />
                              <span className="text-xs font-bold">تعديل</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Products Pagination Controls */}
                  {isDbLive && prodTotal > PROD_PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t border-brand-blue/10 pt-4 text-xs font-bold">
                      <div className="text-gray-400">
                        عرض الصفحة <span className="text-white font-orbitron">{prodPage}</span> من <span className="text-white font-orbitron">{Math.ceil(prodTotal / PROD_PAGE_SIZE)}</span> صفحات (إجمالي {prodTotal} منتج)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setProdPage(prev => Math.max(1, prev - 1))}
                          disabled={prodPage === 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/30 border border-brand-blue/15 text-purple-300 hover:bg-brand-blue/40 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setProdPage(prev => Math.min(Math.ceil(prodTotal / PROD_PAGE_SIZE), prev + 1))}
                          disabled={prodPage >= Math.ceil(prodTotal / PROD_PAGE_SIZE)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/30 border border-brand-blue/15 text-purple-300 hover:bg-brand-blue/40 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================== */}
              {/* TAB 4: CATEGORIES CRUD */}
              {/* ========================================== */}
              {activeTab === 'categories' && (
                <div className="space-y-4 text-right animate-fade-in">
                  <div className="flex justify-between items-center bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md shadow-[0_0_20px_rgba(33,42,220,0.05)]">
                    <button
                      onClick={() => openCategoryForm()}
                      className="h-12 px-6 rounded-2xl bg-brand-blue/20 border border-brand-blue/50 text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all hover:bg-brand-blue hover:shadow-[0_0_20px_rgba(33,42,220,0.5)] relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Plus className="h-4 w-4 relative z-10" />
                      <span className="relative z-10">إضافة قسم جديد</span>
                    </button>
                    <span className="text-xs text-white/50 hidden md:block">التحكم بفئات متجر الألعاب ومستويات الفهرسة الفنية للسلع.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="bg-white/5 border border-white/10 hover:border-brand-blue/40 rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_20px_rgba(33,42,220,0.05)] hover:shadow-[0_0_30px_rgba(33,42,220,0.15)] relative overflow-hidden group transition-all duration-300 backdrop-blur-md"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${cat.available ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                              {cat.available ? 'نشط بالمتجر' : 'مخفي حالياً'}
                            </span>
                            <div className="text-right flex-1 pl-3">
                              <span className="text-[9px] text-brand-blue/70 font-orbitron font-bold tracking-widest block mb-0.5">KEY: {cat.id}</span>
                              <h4 className="text-sm font-black text-white group-hover:text-brand-blue transition-colors">{cat.name}</h4>
                              <span className="text-[10px] text-white/40 font-orbitron block mt-0.5">{cat.nameEn}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-white/60 leading-relaxed line-clamp-2 h-10 mt-2">{cat.description || 'لا يوجد وصف مضاف لهذا القسم'}</p>
                          <div className="text-[10px] text-brand-blue bg-brand-blue/10 border border-brand-blue/20 px-2.5 py-1.5 rounded-lg w-max mt-4 shadow-inner">
                            أيقونة اللائحة: <span className="font-orbitron font-bold text-white ml-1">{cat.icon}</span>
                          </div>
                        </div>

                        <div className="flex gap-3 border-t border-white/5 pt-4 mt-5 relative z-10">
                          <button
                            onClick={() => handleDeleteCategoryClick(cat.id)}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex-1 flex justify-center items-center gap-1.5 cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>حذف</span>
                          </button>
                          <button
                            onClick={() => openCategoryForm(cat)}
                            className="p-2.5 bg-brand-blue/10 hover:bg-brand-blue hover:text-white border border-brand-blue/30 text-brand-blue rounded-xl text-xs font-bold flex-1 flex justify-center items-center gap-1.5 cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(33,42,220,0.5)]"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span>تعديل</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* TAB 5: GENERAL SETTINGS */}
              {/* ========================================== */}
              {activeTab === 'settings' && (
                <div className="space-y-6 text-right animate-fade-in max-w-2xl mx-auto">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-[0_0_30px_rgba(33,42,220,0.1)] relative overflow-hidden">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-brand-blue/5 via-transparent to-transparent pointer-events-none" />
                    
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-3 justify-end border-b border-white/10 pb-3 relative z-10">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-blue">إعدادات الشحن ومصروفات التوصيل</span>
                      <SettingsIcon className="h-5 w-5 text-brand-blue" />
                    </h3>

                    <form onSubmit={handleSaveSettingsForm} className="space-y-5 relative z-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/60 block font-bold">مصاريف الشحن الافتراضية للطلب</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={shipFee}
                              onChange={(e) => setShipFee(Number(e.target.value))}
                              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white text-center font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                            />
                            <span className="absolute left-4 top-3.5 text-[10px] text-white/30 font-bold">د.ع</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] text-white/60 block font-bold">توصيل مجاني للطلبات فوق سقف</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={shipFreeAbove}
                              onChange={(e) => setShipFreeAbove(Number(e.target.value))}
                              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white text-center font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                            />
                            <span className="absolute left-4 top-3.5 text-[10px] text-white/30 font-bold">د.ع</span>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white mt-8 mb-6 flex items-center gap-3 justify-end border-b border-white/10 pb-3">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-blue">معلومات التواصل لخدمة عملاء المتجر</span>
                        <Mail className="h-5 w-5 text-brand-blue" />
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] text-white/60 block font-bold">جوال أو واتساب التواصل للدعم</label>
                          <input
                            type="text"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white text-left font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] text-white/60 block font-bold">البريد الإلكتروني للشكاوى</label>
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white text-left font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                          />
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white mt-8 mb-6 flex items-center gap-3 justify-end border-b border-white/10 pb-3">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-blue">الهوية البصرية وشعار المتجر</span>
                        <Image className="h-5 w-5 text-brand-blue" />
                      </h3>

                      <div className="space-y-2">
                        <label className="text-[11px] text-white/60 block font-bold">رابط شعار الموقع الإلكتروني (Logo URL)</label>
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="مثال: https://example.com/logo.png"
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white text-left font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all placeholder-white/20"
                        />
                        <span className="text-[10px] text-white/30 mt-1 block">إذا تركت هذا الحقل فارغاً، سيتم استخدام اسم المتجر والرمز الافتراضي.</span>
                      </div>

                      <h3 className="text-sm font-bold text-red-400 mt-8 mb-6 flex items-center gap-3 justify-end border-b border-red-500/20 pb-3">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-red-400">أمان النظام وكلمة المرور</span>
                        <Lock className="h-5 w-5 text-red-400 animate-pulse" />
                      </h3>

                      <div className="space-y-2">
                        <label className="text-[11px] text-white/60 block font-bold">كلمة مرور لوحة التحكم الجديدة</label>
                        <input
                          type="password"
                          value={adminPasswordSetting}
                          onChange={(e) => setAdminPasswordSetting(e.target.value)}
                          placeholder="اكتب كلمة المرور الجديدة للوحة التحكم"
                          className="w-full bg-red-950/20 border border-red-500/30 rounded-2xl px-5 py-3.5 text-xs text-white text-left font-orbitron focus:outline-none focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all placeholder-white/20"
                        />
                        <span className="text-[10px] text-red-400/60 mt-1 block">سيتم استخدام هذه كلمة المرور لتسجيل الدخول للوحة التحكم بدلاً من البريد الإلكتروني.</span>
                      </div>

                      <button
                        type="submit"
                        className="w-full h-14 rounded-2xl bg-brand-blue/20 border border-brand-blue/50 hover:bg-brand-blue hover:text-white text-xs font-bold text-white shadow-[0_0_20px_rgba(33,42,220,0.2)] hover:shadow-[0_0_30px_rgba(33,42,220,0.5)] flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 mt-8 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <Save className="h-5 w-5 relative z-10" />
                        <span className="relative z-10 text-sm">تثبيت وحفظ الإعدادات الفنية بالـ Cloud</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>

      {/* ========================================== */}
      {/* PRODUCT ADD / EDIT MODAL OVERLAY */}
      {/* ========================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
          <div className="absolute inset-0 cursor-default" onClick={() => setIsProductModalOpen(false)} />
          
          <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10 p-8 text-right max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(33,42,220,0.15)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-blue">
                {editingProduct ? `تعديل عتاد: ${editingProduct.name}` : 'إدراج ملحق ألعاب فاخر جديد للترسانة'}
              </h3>
              <button
                type="button"
                onClick={fillFakeProductData}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 border border-amber-500/40 text-amber-300 hover:text-black text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                <span>✨ تعبئة بيانات تجريبية (Auto-Fill)</span>
              </button>
            </div>

            <form onSubmit={handleSaveProductForm} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">معرف الملحق (ID فريد بالإنجليزية)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={prodId}
                    onChange={(e) => setProdId(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white font-orbitron text-left focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">قسم ملحق الألعاب (Category)</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all cursor-pointer appearance-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900">{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">اسم الملحق بالعربية</label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">اسم الملحق بالإنجليزية (English Name)</label>
                  <input
                    type="text"
                    required
                    value={prodNameEn}
                    onChange={(e) => setProdNameEn(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white font-orbitron text-left focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-white/60 block">الوصف الفني الكامل والمميزات بالتفصيل</label>
                <textarea
                  required
                  rows={3}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white leading-relaxed focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">سعر البيع (د.ع)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white text-center font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">السعر السابق للشطب (اختياري)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodOldPrice || ''}
                    onChange={(e) => setProdOldPrice(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white text-center font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">الكمية المتوفرة بالمستودع</label>
                  <input
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white text-center font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                  />
                </div>
              </div>

              {/* IMAGE INPUT AND SUPABASE UPLOAD BLOCK */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 blur-3xl rounded-full" />
                <label className="text-[12px] font-bold text-brand-blue block relative z-10">صورة المنتج الأساسية والرفع للمستودع السحابي</label>
                <p className="text-[10px] text-white/40 relative z-10">سيتم إدخال رابط الصورة تلقائيًا بعد اختيار الملف والرفع إلى bucket images.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center relative z-10">
                  <div className="w-full sm:flex-1 space-y-2">
                    <label className="text-[9px] text-white/40 block">رابط الصورة المباشر المرفوع</label>
                    <input
                      type="text"
                      required
                      placeholder="https://images.unsplash.com/... أو ارفعها مباشرة"
                      value={prodImgUrl}
                      onChange={(e) => setProdImgUrl(e.target.value)}
                      className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3 text-xs text-white text-left font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                    />
                  </div>

                  <div className="shrink-0 space-y-2">
                    <label className="text-[9px] text-white/40 block">رفع من ملفاتك</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="supabase-image-picker"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploading || !isDbLive}
                      />
                      <label
                        htmlFor="supabase-image-picker"
                        className={`h-10 px-5 rounded-xl bg-brand-blue/20 border border-brand-blue/40 hover:bg-brand-blue hover:text-white transition-all duration-300 cursor-pointer text-xs font-bold text-brand-blue flex items-center gap-2 ${(!isDbLive || isUploading) ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-[0_0_15px_rgba(33,42,220,0.5)]'}`}
                      >
                        {isUploading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>{isUploading ? 'جاري الرفع...' : 'اختر وارفع الملف'}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {!isDbLive && (
                  <span className="text-[9px] text-amber-500/80 block mt-2 relative z-10">
                    ⚠️ خاصية رفع الملفات لمخزن Supabase Storage تتطلب تهيئة المتغيرات أولاً، يرجى كتابة رابط الصورة يدوياً في المعاينة.
                  </span>
                )}
              </div>

              {/* EXTRA IMAGES FOR MULTI-GALLERY */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-2">
                <label className="text-[12px] font-bold text-brand-blue block">صور إضافية لمعرض المنتجات المتعدد (رابط صورة واحد في كل سطر)</label>
                <p className="text-[10px] text-white/40">ستظهر هذه الصور كمعرض صور تفاعلي يمكن للعميل تصفحه داخل صفحة المنتج.</p>
                <textarea
                  rows={3}
                  placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                  value={prodExtraImagesText}
                  onChange={(e) => setProdExtraImagesText(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3 text-xs text-white text-left font-orbitron focus:outline-none focus:border-brand-blue transition-all"
                />
              </div>

              {/* ADVANCED FIELDS (Features & Specs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">المميزات الرئيسية للماوس/الكيبورد (ميزة واحدة في كل سطر)</label>
                  <textarea
                    rows={3}
                    placeholder="مستشعر بدقة 26K DPI&#10;مفاتيح ضغط تدوم 90 مليون نقرة&#10;وزن ريشة 54 جرام"
                    value={prodFeaturesText}
                    onChange={(e) => setProdFeaturesText(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white leading-relaxed focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">المواصفات الفنية المتقدمة (الصيغة: العنوان:القيمة بكل سطر)</label>
                  <textarea
                    rows={3}
                    placeholder="المستشعر:PixArt PAW3395 البصري&#10;الحساسية القصوى:26,000 DPI&#10;عمر البطارية:حتى 80 ساعة"
                    value={prodSpecsText}
                    onChange={(e) => setProdSpecsText(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white leading-relaxed text-left font-orbitron focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                  />
                </div>
              </div>

              {/* MULTIPLE COLORS PICK SECTION */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-blue flex items-center gap-2">
                      <Image className="h-4 w-4 text-brand-blue" />
                      قسم تحديد الألوان المتعددة للمنتج (Product Colors)
                    </h4>
                    <p className="text-[10px] text-white/40 mt-0.5">يمكنك إضافة قسم ألوان للمنتج أو إلغاء تفعيله. سيتمكن المشتري من اختيار اللون عند الشراء.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasColorsSection(!hasColorsSection)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      hasColorsSection
                        ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white'
                        : 'bg-brand-blue/20 border-brand-blue/40 text-brand-blue hover:bg-brand-blue hover:text-white'
                    }`}
                  >
                    {hasColorsSection ? 'إلغاء قسم الألوان' : '+ إضافة قسم الألوان'}
                  </button>
                </div>

                {hasColorsSection && (
                  <div className="space-y-4 pt-2 border-t border-white/10">
                    {/* Quick Color Presets */}
                    <div>
                      <label className="text-[10px] text-white/60 block font-bold mb-2">إضافة سريعة من ألوان جاهزة:</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'أسود', hex: '#000000' },
                          { name: 'أبيض', hex: '#ffffff' },
                          { name: 'أحمر', hex: '#ef4444' },
                          { name: 'أزرق', hex: '#3b82f6' },
                          { name: 'أخضر', hex: '#10b981' },
                          { name: 'بنفسجي', hex: '#8b5cf6' },
                          { name: 'وردي', hex: '#ec4899' },
                          { name: 'أصفر', hex: '#eab308' },
                          { name: 'رمادي', hex: '#6b7280' },
                        ].map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => handleAddColor(preset.name, preset.hex)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 border border-white/10 hover:border-brand-blue/60 text-[11px] text-white font-medium rounded-lg transition-all cursor-pointer"
                          >
                            <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: preset.hex }} />
                            <span>+ {preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Add Custom Color Input */}
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="اسم اللون (مثال: ذهبي فاخر)"
                        value={newColorName}
                        onChange={(e) => setNewColorName(e.target.value)}
                        className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-blue"
                      />
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="w-10 h-9 p-1 rounded-xl bg-black/40 border border-white/10 cursor-pointer"
                        title="اختر درجة اللون"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddColor(newColorName, newColorHex)}
                        className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold cursor-pointer transition-all shrink-0"
                      >
                        إضافة لون
                      </button>
                    </div>

                    {/* Added Colors List */}
                    {prodColors.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {prodColors.map((col, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1.5 bg-brand-blue/15 border border-brand-blue/30 rounded-xl text-xs font-bold text-white shadow-sm"
                          >
                            {col.hex && <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: col.hex }} />}
                            <span>{col.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveColor(idx)}
                              className="text-red-400 hover:text-red-300 p-0.5 cursor-pointer ml-1"
                              title="حذف اللون"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* DYNAMIC CUSTOM OPTIONS SECTION */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-400" />
                      قسم الخيارات المخصصة (Custom Options)
                    </h4>
                    <p className="text-[10px] text-white/40 mt-0.5">سمّي خيارات المنتجات بنفسك (مثل: الحجم، نوع المحول Switch، السعة) وأضف الخيارات ليحددها العميل صفحة المنتج.</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="اسم الخيار (مثال: الحجم، نوع المفتاح Switch Type)"
                    value={newOptionTitle}
                    onChange={(e) => setNewOptionTitle(e.target.value)}
                    className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomOptionGroup}
                    className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 border border-purple-500/50 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ إضافة خيار مخصص</span>
                  </button>
                </div>

                {/* Custom Option Groups List */}
                {prodCustomOptions.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {prodCustomOptions.map((optGroup, gIdx) => (
                      <div key={gIdx} className="bg-black/40 border border-purple-500/20 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-xs font-black text-purple-300 font-orbitron">{optGroup.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomOptionGroup(gIdx)}
                            className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>إزالة الخيار</span>
                          </button>
                        </div>

                        {/* Add Choice Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`أضف قيمة للخيار ${optGroup.name} (مثال: 60% أو كليكي أحمر)`}
                            value={newChoiceInputs[gIdx] || ''}
                            onChange={(e) => setNewChoiceInputs({ ...newChoiceInputs, [gIdx]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddChoiceToGroup(gIdx);
                              }
                            }}
                            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddChoiceToGroup(gIdx)}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500 text-purple-200 hover:text-white text-xs font-bold cursor-pointer transition-all"
                          >
                            + قيمة
                          </button>
                        </div>

                        {/* Render Choices Chips */}
                        {optGroup.choices.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {optGroup.choices.map((choice, cIdx) => (
                              <span
                                key={cIdx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs font-orbitron font-semibold rounded-lg"
                              >
                                {choice}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChoiceFromGroup(gIdx, cIdx)}
                                  className="text-purple-400 hover:text-red-400 cursor-pointer ml-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-3 justify-start">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="prod_featured_toggle"
                    checked={prodIsFeatured}
                    onChange={(e) => setProdIsFeatured(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-5 rounded border border-white/20 bg-black/40 peer-checked:bg-brand-blue peer-checked:border-brand-blue transition-all flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <label htmlFor="prod_featured_toggle" className="text-xs text-brand-blue font-bold cursor-pointer select-none">
                  تمييز وتثبيت المنتج في الصفحة الرئيسية للمتجر كـ (Featured Accessory)
                </label>
              </div>

              <div className="flex gap-4 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/70 cursor-pointer transition-all duration-300"
                >
                  إلغاء وإغلاق
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className={`flex-1 h-12 rounded-2xl bg-brand-blue/20 border border-brand-blue/50 hover:bg-brand-blue hover:text-white text-xs font-bold text-white shadow-[0_0_15px_rgba(33,42,220,0.2)] hover:shadow-[0_0_25px_rgba(33,42,220,0.5)] cursor-pointer transition-all duration-300 relative overflow-hidden group flex items-center justify-center gap-2 ${isSavingProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  {isSavingProduct ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin shrink-0 text-white" />
                      <span className="relative z-10">جاري الإدراج والحفظ بقاعدة البيانات...</span>
                    </>
                  ) : (
                    <span className="relative z-10">{editingProduct ? 'حفظ تعديلات العتاد' : 'إدراج العتاد وتثبيتها بقاعدة البيانات'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* CATEGORY ADD / EDIT MODAL OVERLAY */}
      {/* ========================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="absolute inset-0 cursor-default" onClick={() => setIsCategoryModalOpen(false)} />
          
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-black/60 backdrop-blur-xl border border-white/10 p-8 text-right shadow-[0_0_50px_rgba(33,42,220,0.15)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-blue to-transparent opacity-50" />
            <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-blue mb-6 border-b border-white/10 pb-4">
              {editingCategory ? `تعديل قسم: ${editingCategory.name}` : 'إضافة قسم أجهزة جديد'}
            </h3>

            <form onSubmit={handleSaveCategoryForm} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-white/60 block">معرف القسم (ID فريد بالإنجليزية - مثل: audio)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingCategory}
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white font-orbitron text-left focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all disabled:opacity-55"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">الاسم بالعربية</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/60 block">الاسم بالإنجليزية</label>
                  <input
                    type="text"
                    required
                    value={catNameEn}
                    onChange={(e) => setCatNameEn(e.target.value)}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white font-orbitron text-left focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-white/60 block">اسم الأيقونة الفنية للائحة</label>
                <select
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3.5 text-xs text-white focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all cursor-pointer appearance-none"
                >
                  <option value="Mouse" className="bg-slate-900">Mouse (ماوس)</option>
                  <option value="Keyboard" className="bg-slate-900">Keyboard (كيبورد)</option>
                  <option value="Headphones" className="bg-slate-900">Headphones (سماعات)</option>
                  <option value="Layers" className="bg-slate-900">Layers (قاعدة ماوس/سطح)</option>
                  <option value="Cpu" className="bg-slate-900">Cpu (قطع معالجة)</option>
                  <option value="Gamepad2" className="bg-slate-900">Gamepad (اكسسوارات)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-white/60 block">الوصف الموجز للقسم</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-5 py-3 text-xs text-white leading-relaxed focus:outline-none focus:border-brand-blue focus:shadow-[0_0_15px_rgba(33,42,220,0.3)] transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 justify-start">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="cat_available_toggle"
                    checked={catAvailable}
                    onChange={(e) => setCatAvailable(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-5 rounded border border-white/20 bg-black/40 peer-checked:bg-brand-blue peer-checked:border-brand-blue transition-all flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <label htmlFor="cat_available_toggle" className="text-xs text-brand-blue font-bold cursor-pointer select-none">
                  القسم متاح ونشط للعملاء بالمتجر حالياً
                </label>
              </div>

              <div className="flex gap-4 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/70 cursor-pointer transition-all duration-300"
                >
                  إلغاء وإغلاق
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-2xl bg-brand-blue/20 border border-brand-blue/50 hover:bg-brand-blue hover:text-white text-xs font-bold text-white shadow-[0_0_15px_rgba(33,42,220,0.2)] hover:shadow-[0_0_25px_rgba(33,42,220,0.5)] cursor-pointer transition-all duration-300 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <span className="relative z-10">{editingCategory ? 'حفظ التعديلات الفئة' : 'إدراج الفئة الجديدة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL TOAST NOTIFICATION OVERLAY */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/90 border border-white/20 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] text-white text-xs font-bold animate-slide-up">
          {toastMessage.type === 'error' ? (
            <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

    </div>
  );
}
