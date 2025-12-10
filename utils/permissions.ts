// utils/permissions.ts
// ALIGNED WITH RLS POLICIES - Complete permission system

export type UserLevel = 'super_admin' | 'admin' | 'keuangan' | 'kasir' | 'gudang' | 'sales';

// Cache for permissions - will be populated from database
let permissionCache: {
  permissions: Array<{id: string, name: string, description: string}> | null;
  levelPermissions: Record<string, Array<{id: string, name: string}>> | null;
  lastFetch: number | null;
} = {
  permissions: null,
  levelPermissions: null,
  lastFetch: null
};

// Fetch permissions from API
async function fetchPermissions(): Promise<void> {
  try {
    const response = await fetch('/api/permissions');
    if (!response.ok) {
      console.error('Failed to fetch permissions:', response.statusText);
      return;
    }

    const data = await response.json();
    if (data.success) {
      permissionCache.permissions = data.data.permissions;
      permissionCache.levelPermissions = data.data.levelPermissions;
      permissionCache.lastFetch = Date.now();
      console.log('Permissions loaded:', {
        permissions: data.data.permissions?.length || 0,
        levelPermissions: Object.keys(data.data.levelPermissions || {})
      });
    } else {
      console.warn('Permissions API response not successful:', data);
    }
  } catch (error) {
    console.error('Error fetching permissions:', error);
  }
}

// Get permissions with caching (refresh every 5 minutes)
async function getPermissions(): Promise<{ permissions: any[], levelPermissions: Record<string, any[]> }> {
  const now = Date.now();
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes

  if (!permissionCache.lastFetch || (now - permissionCache.lastFetch) > cacheExpiry) {
    await fetchPermissions();
  }

  return {
    permissions: permissionCache.permissions || [],
    levelPermissions: permissionCache.levelPermissions || {}
  };
}

// ============================================
// PERMISSION DEFINITIONS (Aligned with RLS)
// ============================================
export const PERMISSIONS = {
  // System Admin
  'system.admin': 'Full system administrative access',
  'user.view': 'View user accounts',
  'user.manage': 'Manage user accounts and roles',

  // Master Data - Products (Global access for view)
  'produk.read': 'View all products',
  'produk.write': 'Modify products (gudang only)',

  // Master Data - Customers (Branch-restricted)
  'customer.read': 'View customers by branch',
  'customer.write': 'Create/modify customers',

  // Master Data - Suppliers (Branch-restricted)
  'suplier.read': 'View suppliers by branch',
  'suplier.write': 'Create/modify suppliers (gudang)',

  // Master Data - Other
  'cabang.view': 'View own branch information',
  'pegawai.view': 'View employees by branch',
  'kas.view': 'View cash accounts',
  'toko_konsinyasi.view': 'View consignment shops',
  'toko_konsinyasi.manage': 'Manage consignment shops (sales)',

  // Sales Transactions
  'sales.read': 'View sales transactions by branch',
  'sales.create': 'Create sales transactions',
  'sales.update.today': 'Update same-day sales only (kasir)',
  'sales.update.all': 'Update all sales transactions (sales)',
  'sales.delete': 'Delete sales transactions (admin only)',

  // Sales Details
  'detail_penjualan.read': 'View sales item details',
  'detail_penjualan.write': 'Modify sales item details',

  // Purchase Transactions (Gudang only)
  'purchase.read': 'View purchase transactions',
  'purchase.manage': 'Create/modify purchase transactions',

  // Purchase Details
  'detail_pembelian.read': 'View purchase item details',
  'detail_pembelian.write': 'Modify purchase item details',

  // Production (Gudang only)
  'production.read': 'View production records',
  'production.manage': 'Create/modify production records',
  'detail_produksi.read': 'View production detail items',
  'detail_produksi.write': 'Modify production detail items',

  // Consignment (Sales only)
  'consignment.read': 'View consignment operations',
  'consignment.manage': 'Manage consignment operations',
  'detail_konsinyasi.read': 'View consignment details',
  'detail_konsinyasi.write': 'Modify consignment details',
  'penjualan_konsinyasi.read': 'View consignment sales',
  'penjualan_konsinyasi.write': 'Create consignment sales',
  'retur_konsinyasi.read': 'View consignment returns',
  'retur_konsinyasi.write': 'Process consignment returns',

  // Warehouse Operations (Gudang only)
  'gudang_unloading.read': 'View unloading operations',
  'gudang_unloading.manage': 'Manage unloading operations',
  'gudang_produksi.read': 'View warehouse production',
  'gudang_produksi.manage': 'Manage warehouse production',

  // Inventory (Gudang manage, others view)
  'stock.view': 'View stock and inventory by branch',
  'stock.manage': 'Manage stock levels (gudang)',
  'stock_movement_fifo.view': 'View FIFO movement history',
  'stock_movement_fifo.manage': 'Manage FIFO movements',
  'stock_opname.read': 'View stock opname records',
  'stock_opname.manage': 'Manage stock opname (gudang)',

  // Financial Operations (Keuangan manage, others view)
  'piutang.view': 'View accounts receivable',
  'piutang.manage': 'Manage accounts receivable (keuangan)',
  'hutang.view': 'View accounts payable',
  'hutang.manage': 'Manage accounts payable (keuangan)',
  'hutang_umum.view': 'View general liabilities',
  'hutang_umum.manage': 'Manage general liabilities (keuangan)',

  // Payment Installments (Keuangan only)
  'cicilan_penjualan.manage': 'Manage sales installments',
  'cicilan_pembelian.manage': 'Manage purchase installments',
  'cicilan_hutang_umum.manage': 'Manage general debt installments',

  // Cash Operations (Keuangan & Kasir)
  'kas_harian.view': 'View daily cash transactions',
  'kas_harian.manage': 'Manage daily cash transactions',
  'transaksi_kas.view': 'View cash account transactions',
  'transaksi_kas.manage': 'Manage cash account transactions',

  // Dashboard & Reports
  'dashboard.view': 'View dashboard and analytics',
  'reports.view': 'View business reports',

  // Permissions Management (Admin only)
  'permissions.view': 'View permission definitions',
  'permissions.manage': 'Manage permission assignments',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// ============================================
// ROLE PERMISSIONS (Aligned with RLS Policies)
// ============================================
export const ROLE_PERMISSIONS: Record<UserLevel, PermissionKey[]> = {
  // SUPER ADMIN: Full access to everything
  super_admin: Object.keys(PERMISSIONS) as PermissionKey[],

  // ADMIN: All except super_admin exclusive features
  admin: [
    'system.admin',
    'user.view', 'user.manage',
    'produk.read', 'produk.write',
    'customer.read', 'customer.write',
    'suplier.read', 'suplier.write',
    'cabang.view',
    'pegawai.view',
    'kas.view',
    'toko_konsinyasi.view', 'toko_konsinyasi.manage',
    
    // Sales
    'sales.read', 'sales.create', 'sales.update.all', 'sales.delete',
    'detail_penjualan.read', 'detail_penjualan.write',
    
    // Purchase
    'purchase.read', 'purchase.manage',
    'detail_pembelian.read', 'detail_pembelian.write',
    
    // Production
    'production.read', 'production.manage',
    'detail_produksi.read', 'detail_produksi.write',
    
    // Consignment
    'consignment.read', 'consignment.manage',
    'detail_konsinyasi.read', 'detail_konsinyasi.write',
    'penjualan_konsinyasi.read', 'penjualan_konsinyasi.write',
    'retur_konsinyasi.read', 'retur_konsinyasi.write',
    
    // Warehouse
    'gudang_unloading.read', 'gudang_unloading.manage',
    'gudang_produksi.read', 'gudang_produksi.manage',
    
    // Inventory
    'stock.view', 'stock.manage',
    'stock_movement_fifo.view', 'stock_movement_fifo.manage',
    'stock_opname.read', 'stock_opname.manage',
    
    // Finance
    'piutang.view', 'piutang.manage',
    'hutang.view', 'hutang.manage',
    'hutang_umum.view', 'hutang_umum.manage',
    'cicilan_penjualan.manage',
    'cicilan_pembelian.manage',
    'cicilan_hutang_umum.manage',
    
    // Cash
    'kas_harian.view', 'kas_harian.manage',
    'transaksi_kas.view', 'transaksi_kas.manage',
    
    // Reports
    'dashboard.view',
    'reports.view',
    
    // Permissions
    'permissions.view', 'permissions.manage',
  ],

  // KEUANGAN: Financial operations + view access to transactions
  keuangan: [
    'produk.read',
    'customer.read',
    'suplier.read',
    'cabang.view',

    // View-only for transactions (READ ONLY - NO MODIFICATIONS)
    'sales.read',
    'detail_penjualan.read',
    'purchase.read',
    'detail_pembelian.read',

    // Full financial management
    'piutang.view', 'piutang.manage',
    'hutang.view', 'hutang.manage',
    'hutang_umum.view', 'hutang_umum.manage',
    'cicilan_hutang_umum.manage', // Only for general debts, not transaction installments

    // Cash management
    'kas.view',
    'kas_harian.view', 'kas_harian.manage',
    'transaksi_kas.view', 'transaksi_kas.manage',

    // View stock for valuation
    'stock.view',
    'stock_movement_fifo.view',

    'dashboard.view',
    'reports.view',
  ],

  // KASIR: Point of sale operations
  kasir: [
    'produk.read',
    'customer.read', 'customer.write',
    'cabang.view',
    'kas.view',
    
    // Sales creation (same-day edit only)
    'sales.read',
    'sales.create',
    'sales.update.today', // Limited to same day
    'detail_penjualan.read', 'detail_penjualan.write',
    
    // View stock availability
    'stock.view',
    
    // View financial data (for customer credit checks)
    'piutang.view',
    
    // Cash operations
    'kas_harian.view', 'kas_harian.manage',
    'transaksi_kas.view', 'transaksi_kas.manage',
    
    'dashboard.view',
    'reports.view',
  ],

  // GUDANG: Warehouse & inventory management
  gudang: [
    'produk.read', 'produk.write',
    'suplier.read', 'suplier.write',
    'cabang.view',
    
    // View sales for shipping preparation
    'sales.read',
    'detail_penjualan.read',
    
    // Full purchase management
    'purchase.read', 'purchase.manage',
    'detail_pembelian.read', 'detail_pembelian.write',
    
    // Production management
    'production.read', 'production.manage',
    'detail_produksi.read', 'detail_produksi.write',
    'gudang_produksi.read', 'gudang_produksi.manage',
    
    // Warehouse operations
    'gudang_unloading.read', 'gudang_unloading.manage',
    
    // Full inventory control
    'stock.view', 'stock.manage',
    'stock_movement_fifo.view', 'stock_movement_fifo.manage',
    'stock_opname.read', 'stock_opname.manage',
    
    // View financial data (for purchase verification)
    'hutang.view',
    
    'dashboard.view',
    'reports.view',
  ],

  // SALES: Sales & consignment operations
  sales: [
    'produk.read',
    'customer.read', 'customer.write',
    'cabang.view',
    'toko_konsinyasi.view', 'toko_konsinyasi.manage',
    
    // Full sales management
    'sales.read',
    'sales.create',
    'sales.update.all', // Can edit past sales
    'detail_penjualan.read', 'detail_penjualan.write',
    
    // Full consignment management
    'consignment.read', 'consignment.manage',
    'detail_konsinyasi.read', 'detail_konsinyasi.write',
    'penjualan_konsinyasi.read', 'penjualan_konsinyasi.write',
    'retur_konsinyasi.read', 'retur_konsinyasi.write',
    
    // View stock for order fulfillment
    'stock.view',
    
    // View financial data (for customer credit checks)
    'piutang.view',
    
    'dashboard.view',
    'reports.view',
  ],
};

/**
 * Check if a user level has a specific permission (SYNCHRONOUS)
 * Use this in components, middleware, and API routes
 */
export function hasPermission(
  userLevel: UserLevel | null | undefined,
  requiredPermission: PermissionKey
): boolean {
  if (!userLevel) return false;

  // Check cached database permissions first
  if (permissionCache.levelPermissions) {
    const userPerms = permissionCache.levelPermissions[userLevel] || [];
    const permFound = userPerms.find((p: any) => p.name === requiredPermission);
    if (permFound) return true;
  }

  // Fallback to hardcoded permissions
  const userPerms = ROLE_PERMISSIONS[userLevel] || [];

  // Check for wildcard permissions
  if (userPerms.includes('*' as PermissionKey)) return true;

  // Check for direct permission match
  if (userPerms.includes(requiredPermission)) return true;

  // Check for wildcard patterns (module.*)
  return userPerms.some((perm) => {
    if (perm.endsWith('.*')) {
      const modulePrefix = perm.slice(0, -1); // Remove .* at end
      return requiredPermission.startsWith(modulePrefix);
    }
    return false;
  });
}

/**
 * Async version that checks database first
 * Use this when you can afford async operations (e.g., server components)
 */
export async function hasPermissionAsync(
  userLevel: UserLevel | null | undefined,
  requiredPermission: PermissionKey
): Promise<boolean> {
  if (!userLevel) return false;

  // Try database permissions first
  try {
    const { levelPermissions } = await getPermissions();
    const userPerms = levelPermissions[userLevel] || [];
    const permFound = userPerms.find((p: any) => p.name === requiredPermission);
    if (permFound) return true;
  } catch (error) {
    console.warn('Database permission check failed, falling back to hardcoded permissions');
  }

  // Fallback to synchronous check
  return hasPermission(userLevel, requiredPermission);
}

/**
 * Legacy sync version (kept for backward compatibility)
 */
export function hasPermissionSync(
  userLevel: UserLevel | null | undefined,
  requiredPermission: PermissionKey
): boolean {
  return hasPermission(userLevel, requiredPermission);
}

/**
 * Get all permissions for a user level
 */
export function getUserPermissions(userLevel: UserLevel): PermissionKey[] {
  return ROLE_PERMISSIONS[userLevel] || [];
}

/**
 * Check multiple permissions (user must have ALL permissions)
 */
export function hasAllPermissions(
  userLevel: UserLevel | null | undefined, 
  requiredPermissions: PermissionKey[]
): boolean {
  return requiredPermissions.every(perm => hasPermission(userLevel, perm));
}

/**
 * Check multiple permissions (user must have AT LEAST ONE permission)
 */
export function hasAnyPermission(
  userLevel: UserLevel | null | undefined, 
  requiredPermissions: PermissionKey[]
): boolean {
  return requiredPermissions.some(perm => hasPermission(userLevel, perm));
}

// ============================================
// STRICT MENU PERMISSIONS BY ROLE
// Each role can ONLY see menus relevant to their function
// ============================================
export const MENU_PERMISSIONS = {
  // Main menu sections
  dashboard: 'dashboard.view',
  master: 'produk.read',
  gudang: 'stock.view',
  transaksi: 'sales.read',
  persediaan: 'stock.view',
  keuangan: 'piutang.view',
  laporan: 'reports.view',

  // Master data sub-menus
  'master-user': 'user.manage',
  'master-produk': 'produk.read',
  'master-customer': 'customer.read',
  'master-supplier': 'suplier.read',
  'master-pegawai': 'pegawai.view',
  'master-cabang': 'cabang.view',
  'master-kas': 'kas.view',
  'master-toko-konsinyasi': 'toko_konsinyasi.view',

  // Warehouse sub-menus
  'gudang-produksi': 'production.manage',
  'gudang-unloading': 'gudang_unloading.manage',

  // Transaction sub-menus
  'penjualan-barang': 'sales.create',
  'pembelian-barang': 'purchase.manage',
  'konsinyasi': 'consignment.manage',
  'produksi': 'production.manage',

  // Inventory sub-menus
  'persediaan-stock': 'stock.view',
  'persediaan-opname': 'stock_opname.manage',
  'persediaan-fifo': 'stock_movement_fifo.view',

  // Finance sub-menus
  'keuangan-piutang': 'piutang.view',
  'keuangan-hutang': 'hutang.view',
  'keuangan-hutang-umum': 'hutang_umum.view',
  'keuangan-kas-harian': 'kas_harian.view',
  'keuangan-transaksi-kas': 'transaksi_kas.view',

  // Report sub-menus
  'laporan-penjualan': 'reports.view',
  'laporan-pembelian': 'reports.view',
  'laporan-hutang': 'reports.view',
  'laporan-piutang': 'reports.view',
  'laporan-movement': 'reports.view',
  'laporan-sales': 'reports.view',
  'laporan-laba-rugi': 'reports.view',
} as const;

/**
 * Check if user can access a menu/route
 */
export function canAccessMenu(
  userLevel: UserLevel | null | undefined,
  menuKey: keyof typeof MENU_PERMISSIONS
): boolean {
  const requiredPermission = MENU_PERMISSIONS[menuKey];
  return hasPermission(userLevel, requiredPermission as PermissionKey);
}

/**
 * Initialize permission cache on app start
 * Call this in your app initialization
 */
export async function initializePermissions(): Promise<void> {
  try {
    await fetchPermissions();
    console.log('Permission cache initialized');
  } catch (error) {
    console.error('Failed to initialize permissions:', error);
  }
}
