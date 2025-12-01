import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('user_session');

  // Protect routes
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/master') ||
      request.nextUrl.pathname.startsWith('/gudang') ||
      request.nextUrl.pathname.startsWith('/transaksi') ||
      request.nextUrl.pathname.startsWith('/persediaan') ||
      request.nextUrl.pathname.startsWith('/keuangan') ||
      request.nextUrl.pathname.startsWith('/laporan')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect to dashboard if already logged in
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/master/:path*',
    '/gudang/:path*',
    '/transaksi/:path*',
    '/persediaan/:path*',
    '/keuangan/:path*',
    '/laporan/:path*',
    '/login'
  ],
};