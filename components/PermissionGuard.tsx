// components/PermissionGuard.tsx
'use client';

import { ReactNode } from 'react';
import { useUser } from '@/contexts/UserContext';
import { hasPermission, hasAllPermissions, hasAnyPermission, PermissionKey } from '@/utils/permissions';

interface PermissionGuardProps {
  permission: PermissionKey | PermissionKey[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, user needs ALL permissions, otherwise ANY one
}

/**
 * Component that conditionally renders children based on user permissions
 * Usage:
 * <PermissionGuard permission="user.manage">
 *   <EditUserButton />
 * </PermissionGuard>
 *
 * or for multiple permissions:
 * <PermissionGuard permission={['sales.create', 'sales.read']}>
 *   <SalesForm />
 * </PermissionGuard>
 */
export default function PermissionGuard({
  permission,
  children,
  fallback = null,
  requireAll = false
}: PermissionGuardProps) {
  const { user } = useUser();

  const hasAccess = (): boolean => {
    if (!user?.level) return false;

    // Handle single permission
    if (typeof permission === 'string') {
      return hasPermission(user.level, permission);
    }

    // Handle multiple permissions
    if (Array.isArray(permission)) {
      if (requireAll) {
        return hasAllPermissions(user.level, permission);
      } else {
        return hasAnyPermission(user.level, permission);
      }
    }

    return false;
  };

  return hasAccess() ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook for checking permissions in components
 * Usage:
 * const canEditUsers = usePermission('user.manage');
 * const canManageSales = usePermission(['sales.create', 'sales.update.all'], true);
 */
export function usePermission(
  permission: PermissionKey | PermissionKey[],
  requireAll: boolean = false
): boolean {
  const { user } = useUser();

  if (!user?.level) return false;

  // Handle single permission
  if (typeof permission === 'string') {
    return hasPermission(user.level, permission);
  }

  // Handle multiple permissions
  if (Array.isArray(permission)) {
    if (requireAll) {
      return hasAllPermissions(user.level, permission);
    } else {
      return hasAnyPermission(user.level, permission);
    }
  }

  return false;
}

/**
 * Hook for getting multiple permission checks at once
 * Usage:
 * const { canView, canCreate, canEdit, canDelete } = usePermissions({
 *   canView: 'sales.read',
 *   canCreate: 'sales.create',
 *   canEdit: 'sales.update.all',
 *   canDelete: 'sales.delete'
 * });
 */
export function usePermissions<T extends Record<string, PermissionKey | PermissionKey[]>>(
  permissionMap: T
): Record<keyof T, boolean> {
  const { user } = useUser();

  const result = {} as Record<keyof T, boolean>;

  for (const [key, perm] of Object.entries(permissionMap)) {
    if (!user?.level) {
      result[key as keyof T] = false;
      continue;
    }

    if (typeof perm === 'string') {
      result[key as keyof T] = hasPermission(user.level, perm);
    } else if (Array.isArray(perm)) {
      result[key as keyof T] = hasAnyPermission(user.level, perm);
    } else {
      result[key as keyof T] = false;
    }
  }

  return result;
}

/**
 * Component for showing read-only warning banner
 */
export function ReadOnlyBanner({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-sm font-medium text-yellow-800">Mode Lihat Saja (Read-Only)</p>
          <p className="text-xs text-yellow-700 mt-1">
            Anda hanya dapat melihat data ini. Untuk membuat atau mengubah data, hubungi Administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * EXAMPLE USAGE IN PAGES
 */

// ============================================
// EXAMPLE 1: Transaksi Pembelian Page
// ============================================
export function ExamplePembelianPage() {
  const { user } = useUser();
  const permissions = usePermissions({
    canView: 'purchase.read',
    canCreate: 'purchase.manage',
    canEdit: 'purchase.manage',
    canDelete: 'purchase.manage',
  });

  const isReadOnly = permissions.canView && !permissions.canCreate;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transaksi Pembelian</h1>
        
        {/* Only show Create button if user has permission */}
        <PermissionGuard permission="purchase.manage">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Tambah Purchase Order
          </button>
        </PermissionGuard>
      </div>

      {/* Show read-only banner for Keuangan */}
      {isReadOnly && <ReadOnlyBanner />}

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No PO</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              
              {/* Only show Action column if user can edit */}
              {permissions.canEdit && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">PO-2024-001</td>
              <td className="px-4 py-3">PT Supplier Jaya</td>
              <td className="px-4 py-3">Rp 10,000,000</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Lunas</span>
              </td>
              
              {permissions.canEdit && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                    
                    {/* Delete only for admin */}
                    <PermissionGuard permission="purchase.manage">
                      <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    </PermissionGuard>
                  </div>
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 2: Using usePermission hook
// ============================================
export function ExampleSalesPage() {
  const canCreateSales = usePermission('sales.create');
  const canEditAllSales = usePermission('sales.update.all');
  const canEditTodaySales = usePermission('sales.update.today');
  
  return (
    <div>
      <h1>Transaksi Penjualan</h1>
      
      {canCreateSales && (
        <button>+ Tambah Penjualan</button>
      )}

      <table>
        <tbody>
          <tr>
            <td>INV-001</td>
            <td>Customer A</td>
            <td>
              {/* Kasir can edit TODAY's sales only */}
              {(canEditAllSales || canEditTodaySales) && (
                <button>Edit</button>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// EXAMPLE 3: Master User Page (Admin only)
// ============================================
export function ExampleUserManagementPage() {
  const permissions = usePermissions({
    canView: 'user.view',
    canManage: 'user.manage',
  });

  // If user can't even view, redirect or show 403
  if (!permissions.canView) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
          <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Manajemen User</h1>
        
        {/* Only Admin/Super Admin can add users */}
        <PermissionGuard permission="user.manage">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            + Tambah User
          </button>
        </PermissionGuard>
      </div>

      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Level</th>
            <th>Status</th>
            {permissions.canManage && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>john_doe</td>
            <td>Sales</td>
            <td>Active</td>
            
            <PermissionGuard permission="user.manage">
              <td>
                <button>Edit</button>
                <button>Nonaktifkan</button>
              </td>
            </PermissionGuard>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// EXAMPLE 4: Conditional Form Fields
// ============================================
export function ExampleProductForm() {
  const canEditPrice = usePermission('produk.write');
  const isReadOnly = !canEditPrice;

  return (
    <form>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nama Produk"
          disabled={isReadOnly}
          className={isReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}
        />

        {/* Only Gudang/Admin can edit price */}
        <PermissionGuard 
          permission="produk.write"
          fallback={
            <div className="bg-gray-100 p-3 rounded text-gray-500">
              Harga: Rp 100,000 (tidak bisa diubah)
            </div>
          }
        >
          <input
            type="number"
            placeholder="Harga"
            className="w-full px-3 py-2 border rounded"
          />
        </PermissionGuard>

        {canEditPrice ? (
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            Simpan
          </button>
        ) : (
          <button type="button" disabled className="bg-gray-300 text-gray-500 px-4 py-2 rounded cursor-not-allowed">
            Tidak Ada Akses Edit
          </button>
        )}
      </div>
    </form>
  );
}