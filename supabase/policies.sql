-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Target Platform: Supabase Postgres
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper Function to check if calling user is an authorized Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admins 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. admins POLICIES
-- ==========================================
-- Admins can read their own or others if admin
CREATE POLICY "Admins read access" ON public.admins
    FOR SELECT TO authenticated USING (true);

-- Super admin/initial sync insert only
CREATE POLICY "Admin modification policy" ON public.admins
    FOR ALL TO authenticated USING (public.is_admin());

-- ==========================================
-- 2. categories POLICIES
-- ==========================================
-- Guests and Admins can view available categories
CREATE POLICY "Categories select policy" ON public.categories
    FOR SELECT TO public USING (available = true OR public.is_admin());

-- Only admins can manage categories
CREATE POLICY "Categories write policy" ON public.categories
    FOR ALL TO authenticated USING (public.is_admin());

-- ==========================================
-- 3. products POLICIES
-- ==========================================
-- Guests and Admins can view products
CREATE POLICY "Products select policy" ON public.products
    FOR SELECT TO public USING (stock >= 0 OR public.is_admin());

-- Only admins can insert/update/delete products
CREATE POLICY "Products write policy" ON public.products
    FOR ALL TO authenticated USING (public.is_admin());

-- ==========================================
-- 4. product_images POLICIES
-- ==========================================
-- Guests and Admins can view product images
CREATE POLICY "Product images select policy" ON public.product_images
    FOR SELECT TO public USING (true);

-- Only admins can manage product images
CREATE POLICY "Product images write policy" ON public.product_images
    FOR ALL TO authenticated USING (public.is_admin());

-- ==========================================
-- 5. orders POLICIES
-- ==========================================
-- Guests can insert orders (place order)
CREATE POLICY "Orders insert policy" ON public.orders
    FOR INSERT TO public WITH CHECK (true);

-- ONLY admins can view or update orders
CREATE POLICY "Orders admin control policy" ON public.orders
    FOR ALL TO authenticated USING (public.is_admin());

-- ==========================================
-- 6. order_items POLICIES
-- ==========================================
-- Guests can insert order items
CREATE POLICY "Order items insert policy" ON public.order_items
    FOR INSERT TO public WITH CHECK (true);

-- ONLY admins can view or update order items
CREATE POLICY "Order items admin control policy" ON public.order_items
    FOR ALL TO authenticated USING (public.is_admin());

-- ==========================================
-- 7. settings POLICIES
-- ==========================================
-- Everyone can view general settings (e.g. shipping fee)
CREATE POLICY "Settings select policy" ON public.settings
    FOR SELECT TO public USING (true);

-- Only admins can modify settings
CREATE POLICY "Settings admin control policy" ON public.settings
    FOR ALL TO authenticated USING (public.is_admin());
