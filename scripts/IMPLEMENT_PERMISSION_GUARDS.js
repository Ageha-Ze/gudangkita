#!/usr/bin/env node
/**
 * PERMISSION GUARDS IMPLEMENTATION SCRIPT
 * This script helps implement permission guards across all page.tsx files
 *
 * Run with: node scripts/IMPLEMENT_PERMISSION_GUARDS.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 PERMISSION GUARDS IMPLEMENTATION GUIDES\n');

// Permission mappings for each page type
const PERMISSION_MAP = {
  // Purchase Pages
  'app/transaksi/pembelian/page.tsx': {
    permissions: {
      canView: 'purchase.read',
      canCreate: 'purchase.manage',
      canEdit: 'purchase.manage',
      canDelete: 'purchase.manage'
    },
    note: 'Keurangan can view, gudang can manage'
  },
  'app/transaksi/pembelian/[id]/page.tsx': {
    permissions: {
      canView: 'purchase.read',
      canEdit: 'purchase.manage',
      canDelete: 'purchase.manage',
      canReceive: 'purchase.manage'
    },
    note: 'Keurangan view-only, gudang full access'
  },

  // Sales Pages
  'app/transaksi/penjualan/page.tsx': {
    permissions: {
      canView: 'sales.read',
      canCreate: 'sales.create',
      canEdit: 'sales.update.today',
      canDelete: 'sales.delete'
    },
    note: 'All can view, kasir(today edit), sales(admin full)'
  },
  'app/transaksi/penjualan/[id]/page.tsx': {
    permissions: {
      canView: 'sales.read',
      canEdit: 'sales.update.today',
      canDelete: 'sales.delete',
      canPrint: 'sales.read'
    },
    note: 'Kasir can edit today, sales full access'
  },

  // Master Data
  'app/master/produk/page.tsx': {
    permissions: {
      canView: 'produk.read',
      canCreate: 'produk.write',
      canEdit: 'produk.write',
      canDelete: 'produk.write'
    },
    note: 'All view, gudang manage'
  },
  'app/master/customer/page.tsx': {
    permissions: {
      canView: 'customer.read',
      canCreate: 'customer.write',
      canEdit: 'customer.write'
    },
    note: 'Branch access, kasir/sales can create'
  },
  'app/master/supplier/page.tsx': {
    permissions: {
      canView: 'suplier.read',
      canCreate: 'suplier.write',
      canEdit: 'suplier.write'
    },
    note: 'Branch access, gudang can manage'
  },
  'app/master/user/page.tsx': {
    permissions: {
      canView: 'user.view',
      canCreate: 'user.manage',
      canEdit: 'user.manage',
      canDelete: 'user.manage'
    },
    note: 'Admin only'
  },

  // Financial Pages
  'app/keuangan/piutang/page.tsx': {
    permissions: {
      canView: 'piutang.view',
      canManage: 'piutang.manage'
    },
    note: 'All view, keuangan manage'
  },
  'app/keuangan/hutang/page.tsx': {
    permissions: {
      canView: 'hutang.view',
      canManage: 'hutang.manage'
    },
    note: 'All view, keuangan manage'
  },

  // Warehouse Pages
  'app/persediaan/stock-barang/page.tsx': {
    permissions: {
      canView: 'stock.view',
      canAdjust: 'stock.manage',
      canOpname: 'stock_opname.manage'
    },
    note: 'All view, gudang manage'
  },
  'app/gudang/produksi/page.tsx': {
    permissions: {
      canView: 'production.read',
      canCreate: 'production.manage',
      canEdit: 'production.manage'
    },
    note: 'Gudang only'
  },

  // Report Pages
  'app/laporan/penjualan/page.tsx': {
    permissions: {
      canView: 'reports.view'
    },
    note: 'All can view reports'
  },
  'app/laporan/pembelian/page.tsx': {
    permissions: {
      canView: 'reports.view'
    },
    note: 'All can view reports'
  }
};

console.log('📋 IMPLEMENTATION CHECKLIST:\n');

// Group by page type for better organization
const groups = {
  '💰 TRANSACTION PAGES': Object.keys(PERMISSION_MAP).filter(p => p.includes('/transaksi/')),
  '📊 MASTER DATA': Object.keys(PERMISSION_MAP).filter(p => p.includes('/master/')),
  '🏦 FINANCIAL': Object.keys(PERMISSION_MAP).filter(p => p.includes('/keuangan/')),
  '🏭 WAREHOUSE': Object.keys(PERMISSION_MAP).filter(p => p.includes('/gudang/') || p.includes('/persediaan/')),
  '📈 REPORTS': Object.keys(PERMISSION_MAP).filter(p => p.includes('/laporan/'))
};

Object.entries(groups).forEach(([groupName, pages]) => {
  console.log(`${groupName}:`);
  pages.forEach(page => {
    const config = PERMISSION_MAP[page];
    console.log(`  ✅ ${page.split('/').pop()}`);
    console.log(`     ↳ ${Object.keys(config.permissions).join(', ')}`);
    console.log(`     💡 ${config.note}`);
    console.log('');
  });
});

console.log('🔧 IMPLEMENTATION TEMPLATE:\n');

// Generate implementation template
function generatePageImplementation(pagePath) {
  const config = PERMISSION_MAP[pagePath];
  if (!config) return '';

  const pageName = pagePath.split('/').pop().replace('.tsx', '');
  const permissionKeys = Object.keys(config.permissions);

  let template = `// =================================================================
// PERMISSION GUARD IMPLEMENTATION FOR: ${pageName.toUpperCase()}
// =================================================================

import { usePermissions, ReadOnlyBanner } from '@/components/PermissionGuard';
import PermissionGuard from '@/components/PermissionGuard';

// At the top of the component:
const permissions = usePermissions({
${permissionKeys.map(key =>
  `  ${key}: ${JSON.stringify(config.permissions[key])}`
).join(',\n')}
});

// Check if user has view permissions
if (!permissions.${permissionKeys.find(k => k.includes('View') || k.includes('view'))}) {
  return <ForbiddenPage />; // Or redirect
}

// For read-only users (like Keuangan viewing purchase data):
${permissionKeys.some(k => k.includes('canManage')) ? `
const isReadOnly = permissions.canView && !permissions.canManage;
if (isReadOnly) {
  return (
    <ReadOnlyBanner />
    {/* Show page content but disable edits */}
  );
}` : `// All users can fully manage this page`}

// =================================================================
// ACTION BUTTON ACCESS:
// =================================================================

// ✅ SHOW - Only if user has permission:
// <PermissionGuard permission="${config.permissions.canCreate || config.permissions.canManage || 'dashboard.view'}">
//   <AddButton />
// </PermissionGuard>

// ✅ ENABLE/DISABLE - Based on specific permissions:
// <button disabled={!permissions.${permissionKeys.find(k => k.includes('Create')) || 'canCreate'}}>
//   Add New
// </button>

// ✅ Hide entire columns for VIEW-ONLY users:
// <th>Actions</th>
// <td>
//   {/* View button always available */}
//   <ViewButton />

//   {/* Edit/Delete only for full access */}
//   {permissions.${permissionKeys.find(k => k.includes('Edit') || k.includes('canManage'))} && (
//     <>
//       <EditButton />
//       <DeleteButton />
//     </>
//   )}
// </td>

// =================================================================
// END IMPLEMENTATION TEMPLATE
// =================================================================

`;
  return template;
}

// Show implementation example for pembelian page
console.log(generatePageImplementation('app/transaksi/pembelian/page.tsx'));

console.log('\n🎯 IMPLEMENTATION SUMMARY:\n');

console.log('1️⃣ IMPORT STATEMENT:');
console.log('import { usePermissions, ReadOnlyBanner } from \'@/components/PermissionGuard\';');
console.log('import PermissionGuard from \'@/components/PermissionGuard\';');
console.log('');

console.log('2️⃣ PERMISSION CHECK AT TOP:');
console.log('const permissions = usePermissions({');
console.log('  canView: \'purchase.read\',');
console.log('  canCreate: \'purchase.manage\',');
console.log('  canEdit: \'purchase.manage\'');
console.log('});');
console.log('');

console.log('3️⃣ CONDITIONAL UI RENDERING:');
console.log('// Hide buttons for read-only users');
console.log('{permissions.canCreate && <AddButton />}');
console.log('');
console.log('// Disable actions for view-only users');
console.log('<EditButton disabled={!permissions.canEdit} />');
console.log('');

console.log('4️⃣ READ-ONLY BANNER:');
console.log('// Show banner for Keuangan viewing Gudang data');
console.log('{isReadOnly && <ReadOnlyBanner />}');
console.log('');

console.log('🚀 QUICK IMPLEMENTATION ORDER:');
console.log('1. ✅ Transaction pages (sales & purchase)');
console.log('2. ✅ Master data pages');
console.log('3. ✅ Financial pages');
console.log('4. ✅ Warehouse pages');
console.log('5. ✅ Report pages');
console.log('');

console.log('🔍 TEST EACH PAGE:');
console.log('- Login as different users (kasir, gudang, keuangan)');
console.log('- Verify buttons appear/disappear correctly');
console.log('- Test that API calls respect permissions');
console.log('- Check read-only banners show properly');
console.log('');
