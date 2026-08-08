import { useState, useEffect } from 'react';
import { ArrowRight, Check, ShoppingCart, ShieldCheck, Truck, Palette, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';
import { Product, ProductColor } from '../types';

interface ProductDetailsModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, selectedColor?: ProductColor, selectedOptions?: Record<string, string>) => void;
}

export default function ProductDetailsModal({ product, onClose, onAddToCart }: ProductDetailsModalProps) {
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>(undefined);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImage, setActiveImage] = useState<string>('');

  const parseImagesArray = (imgPrimary?: string, imgExtra?: string[] | string): string[] => {
    const list: string[] = [];
    if (imgPrimary) list.push(imgPrimary);

    if (Array.isArray(imgExtra)) {
      list.push(...imgExtra);
    } else if (typeof imgExtra === 'string' && imgExtra.trim().length > 0) {
      try {
        const parsed = JSON.parse(imgExtra);
        if (Array.isArray(parsed)) list.push(...parsed);
        else if (imgExtra.includes('\n')) list.push(...imgExtra.split('\n'));
        else if (imgExtra.includes(',')) list.push(...imgExtra.split(','));
        else if (imgExtra.startsWith('http')) list.push(imgExtra);
      } catch {
        if (imgExtra.includes('\n')) list.push(...imgExtra.split('\n'));
        else if (imgExtra.includes(',')) list.push(...imgExtra.split(','));
        else if (imgExtra.startsWith('http')) list.push(imgExtra);
      }
    }
    return Array.from(new Set(list.map(s => typeof s === 'string' ? s.trim() : '').filter(Boolean)));
  };

  useEffect(() => {
    if (product) {
      // Scroll to top when opening product details page
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Initialize active image
      const imagesList = parseImagesArray(product.image, product.images);
      setActiveImage(imagesList[0] || product.image);

      if (product.colors && product.colors.length > 0) {
        setSelectedColor(product.colors[0]);
      } else {
        setSelectedColor(undefined);
      }

      const rawCustomOpts = product.customOptions || (product as any).custom_options;
      let safeCustomOpts: any[] = [];
      if (Array.isArray(rawCustomOpts)) safeCustomOpts = rawCustomOpts;
      else if (typeof rawCustomOpts === 'string') {
        try { const parsed = JSON.parse(rawCustomOpts); if (Array.isArray(parsed)) safeCustomOpts = parsed; } catch {}
      }

      if (safeCustomOpts.length > 0) {
        const initialOpts: Record<string, string> = {};
        safeCustomOpts.forEach((opt: any) => {
          let choicesList: string[] = [];
          if (Array.isArray(opt.choices)) choicesList = opt.choices;
          else if (typeof opt.choices === 'string') {
            try { const parsed = JSON.parse(opt.choices); if (Array.isArray(parsed)) choicesList = parsed; } catch { choicesList = [opt.choices]; }
          }
          if (opt.name && choicesList.length > 0) {
            initialOpts[opt.name] = choicesList[0];
          }
        });
        setSelectedOptions(initialOpts);
      } else {
        setSelectedOptions({});
      }
    }
  }, [product]);

  if (!product) return null;

  const handleChoiceSelect = (optionName: string, choice: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: choice }));
  };

  const allImages = parseImagesArray(product.image, product.images);

  const rawCustomOpts = product.customOptions || (product as any).custom_options;
  let safeCustomOptions: any[] = [];
  if (Array.isArray(rawCustomOpts)) safeCustomOptions = rawCustomOpts;
  else if (typeof rawCustomOpts === 'string') {
    try { const parsed = JSON.parse(rawCustomOpts); if (Array.isArray(parsed)) safeCustomOptions = parsed; } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0b071a] text-gray-100 overflow-y-auto font-sans animate-fade-in flex flex-col">
      
      {/* Top sticky navigation bar */}
      <div className="sticky top-0 z-40 bg-[#0b071a]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-brand-blue hover:text-white border border-white/10 text-xs font-bold text-white transition-all cursor-pointer shadow-lg group"
          >
            <ArrowRight className="h-4 w-4 text-brand-blue group-hover:text-white transition-colors" />
            <span>العودة لمتجر المنتجات</span>
          </button>

          <div className="text-left font-orbitron text-xs text-white/50 hidden sm:block truncate">
            OMEN STORE / <span className="text-brand-blue font-bold">{product.nameEn}</span>
          </div>
        </div>
      </div>

      {/* Main Full Page Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* COLUMN 1: IMAGES GALLERY (Lg: 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Image Showcase Container */}
            <div className="relative flex flex-col items-center justify-center bg-white p-6 sm:p-10 rounded-3xl border border-white/20 shadow-[0_0_50px_rgba(33,42,220,0.12)] min-h-[360px] sm:min-h-[460px] transition-all overflow-hidden group">
              
              <img
                key={activeImage}
                src={activeImage || product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="max-h-[380px] w-full max-w-full object-contain p-2 transition-all duration-300 transform group-hover:scale-105"
              />

              {product.stock <= 0 && (
                <div className="absolute top-4 right-4 bg-red-600/90 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-lg">
                  نفذت الكمية
                </div>
              )}
            </div>

            {/* MULTIPLE IMAGES THUMBNAILS GALLERY */}
            {allImages.length > 1 && (
              <div className="space-y-3 bg-white/5 p-4 rounded-3xl border border-white/10">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-blue">
                  <ImageIcon className="h-4 w-4" />
                  <span>معرض الصور المتعددة للمنتج ({allImages.length} صور):</span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {allImages.map((imgUrl, idx) => {
                    const isActive = imgUrl === activeImage;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(imgUrl)}
                        className={`relative h-20 w-20 shrink-0 rounded-2xl bg-white p-2 border transition-all cursor-pointer overflow-hidden flex items-center justify-center ${
                          isActive
                            ? 'border-2 border-brand-blue ring-4 ring-brand-blue/30 shadow-[0_0_20px_rgba(33,42,220,0.5)] scale-105'
                            : 'border-white/20 hover:border-brand-blue/60 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`${product.name} - ${idx + 1}`}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TRUST FACTORS BADGES */}
            <div className="grid grid-cols-2 gap-4 bg-white/5 p-5 rounded-3xl border border-white/10">
              <div className="flex items-center gap-3 text-xs text-white/80">
                <div className="h-10 w-10 rounded-2xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-brand-blue" />
                </div>
                <div className="text-right">
                  <span className="font-bold block text-white text-sm">ضمان سنة أصلية</span>
                  <span className="text-[10px] text-white/50">استبدال فوري متاح للمتجر</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-white/80">
                <div className="h-10 w-10 rounded-2xl bg-brand-blue/10 border border-brand-blue/30 flex items-center justify-center shrink-0">
                  <Truck className="h-5 w-5 text-brand-blue" />
                </div>
                <div className="text-right">
                  <span className="font-bold block text-white text-sm">توصيل سريع لكافة المحافظات</span>
                  <span className="text-[10px] text-white/50">خلال 24-48 ساعة كحد أقصى</span>
                </div>
              </div>
            </div>

          </div>

          {/* COLUMN 2: SPECS, COLORS, CUSTOM OPTIONS & BUY PANEL (Lg: 5 cols) */}
          <div className="lg:col-span-5 space-y-6 text-right">
            
            {/* Category & Title */}
            <div>
              <span className="inline-flex bg-brand-blue/15 text-brand-blue text-[10px] font-black px-3 py-1.5 rounded-xl border border-brand-blue/30 font-orbitron tracking-widest uppercase mb-3">
                OMEN ACCESSORY
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                {product.name}
              </h1>
              <p className="font-orbitron text-base text-brand-blue font-bold tracking-wide mt-1">
                {product.nameEn}
              </p>
            </div>

            {/* Pricing Box */}
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2 backdrop-blur-md">
              <div className="flex items-baseline gap-4 justify-start">
                <span className="text-3xl font-black font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-purple-400">
                  {product.price.toLocaleString()} د.ع
                </span>
                {product.oldPrice && (
                  <span className="text-sm line-through text-white/40 font-orbitron">
                    {product.oldPrice.toLocaleString()} د.ع
                  </span>
                )}
              </div>
              
              {product.oldPrice && (
                <span className="inline-block text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  وفرت {Math.round(product.oldPrice - product.price).toLocaleString()} د.ع
                </span>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white/60">عن هذا المنتج:</h3>
              <p className="text-xs text-white/70 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
                {product.description}
              </p>
            </div>

            {/* PRODUCT COLOR PICK SELECTION */}
            {product.colors && product.colors.length > 0 && (
              <div className="bg-white/5 p-5 rounded-3xl border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Palette className="h-4 w-4 text-brand-blue" />
                  <span>اختر اللون المطلوب:</span>
                  {selectedColor && <span className="text-brand-blue font-black font-orbitron">({selectedColor.name})</span>}
                </div>

                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color, i) => {
                    const isSelected = selectedColor?.name === color.name;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-blue/20 border-brand-blue text-white shadow-[0_0_15px_rgba(33,42,220,0.4)]'
                            : 'bg-black/40 border-white/10 text-white/70 hover:border-white/30'
                        }`}
                      >
                        {color.hex && (
                          <span
                            className="h-4 w-4 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                        )}
                        <span>{color.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand-blue" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CUSTOM OPTIONS SELECTION */}
            {safeCustomOptions.length > 0 && (
              <div className="bg-white/5 p-5 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <SlidersHorizontal className="h-4 w-4 text-brand-blue" />
                  <span>خيارات التخصيص للمنتج:</span>
                </div>

                {safeCustomOptions.map((opt: any, optIdx: number) => {
                  let choicesList: string[] = [];
                  if (Array.isArray(opt.choices)) choicesList = opt.choices;
                  else if (typeof opt.choices === 'string') {
                    try { const parsed = JSON.parse(opt.choices); if (Array.isArray(parsed)) choicesList = parsed; } catch { choicesList = [opt.choices]; }
                  }
                  if (!opt.name || choicesList.length === 0) return null;
                  return (
                    <div key={optIdx} className="space-y-2">
                      <label className="text-[11px] font-bold text-white/60 block">{opt.name}:</label>
                      <div className="flex flex-wrap gap-2">
                        {choicesList.map((choice: string, cIdx: number) => {
                          const isSelected = selectedOptions[opt.name] === choice;
                          return (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => handleChoiceSelect(opt.name, choice)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-brand-blue text-white border-brand-blue shadow-[0_0_15px_rgba(33,42,220,0.5)]'
                                  : 'bg-black/40 border-white/10 text-white/70 hover:border-white/30'
                              }`}
                            >
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Technical features list */}
            {product.features && product.features.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white/60">المميزات الرئيسية:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/80 bg-white/5 p-3 rounded-2xl border border-white/5">
                      <Check className="h-4 w-4 text-brand-blue shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specifications table */}
            {product.specs && product.specs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white/60">المواصفات التقنية:</h3>
                <div className="divide-y divide-white/5 bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                  {product.specs.map((spec: any, i) => {
                    const label = typeof spec === 'string' ? '' : (spec?.label || spec?.name || '');
                    const value = typeof spec === 'string' ? spec : (spec?.value || spec?.val || '');
                    return (
                      <div key={i} className="flex justify-between p-3 text-xs">
                        <span className="text-white/50">{label || 'المواصفة'}</span>
                        <span className="font-bold text-white font-orbitron">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADD TO CART ACTION BUTTON */}
            <div className="pt-4 sticky bottom-4 z-20">
              <button
                disabled={product.stock <= 0}
                onClick={() => {
                  onAddToCart(product, selectedColor, selectedOptions);
                }}
                className={`w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer shadow-xl ${
                  product.stock > 0
                    ? 'bg-brand-blue hover:bg-brand-blue/90 text-white shadow-[0_0_30px_rgba(33,42,220,0.5)] hover:shadow-[0_0_40px_rgba(33,42,220,0.7)]'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                <span>{product.stock > 0 ? 'إضافة إلى سلة المشتريات الآن' : 'نفذت الكمية من المخزن'}</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
