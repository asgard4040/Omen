import { useState, useEffect } from 'react';
import { X, Check, ShoppingCart, ShieldCheck, Truck, Palette, SlidersHorizontal } from 'lucide-react';
import { Product, ProductColor } from '../types';

interface ProductDetailsModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, selectedColor?: ProductColor, selectedOptions?: Record<string, string>) => void;
}

export default function ProductDetailsModal({ product, onClose, onAddToCart }: ProductDetailsModalProps) {
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>(undefined);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      if (product.colors && product.colors.length > 0) {
        setSelectedColor(product.colors[0]);
      } else {
        setSelectedColor(undefined);
      }

      if (product.customOptions && product.customOptions.length > 0) {
        const initialOpts: Record<string, string> = {};
        product.customOptions.forEach((opt) => {
          if (opt.choices && opt.choices.length > 0) {
            initialOpts[opt.name] = opt.choices[0];
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      {/* Outer Click Closer */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl overflow-hidden bg-black border border-brand-lavender/20 shadow-2xl transition-all duration-300 max-h-[90vh] flex flex-col">
        
        {/* Glowing border top */}
        <div className="h-[2px] bg-brand-blue" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center bg-black border border-brand-lavender/10 hover:border-red-500/40 text-brand-lavender/60 hover:text-red-400 transition-all cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Column 1: Huge Glowing Product Image */}
            <div className="relative flex flex-col items-center justify-center bg-white p-6 border border-white/20 rounded-2xl shadow-inner">
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="max-h-72 w-full max-w-full object-contain animate-pulse-slow p-2"
              />
              
              {/* Trust factors */}
              <div className="mt-8 grid grid-cols-2 gap-4 w-full border-t border-brand-lavender/10 pt-6">
                <div className="flex items-center gap-2.5 text-xs text-brand-lavender/80">
                  <ShieldCheck className="h-5 w-5 text-brand-blue" />
                  <div className="text-right">
                    <span className="font-bold block">ضمان سنتين</span>
                    <span className="text-[10px] text-gray-400">استبدال فوري متاح</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-brand-lavender/80">
                  <Truck className="h-5 w-5 text-brand-blue" />
                  <div className="text-right">
                    <span className="font-bold block">شحن سريع مجاني</span>
                    <span className="text-[10px] text-gray-400">خلال 48 ساعة</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Specs and features */}
            <div className="flex flex-col text-right">
              
              {/* Title and meta */}
              <div className="mb-4">
                <span className="inline-flex bg-brand-blue/10 text-brand-blue text-[10px] font-bold px-2.5 py-1 mb-2 border border-brand-blue/20 font-orbitron tracking-widest">
                  OMEN ACCESSORIES
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {product.name}
                </h2>
                <p className="font-orbitron text-sm text-brand-blue font-bold tracking-wide mt-1">
                  {product.nameEn}
                </p>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-300 font-normal leading-relaxed mb-6">
                {product.description}
              </p>

              {/* COLORS SECTION IF AVAILABLE */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-6 bg-brand-lavender/5 border border-brand-lavender/15 p-4 rounded-none">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5">
                      <Palette className="h-4 w-4 text-brand-blue" />
                      اختيار اللون:
                    </span>
                    <span className="text-xs text-brand-blue font-bold">
                      {selectedColor?.name || 'اختر اللون'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((col, idx) => {
                      const isSelected = selectedColor?.name === col.name;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedColor(col)}
                          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-brand-blue text-white border-brand-blue shadow-[0_0_12px_rgba(33,42,220,0.6)]'
                              : 'bg-black/60 text-gray-300 border-white/10 hover:border-brand-blue/40'
                          }`}
                        >
                          {col.hex && (
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-white/30 shrink-0"
                              style={{ backgroundColor: col.hex }}
                            />
                          )}
                          <span>{col.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 mr-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CUSTOM OPTIONS SECTION IF AVAILABLE */}
              {product.customOptions && product.customOptions.length > 0 && (
                <div className="mb-6 space-y-4">
                  {product.customOptions.map((opt, idx) => (
                    <div key={idx} className="bg-brand-lavender/5 border border-brand-lavender/15 p-4 rounded-none">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-brand-blue" />
                          {opt.name}:
                        </span>
                        <span className="text-xs text-brand-blue font-bold font-orbitron">
                          {selectedOptions[opt.name] || ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {opt.choices.map((choice, cIdx) => {
                          const isSelected = selectedOptions[opt.name] === choice;
                          return (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => handleChoiceSelect(opt.name, choice)}
                              className={`px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                                isSelected
                                  ? 'bg-brand-blue text-white border-brand-blue shadow-[0_0_12px_rgba(33,42,220,0.6)] font-orbitron'
                                  : 'bg-black/60 text-gray-300 border-white/10 hover:border-brand-blue/40 font-orbitron'
                              }`}
                            >
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Core Features bullets */}
              {product.features && product.features.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">
                    المميزات الأساسية للعتاد:
                  </h4>
                  <ul className="space-y-2">
                    {product.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-300 font-medium">
                        <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center bg-brand-blue/10 border border-brand-blue/30 text-brand-blue">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specs Grid */}
              {product.specs && product.specs.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">
                    المواصفات الفنية التقنية:
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {product.specs.map((spec, i) => (
                      <div key={i} className="bg-brand-lavender/5 border border-brand-lavender/10 p-3 text-right">
                        <span className="text-[10px] text-brand-blue font-bold block mb-0.5">{spec.label}</span>
                        <span className="text-xs text-white font-orbitron font-semibold">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price & Buy panel */}
              <div className="mt-auto border-t border-brand-lavender/10 pt-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block">السعر الإجمالي</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-orbitron text-2xl font-black text-white">{product.price.toLocaleString()}</span>
                    <span className="text-xs text-brand-lavender/80 font-bold">د.ع</span>
                    {product.oldPrice && (
                      <span className="font-orbitron text-xs text-brand-lavender/40 line-through mr-2">
                        {product.oldPrice.toLocaleString()} د.ع
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      onAddToCart(product, selectedColor, selectedOptions);
                      onClose();
                    }}
                    className="inline-flex h-12 items-center gap-2 rounded-none bg-brand-blue hover:brightness-110 px-6 font-bold text-white shadow-lg transition-all cursor-pointer"
                  >
                    <ShoppingCart className="h-4.5 w-4.5" />
                    <span>أضف إلى حقيبة التسوق</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
