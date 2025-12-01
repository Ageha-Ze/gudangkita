// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // Cek cookie user_session untuk custom auth
    const userSession = request.cookies.get('user_session')?.value;
    
    let user = null;
    if (userSession) {
      try {
        user = JSON.parse(userSession);
      } catch (e) {
        console.error('Failed to parse user session:', e);
        // Cookie corrupt, hapus dan redirect ke login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('user_session');
        return response;
      }
    }

    // Protected routes
    const protectedPaths = [
      '/dashboard',
      '/master',
      '/transaksi',
      '/inventory',
      '/finance-accounting',
      '/laporan',
      '/persediaan',
    ];

    const isProtectedRoute = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    );

    // Redirect to login if accessing protected route without auth
    if (isProtectedRoute && !user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Redirect to dashboard if accessing login while authenticated
    if (request.nextUrl.pathname === '/login' && user) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware error:', error);
    
    // Jika ada error di middleware, tetap lanjutkan request
    // Tapi untuk protected routes, redirect ke login
    const protectedPaths = [
      '/dashboard',
      '/master',
      '/transaksi',
      '/inventory',
      '/finance-accounting',
      '/laporan',
      '/persediaan',
    ];
    
    const isProtectedRoute = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    );
    
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
