-- ==========================================
-- OMEN WRAITH - DATABASE SCHEMA MIGRATION
-- Target Database: Supabase PostgreSQL
-- Date: 2026-07-20
-- Description: Complete production schema for Arabic gaming accessory store
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. admins TABLE (Admin profiles linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. categories TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    icon VARCHAR(100) NOT NULL,
    description TEXT,
    available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. products TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(100) REFERENCES public.categories(id) ON DELETE RESTRICT NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    old_price DECIMAL(10, 2) CHECK (old_price >= 0),
    rating DECIMAL(2, 1) DEFAULT 5.0 NOT NULL CHECK (rating >= 0 AND rating <= 5),
    reviews_count INTEGER DEFAULT 0 NOT NULL CHECK (reviews_count >= 0),
    image_url TEXT NOT NULL,
    stock INTEGER DEFAULT 0 NOT NULL CHECK (stock >= 0),
    is_featured BOOLEAN DEFAULT false NOT NULL,
    features TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    specs JSONB DEFAULT '[]'::JSONB NOT NULL,
    colors JSONB DEFAULT '[]'::JSONB NOT NULL,
    custom_options JSONB DEFAULT '[]'::JSONB NOT NULL,
    images JSONB DEFAULT '[]'::JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. product_images TABLE (For multi-angle galleries)
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id VARCHAR(100) REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. orders TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(100) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    governorate VARCHAR(100),
    nearby_landmark TEXT,
    notes TEXT,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50) DEFAULT 'cod' NOT NULL CHECK (payment_method IN ('cod', 'card')),
    status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'shipping', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. order_items TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(100) REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id VARCHAR(100) REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. settings TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ==========================================
-- AUTOMATIC TIMESTAMPS HANDLERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER set_updated_at_admins BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==========================================
-- INDEXES FOR MAXIMUM SEARCH SPEED & EFFICIENCY
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
