import { Star, ShieldAlert, Zap, Layers, Cpu } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  key?: any;
}

export default function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  // Select distinct badge text & icon based on product id
  const getBadge = () => {
    if (product.id === 'wraith-apex-pro') {
      return { text: 'هيكل مغنيسيوم مفرغ', icon: Layers, color: 'bg-brand-blue' };
    }
    if (product.id === 'wraith-phantom') {
      return { text: 'هيكل شفاف محدود', icon: Zap, color: 'bg-brand-blue' };
    }
    return { text: 'الأعلى مبيعاً', icon: Star, color: 'bg-brand-blue' };
  };

  const badge = getBadge();
  const BadgeIcon = badge.icon;

  return (
    <div 
      className="group relative flex flex-col overflow-hidden rounded-none bg-black border border-brand-lavender/20 hover:border-brand-blue transition-all duration-300 h-full text-right cursor-pointer"
      onClick={() => onViewDetails(product)}
    >
      
      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className={`inline-flex items-center gap-1 rounded-none ${badge.color} px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-black/40`}>
          <BadgeIcon className="h-3 w-3" />
          {badge.text}
        </span>
      </div>

      {/* Stock warning badge */}
      {product.stock <= 5 && (
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-flex items-center gap-1 rounded-none bg-red-950 border border-red-500/30 px-2 py-1 text-[11px] font-bold text-red-400">
            <ShieldAlert className="h-3 w-3" />
            تبقى {product.stock} فقط!
          </span>
        </div>
      )}

      {/* Product Image Area */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-white flex items-center justify-center p-3">
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Product Information */}
      <div className="flex flex-1 flex-col p-5">
        
        {/* Technical specs badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.specs.slice(0, 3).map((spec, i) => (
            <span 
              key={i} 
              className="text-[10px] bg-brand-lavender/10 border border-brand-lavender/10 text-brand-lavender/80 px-2 py-0.5 rounded-none font-orbitron font-semibold"
            >
              {spec.value}
            </span>
          ))}
        </div>

        {/* Name and English Tag */}
        <div className="mb-2">
          <h3 className="font-sans text-base font-bold text-white group-hover:text-brand-blue transition-colors leading-tight">
            {product.name}
          </h3>
          <p className="font-orbitron text-xs text-brand-lavender/60 font-medium mt-0.5">
            {product.nameEn}
          </p>
        </div>

        {/* Shortened description */}
        <p className="text-xs text-brand-lavender/70 font-normal leading-relaxed line-clamp-2 mb-4">
          {product.description}
        </p>



        {/* Price and Action Button */}
        <div className="mt-auto pt-4 border-t border-brand-lavender/10">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <span className="text-[10px] text-brand-lavender/40 block">السعر</span>
              <div className="flex items-baseline gap-1">
                <span className="font-orbitron text-lg font-black text-white">{product.price.toLocaleString()}</span>
                <span className="text-[10px] text-brand-lavender/80 font-semibold">د.ع</span>
                {product.oldPrice && (
                  <span className="font-orbitron text-[11px] text-brand-lavender/40 line-through mr-1">
                    {product.oldPrice.toLocaleString()} د.ع
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-1.5">
              <button
                id={`btn-add-cart-${product.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="inline-flex h-9 items-center justify-center rounded-none bg-brand-blue hover:brightness-110 px-3.5 text-xs font-bold text-white transition-all focus:outline-none"
                aria-label={`إضافة ${product.name} إلى السلة`}
              >
                أضف للسلة
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
