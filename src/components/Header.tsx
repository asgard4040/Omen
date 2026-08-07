import { ShoppingBag, Shield, Cpu, MousePointer } from 'lucide-react';

interface HeaderProps {
  cartItemsCount: number;
  onCartClick: () => void;
  onAdminClick: () => void;
  isAdminLoggedIn: boolean;
  onLogout: () => void;
  currentCategory: string;
  onCategorySelect: (catId: string) => void;
  categories: { id: string; name: string; available: boolean }[];
  logoUrl?: string;
}

export default function Header({
  cartItemsCount,
  onCartClick,
  onAdminClick,
  isAdminLoggedIn,
  onLogout,
  currentCategory,
  onCategorySelect,
  categories,
  logoUrl,
}: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-lavender/15 bg-black/90 backdrop-blur-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              referrerPolicy="no-referrer"
              className="h-12 w-auto bg-black/40 p-1"
            />
          ) : (
            <>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10">
                <Cpu className="h-5 w-5 text-brand-blue animate-pulse" />
              </div>
              <div className="text-right">
                <h1 className="font-orbitron text-xl font-black tracking-[0.28em] text-white leading-none">
                  OMEN
                </h1>
                <span className="mt-1 block text-[10px] uppercase tracking-[0.24em] text-brand-lavender/60 font-semibold">
                  الأجهزة التنافسية الفاخرة
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-cart-toggle"
            onClick={onCartClick}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-brand-lavender/20 bg-black/70 text-white transition-all hover:border-brand-blue focus:outline-none"
            aria-label={`سلة المشتريات، تحتوي على ${cartItemsCount} منتجات`}
          >
            <ShoppingBag className="h-5 w-5 text-brand-lavender/80 transition-colors group-hover:text-brand-blue" />
            {cartItemsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white ring-2 ring-black">
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
