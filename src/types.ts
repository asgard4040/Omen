export interface ProductColor {
  name: string;
  hex?: string;
}

export interface CustomOption {
  name: string;
  choices: string[];
}

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  images?: string[];
  category: string;
  stock: number;
  isFeatured: boolean;
  features: string[];
  specs: { label: string; value: string }[];
  colors?: ProductColor[];
  customOptions?: CustomOption[];
}

export interface CartItem {
  id?: string;
  product: Product;
  quantity: number;
  selectedColor?: ProductColor;
  selectedOptions?: Record<string, string>;
}

export interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    selectedColor?: string;
    selectedOptions?: Record<string, string>;
    optionsSummary?: string;
  }[];
  totalAmount: number;
  status: 'pending' | 'shipping' | 'completed' | 'cancelled';
  createdAt: string;
  paymentMethod: 'cod' | 'card';
  governorate?: string;
  nearbyLandmark?: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  available: boolean;
}
