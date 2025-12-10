// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { hasPermission, type PermissionKey } from '@/utils/permissions';
import type { UserLevel } from '@/utils/permissions';

// ============================================
// ROUTE PERMISSION MAPPINGS (Aligned with RLS)
// ============================================
const ROUTE_PERMISSIONS: Record<string, PermissionKey[]> = {
  // Dashboard
  '/dashboard': ['dashboard.view'],

  // Master Data Routes
  '/master': ['produk.read'], // Base access for master menu
  '/master/user': ['user.manage'],
  '/master/produk': ['produk.read'],
  '/master/customer': ['customer.read'],
  '/master/supplier': ['suplier.read'],
  '/master/pegawai': ['pegawai.view'],
  '/master/cabang': ['cabang.view'],
  '/master/kas': ['kas.view'],
  '/master/toko-konsinyasi': ['toko_konsinyasi.view'],

  // Transaction Routes
  '/transaksi': ['sales.read'], // Base access for transaction menu
  '/transaksi/penjualan': ['sales.create'], // Kasir can create
  '/transaksi/pembelian': ['purchase.manage'], // Gudang only
  '/transaksi/konsinyasi': ['consignment.manage'], // Sales only
  '/transaksi/produksi': ['production.manage'], // Gudang only

  // Warehouse Routes
  '/gudang': ['stock.view'], // Base access for warehouse menu
  '/gudang/produksi': ['production.manage'], // Gudang only
  '/gudang/unloading': ['gudang_unloading.manage'], // Gudang only

  // Inventory Routes
  '/persediaan': ['stock.view'], // Base access for inventory menu
  '/persediaan/stock': ['stock.view'],
  '/persediaan/opname': ['stock_opname.manage'], // Gudang only
  '/persediaan/fifo': ['stock_movement_fifo.view'],

  // Finance Routes
  '/keuangan': ['piutang.view'], // Base access for finance menu (keuangan, kasir, sales can view)
  '/keuangan/piutang': ['piutang.view'],
  '/keuangan/hutang': ['hutang.view'],
  '/keuangan/hutang-umum': ['hutang_umum.view'],
  '/keuangan/kas-harian': ['kas_harian.view'],
  '/keuangan/transaksi-kas': ['transaksi_kas.view'],

  // Report Routes
  '/laporan': ['reports.view'],

  // Admin Routes
  '/admin': ['system.admin'],
  '/admin/permissions': ['permissions.manage'],
};

/**
 * Get user from session cookie
 */
function getUserFromSession(request: NextRequest): { 
  level: UserLevel; 
  id: string; 
  username: string;
  cabang_id?: number;
} | null {
  try {
    const userSession = request.cookies.get('user_session')?.value;
    if (!userSession) return null;

    const user = JSON.parse(userSession);
    
    // Validate user object has required fields
    if (!user.level || !user.id) {
      console.warn('Invalid user session: missing required fields');
      return null;
    }

    return user;
  } catch (error) {
    console.error('Failed to parse user session:', error);
    return null;
  }
}

/**
 * Check if route requires authentication and permissions
 * API routes are excluded from middleware checks (handled by API route authentication)
 */
function isProtectedRoute(pathname: string): boolean {
  // Exclude API routes (they handle their own authentication)
  if (pathname.startsWith('/api/')) {
    return false;
  }

  // Protect these frontend routes
  const protectedPaths = [
    '/dashboard',
    '/master',
    '/transaksi',
    '/gudang',
    '/persediaan',
    '/keuangan',
    '/laporan',
    '/admin',
  ];

  return protectedPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if user has permission to access route
 */
function hasRouteAccess(userLevel: UserLevel, pathname: string): boolean {
  // Find matching route permissions
  for (const [route, requiredPerms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      // User needs AT LEAST ONE of the required permissions
      const hasAccess = requiredPerms.some(perm => 
        hasPermission(userLevel, perm)
      );
      
      if (!hasAccess) {
        console.log(`Access denied: ${userLevel} lacks permissions for ${route}`, {
          required: requiredPerms,
          route,
          pathname
        });
        return false;
      }
    }
  }

  return true;
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  try {
    // Get user from session
    const user = getUserFromSession(request);

    // Check if route requires authentication
    if (isProtectedRoute(pathname)) {
      // Redirect to login if not authenticated
      if (!user) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Check route-level permissions
      const hasAccess = hasRouteAccess(user.level, pathname);
      
      if (!hasAccess) {
        // Redirect to unauthorized page
        const unauthorizedUrl = new URL('/unauthorized', request.url);
        unauthorizedUrl.searchParams.set('path', pathname);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    // Redirect authenticated users away from login page
    if (pathname === '/login' && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Add user info to request headers for API routes
    const response = NextResponse.next();
    
    if (user) {
      response.headers.set('x-user-level', user.level);
      response.headers.set('x-user-id', user.id.toString());
      if (user.cabang_id) {
        response.headers.set('x-user-branch', user.cabang_id.toString());
      }
    }

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // On error, still protect sensitive routes
    if (isProtectedRoute(pathname)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'session_error');
      return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.next();
  }
}

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
