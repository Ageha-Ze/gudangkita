-- ============================================
-- DISABLE RLS FOR SERVICE-ROLE AUTHENTICATION
-- ============================================
-- Since MD-APP uses service role auth (not JWT),
-- we need to disable or bypass RLS policies

-- ============================================
-- DISABLE RLS ON ALL TABLES
-- ============================================

-- Master Data Tables
ALTER TABLE cabang DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer DISABLE ROW LEVEL SECURITY;
ALTER TABLE produk DISABLE ROW LEVEL SECURITY;
ALTER TABLE suplier DISABLE ROW LEVEL SECURITY;
ALTER TABLE pegawai DISABLE ROW LEVEL SECURITY;
ALTER TABLE kas DISABLE ROW LEVEL SECURITY;
ALTER TABLE toko_konsinyasi DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_level_permissions DISABLE ROW LEVEL SECURITY;

-- Transaction Tables
ALTER TABLE transaksi_penjualan DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_pembelian DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_konsinyasi DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_produksi DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_kas DISABLE ROW LEVEL SECURITY;

-- Detail Tables
ALTER TABLE detail_penjualan DISABLE ROW LEVEL SECURITY;
ALTER TABLE detail_pembelian DISABLE ROW LEVEL SECURITY;
ALTER TABLE detail_konsinyasi DISABLE ROW LEVEL SECURITY;
ALTER TABLE detail_produksi DISABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan_konsinyasi DISABLE ROW LEVEL SECURITY;

-- Financial Tables
ALTER TABLE piutang_penjualan DISABLE ROW LEVEL SECURITY;
ALTER TABLE hutang_pembelian DISABLE ROW LEVEL SECURITY;
ALTER TABLE hutang_umum DISABLE ROW LEVEL SECURITY;
ALTER TABLE cicilan_penjualan DISABLE ROW LEVEL SECURITY;
ALTER TABLE cicilan_pembelian DISABLE ROW LEVEL SECURITY;
ALTER TABLE cicilan_hutang_umum DISABLE ROW LEVEL SECURITY;
ALTER TABLE kas_harian DISABLE ROW LEVEL SECURITY;

-- Warehouse & Inventory Tables
ALTER TABLE gudang_unloading DISABLE ROW LEVEL SECURITY;
ALTER TABLE gudang_produksi DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_barang DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movement_fifo DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname DISABLE ROW LEVEL SECURITY;
ALTER TABLE retur_konsinyasi DISABLE ROW LEVEL SECURITY;

-- Users table (We handle auth in our app code)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that RLS is disabled
SELECT
    schemaname,
    tablename,
    CASE WHEN rowsecurity = true THEN 'ENABLED ❌' ELSE 'DISABLED ✅' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'produk', 'customer', 'suplier', 'cabang',
        'transaksi_penjualan', 'transaksi_pembelian', 'detail_penjualan',
        'stock_barang', 'piutang_penjualan', 'kas_harian'
    )
ORDER BY tablename;

-- ============================================
-- COMMENTARY
-- ============================================
-- MD-APP uses custom authentication system with:
-- 1. Service role authentication (not JWT)
-- 2. Session cookies managed by app
-- 3. Role-based access control in application code
--
-- Therefore, RLS is DISABLED to avoid conflicts with our auth system
-- Security is enforced at the API layer in Next.js middleware
