import { Product, Category } from './types';

export const CATEGORIES: Category[] = [
  {
    id: 'mouses',
    name: 'فارات الألعاب',
    nameEn: 'Gaming Mouses',
    icon: 'MousePointer',
    description: 'أجهزة ماوس عالية الأداء للمحترفين.',
    available: true,
  },
  {
    id: 'keyboards',
    name: 'لوحات المفاتيح',
    nameEn: 'Keyboards',
    icon: 'Keyboard',
    description: 'لوحات ميكانيكية مخصصة.',
    available: true,
  },
  {
    id: 'mousepads',
    name: 'أسطح الفأرة',
    nameEn: 'Mousepads',
    icon: 'Grid',
    description: 'أسطح هجينة مطورة.',
    available: true,
  }
];

export const PRODUCTS: Product[] = [
  {
    id: 'wraith-v1',
    name: 'ماوس أومين ريث V1 برو',
    nameEn: 'Omen Wraith V1 Pro',
    description: 'ماوس احترافي خفيف الوزن بوزن 54 غرام ومستشعر بصري متطور بدقة 26K DPI لأداء فائق السرعة.',
    price: 125000,
    oldPrice: 150000,
    rating: 4.9,
    reviewsCount: 142,
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1625842268584-8f3290455651?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527813713060-747efc002bc0?w=600&auto=format&fit=crop&q=80'
    ],
    category: 'mouses',
    stock: 18,
    isFeatured: true,
    features: [
      'مستشعر PAW3395 بدقة 26,000 DPI',
      'وزن خفيف للغاية: 54 غرام',
      'معدل استجابة لاسلكي 4000Hz',
      'قواعد PTFE فائقة الانزلاق'
    ],
    specs: [
      { label: 'المستشعر', value: 'PAW3395 Custom' },
      { label: 'الوزن', value: '54 غرام' },
      { label: 'الدقة القصوى', value: '26,000 DPI' },
      { label: 'معدل الاستطلاع', value: '4000Hz' },
    ]
  },
  {
    id: 'wraith-phantom',
    name: 'ماوس فانتوم المحدود',
    nameEn: 'Omen Wraith Phantom Limited',
    description: 'نسخة محدودة بهيكل شفاف رائع يظهر التفاصيل الداخلية ومصنوع من سبائك المغنيسيوم فائقة الخفة.',
    price: 165000,
    oldPrice: 185000,
    rating: 5.0,
    reviewsCount: 64,
    image: 'https://images.unsplash.com/photo-1625842268584-8f3290455651?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1625842268584-8f3290455651?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527813713060-747efc002bc0?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80'
    ],
    category: 'mouses',
    stock: 7,
    isFeatured: true,
    features: [
      'هيكل شفاف ناعم بلوري',
      'دعم داخلي من المغنيسيوم الصلب',
      'معدل استطلاع 8000Hz حقيقي',
      'نسخة محدودة برقم تسلسلي محفر'
    ],
    specs: [
      { label: 'المستشعر', value: 'PAW3395 Custom Ultra' },
      { label: 'الوزن', value: '52 غرام' },
      { label: 'معدل الاستطلاع', value: '8000Hz لاسلكي' },
    ]
  },
  {
    id: 'wraith-apex-pro',
    name: 'ماوس أيبكس مغنيسيوم برو',
    nameEn: 'Omen Wraith Apex Magnesium Pro',
    description: 'قمة هندسة أجهزة الماوس. هيكل مفرغ بالكامل من سبائك المغنيسيوم بوزن 39 غرام لتوفير انزلاق واستجابة لا مثيل لهما.',
    price: 220000,
    oldPrice: 250000,
    rating: 4.9,
    reviewsCount: 88,
    image: 'https://images.unsplash.com/photo-1527813713060-747efc002bc0?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1527813713060-747efc002bc0?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1625842268584-8f3290455651?w=600&auto=format&fit=crop&q=80'
    ],
    category: 'mouses',
    stock: 3,
    isFeatured: true,
    features: [
      'هيكل مسبوك من سبائك المغنيسيوم الفضائية',
      'الوزن الأقل: 39 غرام فقط',
      'قاعدة من ألياف الكربون',
      'مستشعر Wraith Apex بدقة 32,000 DPI'
    ],
    specs: [
      { label: 'المادة المصنعة', value: 'سبائك المغنيسيوم الفضائية' },
      { label: 'الوزن', value: '39 غرام' },
      { label: 'المستشعر', value: 'Wraith Apex Flagship' },
    ]
  }
];

export const CITIES = [
  'بغداد',
  'البصرة',
  'الموصل',
  'أربيل',
  'السليمانية',
  'دهوك',
  'كركوك',
  'النجف الأشرف',
  'كربلاء المقدسة',
  'الحلة (بابل)',
  'العمارة (ميسان)',
  'الناصرية (ذي قار)',
  'الديوانية (القادسية)',
  'السماوة (المثنى)',
  'الكوت (واسط)',
  'تكريت (صلاح الدين)',
  'الرمادي (الأنبار)',
  'بعقوبة (ديالى)'
];

