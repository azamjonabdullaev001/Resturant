-- =====================================================
-- Restaurant Management System - Database Schema
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (admin, waiters, kitchen staff)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'waiter', 'shashlik', 'samsa', 'national', 'dessert')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tables in the restaurant
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_number INT UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'free' CHECK (status IN ('free', 'occupied')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Categories for menu items
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    panel_type VARCHAR(50) NOT NULL CHECK (panel_type IN ('shashlik', 'samsa', 'national', 'dessert', 'drinks')),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    quantity INT DEFAULT 0 CHECK (quantity >= 0),
    image_url VARCHAR(500),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    table_id INT NOT NULL REFERENCES tables(id),
    waiter_id INT NOT NULL REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'paid', 'cancelled')),
    total_price DECIMAL(12,2) DEFAULT 0,
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items (each item linked to an order and a menu item)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INT NOT NULL REFERENCES menu_items(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(12,2) NOT NULL,
    panel_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter_id ON orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_paid ON orders(paid);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_panel_type ON order_items(panel_type);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- Default admin user: phone +998914751330, password: 12345678
INSERT INTO users (phone, password_hash, name, role) VALUES
    ('+998914751330', crypt('12345678', gen_salt('bf')), 'Администратор', 'admin')
ON CONFLICT (phone) DO NOTHING;

-- Default categories
INSERT INTO categories (name, panel_type, description) VALUES
    ('Куриный шашлык', 'shashlik', 'Шашлык из курицы'),
    ('Баранина (нарезанная)', 'shashlik', 'Шашлык из нарезанной баранины'),
    ('Говядина (нарезанная)', 'shashlik', 'Шашлык из нарезанной говядины'),
    ('Говядина с хлебом', 'shashlik', 'Традиционный шашлык, смешанный с хлебом'),
    ('Баранина с хлебом', 'shashlik', 'Традиционный шашлык из баранины с хлебом'),
    ('Картошка самса', 'samsa', 'Самса с картошкой'),
    ('Мясная самса (говядина)', 'samsa', 'Самса с говядиной'),
    ('Мясная самса (баранина)', 'samsa', 'Самса с бараниной'),
    ('Куриная самса', 'samsa', 'Самса с курицей'),
    ('Плов', 'national', 'Узбекский национальный плов'),
    ('Лагман', 'national', 'Узбекский лагман'),
    ('Манты', 'national', 'Узбекские манты'),
    ('Торты', 'dessert', 'Торты и пирожные'),
    ('Мороженое', 'dessert', 'Мороженое'),
    ('Чай', 'drinks', 'Горячие напитки - чай'),
    ('Напитки', 'drinks', 'Холодные напитки')
ON CONFLICT DO NOTHING;
