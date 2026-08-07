import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingBag, Truck, Coins, CheckCircle2, Loader2, ArrowRight, MapPin, Phone, User, MessageSquare, Download } from 'lucide-react';
import { CartItem, Product, Order } from '../types';
import { CITIES } from '../data';
import { downloadOrderReceiptAsJPG } from '../utils/receiptGenerator';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { sendTelegramNotification } from '../services/telegramService';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckoutComplete: (order: Order) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckoutComplete,
}: CartDrawerProps) {
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'success'>('cart');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    governorate: 'بغداد',
    city: '',
    address: '',
    nearbyLandmark: '',
    notes: '',
    paymentMethod: 'cod' as 'cod',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const total = subtotal + 5000;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const GOVERNORATES = [
    'بغداد', 'البصرة', 'نينوى (الموصل)', 'أربيل', 'السليمانية', 'دهوك', 'كركوك', 'النجف الأشرف',
    'كربلاء المقدسة', 'بابل (الحلة)', 'ميسان (العمارة)', 'ذي قار (الناصرية)', 'القادسية (الديوانية)',
    'المثنى (السماوة)', 'واسط (الكوت)', 'صلاح الدين (تكريت)', 'الأنبار (الرمادي)', 'ديالى (بعقوبة)'
  ];

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'الاسم الكامل مطلوب';
    else if (formData.name.trim().split(/\s+/).length < 2) errors.name = 'يرجى إدخال الاسم ثنائي على الأقل للتحقق';

    if (!formData.phone.trim()) errors.phone = 'رقم الهاتف مطلوب';
    else if (!/^07\d{9}$/.test(formData.phone.replace(/\s+/g, ''))) errors.phone = 'يجب إدخال رقم هاتف عراقي صالح يتكون من 11 رقمًا (مثال: 07701234567)';

    if (!formData.governorate) errors.governorate = 'المحافظة مطلوبة للشحن';
    if (!formData.city) errors.city = 'المدينة مطلوبة للشحن';
    
    if (!formData.address.trim()) errors.address = 'العنوان التفصيلي مطلوب للشحن';
    else if (formData.address.trim().length < 5) errors.address = 'العنوان التفصيلي يجب أن يكون 5 حروف على الأقل';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      let createdOrderObj: Order | null = null;

      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone.replace(/\s+/g, ''),
            governorate: formData.governorate,
            city: formData.city,
            address: formData.address,
            nearbyLandmark: formData.nearbyLandmark || undefined,
            notes: formData.notes || undefined,
            paymentMethod: 'cod',
            items: cartItems.map((item) => {
              const optionsSummary = [
                item.selectedColor?.name ? `اللون: ${item.selectedColor.name}` : '',
                item.selectedOptions
                  ? Object.entries(item.selectedOptions)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' | ')
                  : '',
              ]
                .filter(Boolean)
                .join(' - ');

              return {
                productId: item.product.id,
                productName: optionsSummary ? `${item.product.name} (${optionsSummary})` : item.product.name,
                price: item.product.price,
                quantity: item.quantity,
                selectedColor: item.selectedColor?.name,
                selectedOptions: item.selectedOptions,
                optionsSummary,
              };
            }),
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'فشل إتمام طلبك. يرجى المحاولة مرة أخرى.');
          createdOrderObj = data.order;
        } else {
          throw new Error('الاستجابة المستلمة ليست بتنسيق JSON (Non-JSON endpoint response)');
        }
      } catch (apiErr) {
        console.warn('API checkout endpoint unavailable or returned non-JSON, falling back to direct checkout handler:', apiErr);

        const orderId = 'OW-' + Math.floor(100000 + Math.random() * 900000);
        const createdAt = new Date().toISOString();

        const preparedItems = cartItems.map((item) => {
          const optionsSummary = [
            item.selectedColor?.name ? `اللون: ${item.selectedColor.name}` : '',
            item.selectedOptions
              ? Object.entries(item.selectedOptions)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' | ')
              : '',
          ]
            .filter(Boolean)
            .join(' - ');

          return {
            productId: item.product.id,
            productName: optionsSummary ? `${item.product.name} (${optionsSummary})` : item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            selectedColor: item.selectedColor?.name,
            selectedOptions: item.selectedOptions,
            optionsSummary,
          };
        });

        createdOrderObj = {
          id: orderId,
          customerName: formData.name,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          items: preparedItems,
          totalAmount: total,
          status: 'pending',
          createdAt: createdAt,
        };

        if (isSupabaseConfigured()) {
          const combinedAddressDetails = `المحافظة: ${formData.governorate} | العنوان: ${formData.address} | المعلم القريب: ${formData.nearbyLandmark || 'لا يوجد'} | ملاحظات: ${formData.notes || 'لا يوجد'}`;
          await supabase.from('orders').insert([
            {
              id: orderId,
              customer_name: formData.name,
              customer_phone: formData.phone,
              address_details: combinedAddressDetails,
              city: formData.city,
              items: preparedItems,
              total_amount: total,
              shipping_fee: 5000,
              status: 'pending',
              created_at: createdAt,
            },
          ]);
        }

        await sendTelegramNotification(createdOrderObj, {
          governorate: formData.governorate,
          nearbyLandmark: formData.nearbyLandmark,
          notes: formData.notes,
        });
      }

      if (!createdOrderObj) throw new Error('فشل إتمام طلبك. يرجى المحاولة مرة أخرى.');

      setCreatedOrder(createdOrderObj);
      onCheckoutComplete(createdOrderObj);
      setIsSubmitting(false);
      setCheckoutStep('success');
      onClearCart();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setIsSubmitting(false);
      setFormErrors({ submit: err.message || 'فشل إتمام طلبك. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.' });
    }
  };

  const handleReset = () => {
    setCheckoutStep('cart');
    setFormData({
      name: '', phone: '', governorate: 'بغداد', city: '', address: '', nearbyLandmark: '', notes: '', paymentMethod: 'cod',
    });
    setFormErrors({});
    setCreatedOrder(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (checkoutStep !== 'success' && !isSubmitting) onClose();
            }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ x: '100%', opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: '100%', opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-4 right-4 bottom-4 w-full max-w-md z-[60] flex flex-col bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(33,42,220,0.2)] overflow-hidden text-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-gradient-to-r from-transparent to-brand-blue/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-full bg-brand-blue/20 blur-2xl rounded-full" />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center text-brand-blue shadow-[0_0_15px_rgba(33,42,220,0.4)]">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide">
                    {checkoutStep === 'cart' && 'سلة المشتريات'}
                    {checkoutStep === 'form' && 'إتمام الطلب'}
                    {checkoutStep === 'success' && 'تم استلام الطلب'}
                  </h2>
                  <p className="text-[10px] text-brand-lavender/60 font-orbitron tracking-widest mt-0.5">
                    {checkoutStep === 'cart' && 'REVIEW YOUR GEAR'}
                    {checkoutStep === 'form' && 'SECURE CHECKOUT'}
                    {checkoutStep === 'success' && 'ORDER CONFIRMED'}
                  </p>
                </div>
              </div>

              {checkoutStep !== 'success' && !isSubmitting && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all relative z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: CART LIST */}
                {checkoutStep === 'cart' && (
                  <motion.div
                    key="cart"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full flex flex-col"
                  >
                    {cartItems.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          className="w-20 h-20 rounded-3xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue mb-6 shadow-[0_0_30px_rgba(33,42,220,0.2)]"
                        >
                          <ShoppingBag className="w-10 h-10" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-white mb-2">السلة فارغة</h3>
                        <p className="text-sm text-white/40 leading-relaxed mb-8 max-w-[200px]">
                          لم تقم بإضافة أي منتج حتى الآن.
                        </p>
                        <button
                          onClick={onClose}
                          className="px-6 py-3 rounded-2xl bg-brand-blue hover:bg-blue-600 text-white text-sm font-bold shadow-[0_0_20px_rgba(33,42,220,0.4)] transition-all cursor-pointer"
                        >
                          استكشف المنتجات
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                          <AnimatePresence>
                            {cartItems.map((item, i) => {
                              const itemId = item.id || item.product.id;
                              return (
                              <motion.div
                                key={itemId}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: i * 0.05 }}
                                className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl p-3 flex items-center gap-4 hover:bg-white/10 hover:border-brand-blue/50 transition-all"
                              >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="relative w-20 h-20 rounded-2xl bg-white border border-white/10 flex items-center justify-center p-2 overflow-hidden shrink-0">
                                  <img src={item.product.image} alt={item.product.name} className="object-contain w-full h-full" />
                                </div>
                                
                                <div className="flex-1 min-w-0 py-1">
                                  <h4 className="text-sm font-bold text-white truncate mb-0.5">{item.product.name}</h4>
                                  
                                  {/* SELECTED COLOR AND OPTIONS PILLS */}
                                  {(item.selectedColor || (item.selectedOptions && Object.keys(item.selectedOptions).length > 0)) && (
                                    <div className="flex flex-wrap gap-1 my-1">
                                      {item.selectedColor && (
                                        <span className="inline-flex items-center gap-1 text-[9px] bg-brand-blue/20 border border-brand-blue/40 text-brand-blue font-bold px-1.5 py-0.5 rounded">
                                          {item.selectedColor.hex && (
                                            <span className="w-2 h-2 rounded-full border border-white/40" style={{ backgroundColor: item.selectedColor.hex }} />
                                          )}
                                          اللون: {item.selectedColor.name}
                                        </span>
                                      )}
                                      {item.selectedOptions && Object.entries(item.selectedOptions).map(([optKey, optVal]) => (
                                        <span key={optKey} className="text-[9px] bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold px-1.5 py-0.5 rounded font-orbitron">
                                          {optKey}: {optVal}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <span className="text-[10px] text-brand-blue font-orbitron block mb-2 opacity-80">{item.product.nameEn}</span>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-base font-black font-orbitron text-white">{item.product.price.toLocaleString()}</span>
                                      <span className="text-[10px] text-white/40 font-bold">د.ع</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-black/40 rounded-full border border-white/10 p-1">
                                      <button onClick={() => onUpdateQuantity(itemId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-brand-blue hover:text-white text-white/70 transition-all cursor-pointer">
                                        <Plus className="w-3 h-3" />
                                      </button>
                                      <span className="min-w-[16px] text-center text-xs font-orbitron font-bold text-white">
                                        {item.quantity}
                                      </span>
                                      <button disabled={item.quantity <= 1} onClick={() => onUpdateQuantity(itemId, Math.max(1, item.quantity - 1))} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-brand-blue hover:text-white text-white/70 transition-all disabled:opacity-30 disabled:hover:bg-white/10 cursor-pointer">
                                        <Minus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <button onClick={() => onRemoveItem(itemId)} className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center rounded-full bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white cursor-pointer">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </motion.div>
                            );
                            })}
                          </AnimatePresence>
                        </div>

                        <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-xl">
                          <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-xs text-white/60">
                              <span>مجموع المنتجات</span>
                              <span className="font-orbitron font-medium">{subtotal.toLocaleString()} د.ع</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-brand-blue">
                              <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> تكلفة التوصيل</span>
                              <span className="font-bold">5,000 د.ع</span>
                            </div>
                            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                              <span className="text-sm font-bold text-white">الإجمالي</span>
                              <span className="font-orbitron text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-white drop-shadow-[0_0_10px_rgba(33,42,220,0.5)]">
                                {total.toLocaleString()} د.ع
                              </span>
                            </div>
                          </div>

                          <button onClick={() => setCheckoutStep('form')} className="w-full relative group h-14 rounded-2xl overflow-hidden cursor-pointer">
                            <div className="absolute inset-0 bg-brand-blue transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <div className="relative flex items-center justify-center gap-2 h-full text-white font-bold text-sm">
                              المتابعة لإتمام الطلب <ArrowRight className="w-4 h-4" />
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: CHECKOUT FORM */}
                {checkoutStep === 'form' && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full flex flex-col"
                  >
                    <div className="px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-sm">
                      <button onClick={() => setCheckoutStep('cart')} disabled={isSubmitting} className="flex items-center gap-2 text-xs text-white/50 hover:text-brand-blue transition-colors cursor-pointer">
                        <ArrowRight className="w-4 h-4" /> العودة للسلة
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
                      <div className="space-y-4">
                        <InputField label="الاسم بالكامل" name="name" value={formData.name} onChange={handleInputChange} error={formErrors.name} icon={<User className="w-4 h-4" />} disabled={isSubmitting} />
                        <InputField label="رقم الجوال" name="phone" value={formData.phone} onChange={handleInputChange} error={formErrors.phone} icon={<Phone className="w-4 h-4" />} disabled={isSubmitting} isLTR />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <SelectField label="المحافظة" name="governorate" value={formData.governorate} onChange={handleInputChange} error={formErrors.governorate} options={GOVERNORATES} disabled={isSubmitting} icon={<MapPin className="w-4 h-4" />} />
                          <InputField label="المدينة / المنطقة" name="city" value={formData.city} onChange={handleInputChange} error={formErrors.city} icon={<MapPin className="w-4 h-4" />} disabled={isSubmitting} placeholder="أدخل اسم مدينتك" />
                        </div>

                        <InputField label="العنوان التفصيلي" name="address" value={formData.address} onChange={handleInputChange} error={formErrors.address} icon={<MapPin className="w-4 h-4" />} disabled={isSubmitting} placeholder="الحي، الشارع، المنزل" />
                        <InputField label="معلم مميز (اختياري)" name="nearbyLandmark" value={formData.nearbyLandmark} onChange={handleInputChange} icon={<MapPin className="w-4 h-4 text-white/30" />} disabled={isSubmitting} />
                        <InputField label="ملاحظات (اختياري)" name="notes" value={formData.notes} onChange={handleInputChange} icon={<MessageSquare className="w-4 h-4 text-white/30" />} disabled={isSubmitting} />
                      </div>

                      <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-2xl p-4 flex gap-3">
                        <Coins className="w-6 h-6 text-brand-blue shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white mb-1">الدفع عند الاستلام</p>
                          <p className="text-[10px] text-white/50 leading-relaxed">ادفع نقداً بكل أمان عند استلامك الطلب مباشرة من مندوب التوصيل.</p>
                        </div>
                      </div>

                      {formErrors.submit && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold text-center">
                          {formErrors.submit}
                        </div>
                      )}
                    </div>

                    <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-xl">
                      <button onClick={handleSubmitCheckout} disabled={isSubmitting} className="w-full relative h-14 rounded-2xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(33,42,220,0.3)] transition-all flex items-center justify-center gap-2 overflow-hidden group disabled:opacity-50 disabled:pointer-events-none cursor-pointer">
                        {isSubmitting ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> جاري تأكيد الطلب...</>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            تأكيد الطلب بـ {total.toLocaleString()} د.ع
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: SUCCESS */}
                {checkoutStep === 'success' && createdOrder && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col p-8 items-center justify-center text-center relative overflow-y-auto"
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
                    
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                      className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_40px_rgba(16,185,129,0.3)] shrink-0"
                    >
                      <CheckCircle2 className="w-10 h-10" />
                    </motion.div>

                    <h3 className="text-2xl font-black text-white mb-1">طلبك مؤكد!</h3>
                    <p className="text-xs text-white/50 mb-6 max-w-[250px] mx-auto leading-relaxed">
                      تم تسجيل طلبك بنجاح، فريقنا سيتصل بك قريبا لتجهيز طلبك.
                    </p>

                    <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-right space-y-3 relative z-10 backdrop-blur-xl mb-6">
                      <div className="flex justify-between items-center pb-3 border-b border-white/5">
                        <span className="text-xs text-white/40">رقم الطلب</span>
                        <span className="text-sm font-orbitron font-bold text-brand-blue">{createdOrder.id}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/40">الاسم</span>
                        <span className="text-xs font-bold text-white">{createdOrder.customerName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-white/40">التوصيل</span>
                        <span className="text-xs font-bold text-white">{createdOrder.governorate || createdOrder.city}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-white/5">
                        <span className="text-xs text-white/40">الإجمالي الشامل</span>
                        <span className="text-sm font-orbitron font-black text-emerald-400">{createdOrder.totalAmount.toLocaleString()} د.ع</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full relative z-10">
                      <button
                        onClick={() => downloadOrderReceiptAsJPG(createdOrder)}
                        className="flex-1 py-3 px-4 rounded-2xl bg-brand-blue hover:bg-brand-blue/80 border border-brand-blue text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-blue/20"
                      >
                        <Download className="w-4 h-4" />
                        <span>تحميل الفاتورة (صورة JPG)</span>
                      </button>

                      <button
                        onClick={onClose}
                        className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        العودة للمتجر
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Reusable elegant input fields
const InputField = ({ label, name, value, onChange, error, icon, disabled, placeholder, isLTR }: any) => (
  <div>
    <label className="text-[11px] font-bold text-white/60 mb-2 flex items-center gap-1.5">{icon} {label}</label>
    <div className="relative group">
      <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${error ? 'bg-red-500/10 blur-md' : 'bg-brand-blue/0 group-focus-within:bg-brand-blue/20 group-focus-within:blur-md'}`} />
      <input
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        dir={isLTR ? 'ltr' : 'rtl'}
        className={`relative w-full bg-black/50 border ${error ? 'border-red-500/50' : 'border-white/10 focus:border-brand-blue'} rounded-xl px-4 py-3.5 text-xs text-white placeholder-white/20 outline-none transition-colors ${isLTR ? 'font-orbitron tracking-wider' : ''}`}
      />
    </div>
    {error && <span className="text-[10px] text-red-400 font-bold mt-1.5 block">{error}</span>}
  </div>
);

const SelectField = ({ label, name, value, onChange, error, options, disabled, icon }: any) => (
  <div>
    <label className="text-[11px] font-bold text-white/60 mb-2 flex items-center gap-1.5">{icon} {label}</label>
    <div className="relative group">
      <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${error ? 'bg-red-500/10 blur-md' : 'bg-brand-blue/0 group-focus-within:bg-brand-blue/20 group-focus-within:blur-md'}`} />
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`relative w-full bg-black/50 border ${error ? 'border-red-500/50' : 'border-white/10 focus:border-brand-blue'} rounded-xl px-4 py-3.5 text-xs text-white outline-none transition-colors cursor-pointer appearance-none`}
      >
        {options.map((opt: string) => <option key={opt} value={opt} className="bg-black text-white">{opt}</option>)}
      </select>
    </div>
    {error && <span className="text-[10px] text-red-400 font-bold mt-1.5 block">{error}</span>}
  </div>
);
