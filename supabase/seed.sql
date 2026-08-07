-- ==========================================
-- SEED DATA MIGRATION
-- Target Database: Supabase PostgreSQL
-- ==========================================

-- Seed Categories
INSERT INTO public.categories (id, name, name_en, icon, description, available) VALUES
('mice', 'ماوسات الألعاب', 'Gaming Mice', 'Mouse', 'مجموعة ممتازة من ماوسات الألعاب الاحترافية وعالية الدقة', true),
('keyboards', 'لوحات المفاتيح', 'Gaming Keyboards', 'Keyboard', 'لوحات مفاتيح ميكانيكية متطورة ومقاومة للمهام الصعبة', true),
('headsets', 'سماعات الألعاب', 'Gaming Headsets', 'Headphones', 'سماعات رأس محيطية تمنحك أفضلية السمع والتركيز', true),
('mousepads', 'قواعد الماوس', 'Gaming Mousepads', 'Layers', 'أسطح ناعمة ومضادة للانزلاق لتوجيه دقيق للماوس', true),
('accessories', 'اكسسوارات إضافية', 'Gaming Accessories', 'Cpu', 'حوامل سماعات، مجمعات كابلات، وحلول تنظيمية فاخرة', true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;

-- Seed Settings
INSERT INTO public.settings (key, value) VALUES
('shipping', '{"fee": 25.00, "free_above": 350.00, "cities": ["الرياض", "جدة", "مكة المكرمة", "الدمام", "المدينة المنورة", "الخبر", "تبوك", "بريدة", "أبها", "حائل", "نجران", "جازان", "عرعر", "الجبيل", "الهفوف"]}'::jsonb),
('contact', '{"phone": "+966 50 123 4567", "email": "support@omenwraith.com", "address": "طريق الملك عبدالعزيز، الرياض، المملكة العربية السعودية"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value;

-- Seed Products
INSERT INTO public.products (id, category_id, name, name_en, description, price, old_price, rating, reviews_count, image_url, stock, is_featured, features, specs) VALUES
(
    'wraith-phantom', 
    'mice', 
    'ماوس Wraith Phantom اللاسلكي', 
    'Wraith Phantom Wireless Gaming Mouse', 
    'ماوس الألعاب اللاسلكي الاحترافي الأحدث، مجهز بحساس بصري بدقة 26,000 DPI ووزن خفيف للغاية يبلغ 54 جرامًا فقط، مع أزرار بصرية سريعة الاستجابة لضمان دقة لا تضاهى وعمر افتراضي طويل.',
    299.00, 
    399.00, 
    4.9, 
    148, 
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=600&auto=format&fit=crop', 
    42, 
    true, 
    ARRAY['مستشعر PixArt 3395 بدقة 26K', 'وزن ريشة 54 جرام لتوجيه فائق السرعة', 'أزرار بصرية تدوم حتى 90 مليون نقرة', 'تقنية اتصال لاسلكي خالية من التأخير 2.4 جيجاهرتز', 'بطارية تدوم حتى 80 ساعة متواصلة'], 
    '[
        {"label": "المستشعر", "value": "PixArt PAW3395 البصري"},
        {"label": "الحساسية القصوى", "value": "26,000 DPI"},
        {"label": "الوزن", "value": "54 جرام (+/- 2 جرام)"},
        {"label": "عمر البطارية", "value": "حتى 80 ساعة (اتصال 2.4G)"},
        {"label": "معدل الاستطلاع", "value": "1000Hz (قابلة للترقية لـ 4000Hz)"},
        {"label": "أزرار الضغط", "value": "مفاتيح بصرية بـ 90 مليون نقرة"}
    ]'::jsonb
),
(
    'wraith-blade-tkl', 
    'keyboards', 
    'كيبورد ميكانيكي Wraith Blade TKL', 
    'Wraith Blade TKL Mechanical Keyboard', 
    'لوحة مفاتيح ميكانيكية بتصميم مدمج (80%) خالي من الأزرار الجانبية للأرقام لتوفر مساحة أكبر لحركة الماوس. مجهزة بمفاتيح حمراء خطية مشحمة مسبقاً لتوفير تجربة كتابة هادئة وسلسة للغاية، وهيكل من الألومنيوم الصلب المقاوم للصدمات مع إضاءة RGB مذهلة قابلة للتعديل.',
    449.00, 
    549.00, 
    4.8, 
    85, 
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?q=80&w=600&auto=format&fit=crop', 
    18, 
    true, 
    ARRAY['تصميم TKL المدمج والمريح', 'سويتشات حمراء خطية (Linear) مشحمة مسبقاً', 'هيكل ألومنيوم من الفئة المستخدمة في صناعة الطائرات', 'إضاءة RGB خلفية بـ 16.8 مليون لون', 'أغطية مفاتيح PBT ثنائية الحقن متينة وطويلة العمر'], 
    '[
        {"label": "نوع المفاتيح", "value": "مفاتيح ميكانيكية حمراء خطية"},
        {"label": "المقاس", "value": "Tenkeyless (80%)"},
        {"label": "مادة الصنع", "value": "ألومنيوم + بلاستيك ABS متين"},
        {"label": "التوصيل", "value": "سلكي Type-C قابل للفصل"},
        {"label": "الإضاءة", "value": "RGB تفاعلية قابلة للبرمجة"},
        {"label": "أغطية المفاتيح", "value": "Double-shot PBT"}
    ]'::jsonb
),
(
    'wraith-apex-71', 
    'headsets', 
    'سماعة Wraith Apex المحيطية 7.1', 
    'Wraith Apex 7.1 Virtual Surround Headset', 
    'سماعة رأس احترافية للألعاب مع صوت محيطي افتراضي 7.1 ومحركات نيوديميوم بقطر 53 مم لتوفر صوتاً غامراً وواضحاً للغاية يتيح لك تحديد مواقع الأعداء بدقة فائقة. تصميم مريح وسائد أذن من الفوم المرن المغطى بالجلد، وميكروفون مانع للضوضاء وقابل للفصل للحديث بوضوح تام مع فريقك.',
    379.00, 
    479.00, 
    4.7, 
    92, 
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=600&auto=format&fit=crop', 
    25, 
    true, 
    ARRAY['صوت محيطي افتراضي مجسم 7.1 لردود فعل أسرع', 'محركات صوتية ممتازة بقطر 53 مم', 'ميكروفون عازل للضوضاء وقابل للفصل لتواصل واضح', 'وسائد أذن من رغوة الذاكرة الناعمة لراحة قصوى', 'توافق واسع مع الأجهزة (PC, PS5, Xbox Series X/S, Switch)'], 
    '[
        {"label": "محرك الصوت", "value": "مغناطيس نيوديميوم بقطر 53 مم"},
        {"label": "نطاق الاستجابة", "value": "15Hz - 25,000Hz"},
        {"label": "المقاومة", "value": "60 أوم"},
        {"label": "طريقة التوصيل", "value": "منفذ 3.5 ملم + كارت صوت USB خارجي"},
        {"label": "الميكروفون", "value": "أحادي الاتجاه مع إلغاء الضوضاء"},
        {"label": "الوزن", "value": "320 جرام مريح للاستخدام الطويل"}
    ]'::jsonb
),
(
    'wraith-cyberpad', 
    'mousepads', 
    'قاعدة ماوس Wraith CyberPad XXL', 
    'Wraith CyberPad XXL Control Mousepad', 
    'قاعدة ماوس عملاقة توفر توازناً مثالياً بين السرعة والتحكم التام. نسيج ناعم معالج ومقاوم للسوائل لسهولة التنظيف، وقاعدة مطاطية سميكة مانعة للانزلاق تحافظ على ثبات السطح في مكانه أثناء أكثر جلسات اللعب حماساً وإثارة.',
    129.00, 
    189.00, 
    4.9, 
    210, 
    'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?q=80&w=600&auto=format&fit=crop', 
    60, 
    false, 
    ARRAY['مساحة عملاقة XXL تغطي المكتب بالكامل', 'سطح ناعم ومقاوم للماء والسوائل لسهولة التنظيف', 'حواف مطرزة بدقة وخياطة ثلاثية لمنع التنسل', 'قاعدة مطاطية طبيعية مضادة للانزلاق ومثبتة بإحكام', 'مثالية لحساسيات الماوس المرتفعة والمنخفضة على حد سواء'], 
    '[
        {"label": "المقاس", "value": "900 مم × 400 مم × 4 مم"},
        {"label": "مادة السطح", "value": "قماش مايكرو فايبر معالج ومقاوم للسوائل"},
        {"label": "مادة القاعدة", "value": "مطاط طبيعي مانع للانزلاق"},
        {"label": "نوع الخياطة", "value": "حواف مخيطة بدقة لمنع التلف"},
        {"label": "نوع التحكم", "value": "هجين (توازن مثالي بين السرعة والتحكم)"}
    ]'::jsonb
);

-- Seed Product Images (multi-angle view)
INSERT INTO public.product_images (product_id, image_url, display_order) VALUES
('wraith-phantom', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=600&auto=format&fit=crop', 1),
('wraith-phantom', 'https://images.unsplash.com/photo-1527813713060-18f3e9bc1b40?q=80&w=600&auto=format&fit=crop', 2),
('wraith-blade-tkl', 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?q=80&w=600&auto=format&fit=crop', 1),
('wraith-blade-tkl', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=600&auto=format&fit=crop', 2)
ON CONFLICT DO NOTHING;
