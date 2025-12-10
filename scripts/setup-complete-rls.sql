-- ============================================
-- MD-APP: COMPLETE RLS POLICIES FOR ALL TABLES
-- ============================================

-- Enable RLS on ALL tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE suplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabang ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas ENABLE ROW LEVEL SECURITY;
ALTER TABLE toko_konsinyasi ENABLE ROW LEVEL SECURITY;

-- TRANSACTIONS
ALTER TABLE penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembelian ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_pembelian ENABLE ROW LEVEL SECURITY;
ALTER TABLE konsinyasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan_konsinyasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE retur_konsinyasi ENABLE ROW LEVEL SECURITY;

-- PRODUCTION
ALTER TABLE produksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_produksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE gudang_produksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE gudang_unloading ENABLE ROW LEVEL SECURITY;

-- INVENTORY
ALTER TABLE stock_barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movement ENABLE ROW LEVEL SECURITY;

-- FINANCE
ALTER TABLE piutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutang_umum ENABLE ROW LEVEL SECURITY;
ALTER TABLE cicilan_penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE cicilan_pembelian ENABLE ROW LEVEL SECURITY;
ALTER TABLE cicilan_hutang_umum ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_harian ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS users_self_access ON users;
DROP POLICY IF EXISTS users_admin_access ON users;
DROP POLICY IF EXISTS produk_read_access ON produk;
DROP POLICY IF EXISTS produk_write_access ON produk;
-- Add all other DROP statements for existing policies...

-- ====================================================================
-- 1. USERS TABLE POLICIES
-- ====================================================================

-- User can read their own record
CREATE POLICY users_self_access ON users
FOR SELECT USING (auth.uid() = id);

-- Admin can manage all users
CREATE POLICY users_admin_access ON users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.level IN ('super_admin', 'admin')
  )
);

-- ====================================================================
-- 2. MASTER DATA POLICIES (BRANCH-BASED ACCESS)
-- ====================================================================

-- Products: All authenticated users can read, only gudang can write
CREATE POLICY produk_read_access ON produk
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY produk_write_gudang ON produk
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.level IN ('super_admin', 'admin', 'gudang')
  )
);

-- Customers: Branch-restricted access
CREATE POLICY customer_branch_access ON customer
FOR ALL USING (
  cabang_id IS NULL OR
  cabang_id = (SELECT cabang_id FROM users WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin'))
);

-- Suppliers: Gudang can manage, others can read
CREATE POLICY suplier_gudang_control ON suplier
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
);

CREATE POLICY suplier_read_access ON suplier
FOR SELECT USING (auth.role() = 'authenticated');

-- ====================================================================
-- 3. SALES TRANSACTIONS POLICIES
-- ====================================================================

-- Sales: Users can see their own transactions, managers can see all
CREATE POLICY penjualan_own_sales ON penjualan
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'sales'))
);

CREATE POLICY penjualan_create_access ON penjualan
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'kasir', 'sales'))
);

CREATE POLICY penjualan_update_own ON penjualan
FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'sales')) OR
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level = 'kasir') AND
   created_at >= CURRENT_DATE) -- Kasir can only update same-day transactions
);

-- Sales Details: Follow same rules as parent
CREATE POLICY detail_penjualan_access ON detail_penjualan
FOR ALL USING (
  EXISTS (SELECT 1 FROM penjualan p WHERE p.id = penjualan_id AND (
    p.user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'sales', 'kasir'))
  ))
);

-- ====================================================================
-- 4. PURCHASE TRANSACTIONS POLICIES
-- ====================================================================

-- Purchases: Only gudang and admin can access
CREATE POLICY pembelian_gudang_access ON pembelian
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
);

-- Purchase Details: Same as above
CREATE POLICY detail_pembelian_gudang_access ON detail_pembelian
FOR ALL USING (
  EXISTS (SELECT 1 FROM pembelian p WHERE p.id = pembelian_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
  )
);

-- ====================================================================
-- 5. CONSIGNMENT POLICIES
-- ====================================================================

-- Consignment: Sales department access
CREATE POLICY konsinyasi_sales_access ON konsinyasi
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'sales'))
);

CREATE POLICY penjualan_konsinyasi_sales_access ON penjualan_konsinyasi
FOR ALL USING (
  EXISTS (SELECT 1 FROM konsinyasi k WHERE k.id = konsinyasi_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'sales'))
  )
);

-- ====================================================================
-- 6. PRODUCTION POLICIES
-- ====================================================================

-- Production: Only gudang
CREATE POLICY produksi_gudang_only ON produksi
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
);

CREATE POLICY detail_produksi_gudang_only ON detail_produksi
FOR ALL USING (
  EXISTS (SELECT 1 FROM produksi p WHERE p.id = produksi_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
  )
);

CREATE POLICY gudang_produksi_gudang_only ON gudang_produksi
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
);

-- ====================================================================
-- 7. INVENTORY POLICIES
-- ====================================================================

-- Stock: All authenticated users can read, gudang can modify
CREATE POLICY stock_read_all ON stock_barang
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY stock_write_gudang ON stock_barang
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
);

CREATE POLICY stock_produk_write_gudang ON stock_produk
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
);

-- Stock Opname: Gudang only
CREATE POLICY stock_opname_gudang_only ON stock_opname
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
);

-- ====================================================================
-- 8. FINANCE POLICIES
-- ====================================================================

-- Receivables: All can view, finance and admin can modify
CREATE POLICY piutang_view_all ON piutang
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY piutang_manage_finance ON piutang
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'keuangan'))
);

-- Payables: Gudang can view, finance can manage
CREATE POLICY hutang_gudang_view ON hutang
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'keuangan', 'gudang'))
);

CREATE POLICY hutang_finance_manage ON hutang
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'keuangan'))
);

-- Liabilities: Finance only
CREATE POLICY hutang_umum_finance_only ON hutang_umum
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'keuangan'))
);

-- Installments: Based on transaction type permissions
CREATE POLICY cicilan_penjualan_access ON cicilan_penjualan
FOR ALL USING (
  EXISTS (SELECT 1 FROM penjualan p WHERE p.id = penjualan_id AND (
    p.user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'sales', 'keuangan'))
  ))
);

-- Cash transactions: Based on role
CREATE POLICY kas_harian_role_access ON kas_harian
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY kas_harian_manage_access ON kas_harian
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'keuangan', 'kasir'))
);

-- ====================================================================
-- 9. ADMINISTRATIVE TABLES
-- ====================================================================

-- Branch: All can view, admin can modify
CREATE POLICY cabang_view_all ON cabang
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY cabang_admin_modify ON cabang
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin'))
);

-- Cash Accounts: All can view, admin can modify
CREATE POLICY kas_view_all ON kas
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY kas_admin_modify ON kas
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'keuangan'))
);

-- ====================================================================
-- 10. SPECIAL POLICIES FOR TABLE RELATIONSHIPS
-- ====================================================================

-- Gudang Unloading: Gudang only
CREATE POLICY gudang_unloading_gudang_only ON gudang_unloading
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND level IN ('super_admin', 'admin', 'gudang'))
);

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================

-- Check RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all policies created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test user access simulation (replace with actual user roles)
-- These queries can be used to verify policies work correctly
