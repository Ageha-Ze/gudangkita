// app/api/notifications/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const notifications: any[] = [];
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    // 1. CEK STOK PRODUK MENIPIS (stok <= 10)
    const { data: lowStockProducts } = await supabase
      .from('produk')
      .select('id, nama_produk, stok, satuan')
      .lte('stok', 10)
      .order('stok', { ascending: true });

    if (lowStockProducts && lowStockProducts.length > 0) {
      lowStockProducts.forEach((product: any) => {
        notifications.push({
          id: `stock-low-${product.id}`,
          type: 'warning',
          icon: '📦',
          title: 'Stok Menipis',
          message: `${product.nama_produk} tersisa ${product.stok} ${product.satuan}`,
          time: 'Sekarang',
          isRead: false,
          link: '/master/produk',
          priority: product.stok <= 5 ? 'high' : 'medium'
        });
      });
    }

    // 2. CEK HUTANG PEMBELIAN YANG JATUH TEMPO (3 hari ke depan)
    const { data: upcomingHutang } = await supabase
      .from('hutang_pembelian')
      .select(`
        id, 
        total_hutang, 
        sisa, 
        jatuh_tempo,
        suplier:suplier_id (nama)
      `)
      .eq('status', 'belum_lunas')
      .lte('jatuh_tempo', threeDaysFromNow.toISOString().split('T')[0])
      .order('jatuh_tempo', { ascending: true });

    if (upcomingHutang && upcomingHutang.length > 0) {
      upcomingHutang.forEach((hutang: any) => {
        const daysUntilDue = Math.ceil(
          (new Date(hutang.jatuh_tempo).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        notifications.push({
          id: `hutang-${hutang.id}`,
          type: 'danger',
          icon: '💳',
          title: 'Hutang Jatuh Tempo',
          message: `Hutang ke ${hutang.suplier?.nama || 'Supplier'} Rp ${hutang.sisa.toLocaleString('id-ID')} jatuh tempo ${daysUntilDue <= 0 ? 'hari ini' : `dalam ${daysUntilDue} hari`}`,
          time: `${Math.abs(daysUntilDue)} hari`,
          isRead: false,
          link: '/keuangan/hutang',
          priority: daysUntilDue <= 0 ? 'high' : 'medium'
        });
      });
    }

    // 3. CEK PIUTANG PENJUALAN YANG JATUH TEMPO
    const { data: upcomingPiutang } = await supabase
      .from('piutang_penjualan')
      .select(`
        id,
        total_piutang,
        sisa,
        jatuh_tempo,
        customer:customer_id (nama)
      `)
      .eq('status', 'belum_lunas')
      .lte('jatuh_tempo', threeDaysFromNow.toISOString().split('T')[0])
      .order('jatuh_tempo', { ascending: true });

    if (upcomingPiutang && upcomingPiutang.length > 0) {
      upcomingPiutang.forEach((piutang: any) => {
        const daysUntilDue = Math.ceil(
          (new Date(piutang.jatuh_tempo).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        notifications.push({
          id: `piutang-${piutang.id}`,
          type: 'info',
          icon: '💰',
          title: 'Piutang Jatuh Tempo',
          message: `Piutang dari ${piutang.customer?.nama || 'Customer'} Rp ${piutang.sisa.toLocaleString('id-ID')} ${daysUntilDue <= 0 ? 'sudah jatuh tempo' : `jatuh tempo dalam ${daysUntilDue} hari`}`,
          time: `${Math.abs(daysUntilDue)} hari`,
          isRead: false,
          link: '/keuangan/piutang',
          priority: daysUntilDue <= 0 ? 'high' : 'medium'
        });
      });
    }

    // 4. CEK PEMBELIAN YANG BELUM DITERIMA (status_barang = 'Belum Diterima')
    const { data: pendingPembelian } = await supabase
      .from('transaksi_pembelian')
      .select(`
        id,
        tanggal,
        total,
        suplier:suplier_id (nama)
      `)
      .eq('status_barang', 'Belum Diterima')
      .order('tanggal', { ascending: false })
      .limit(5);

    if (pendingPembelian && pendingPembelian.length > 0) {
      pendingPembelian.forEach((pembelian: any) => {
        const daysSince = Math.ceil(
          (today.getTime() - new Date(pembelian.tanggal).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        notifications.push({
          id: `pembelian-pending-${pembelian.id}`,
          type: 'warning',
          icon: '📥',
          title: 'Pembelian Belum Diterima',
          message: `Pembelian dari ${pembelian.suplier?.nama || 'Supplier'} senilai Rp ${pembelian.total.toLocaleString('id-ID')} belum diterima`,
          time: `${daysSince} hari lalu`,
          isRead: false,
          link: '/transaksi/pembelian',
          priority: daysSince > 7 ? 'high' : 'low'
        });
      });
    }

    // 5. CEK PENJUALAN YANG BELUM DITERIMA CUSTOMER
    const { data: pendingPenjualan } = await supabase
      .from('transaksi_penjualan')
      .select(`
        id,
        tanggal,
        total,
        customer:customer_id (nama)
      `)
      .eq('status_diterima', 'Belum Diterima')
      .order('tanggal', { ascending: false })
      .limit(5);

    if (pendingPenjualan && pendingPenjualan.length > 0) {
      pendingPenjualan.forEach((penjualan: any) => {
        const daysSince = Math.ceil(
          (today.getTime() - new Date(penjualan.tanggal).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        notifications.push({
          id: `penjualan-pending-${penjualan.id}`,
          type: 'info',
          icon: '📤',
          title: 'Penjualan Belum Diterima',
          message: `Penjualan ke ${penjualan.customer?.nama || 'Customer'} senilai Rp ${penjualan.total.toLocaleString('id-ID')} belum dikonfirmasi diterima`,
          time: `${daysSince} hari lalu`,
          isRead: false,
          link: '/transaksi/penjualan',
          priority: 'low'
        });
      });
    }

    // 6. CEK STOCK OPNAME PENDING
    const { data: pendingOpname } = await supabase
      .from('stock_opname')
      .select(`
        id,
        tanggal,
        selisih,
        produk:produk_id (nama_produk),
        cabang:cabang_id (nama_cabang)
      `)
      .eq('status', 'pending')
      .order('tanggal', { ascending: false })
      .limit(3);

    if (pendingOpname && pendingOpname.length > 0) {
      pendingOpname.forEach((opname: any) => {
        notifications.push({
          id: `opname-${opname.id}`,
          type: 'warning',
          icon: '📋',
          title: 'Stock Opname Menunggu Approval',
          message: `Stock opname ${opname.produk?.nama_produk} di ${opname.cabang?.nama_cabang} dengan selisih ${opname.selisih}`,
          time: new Date(opname.tanggal).toLocaleDateString('id-ID'),
          isRead: false,
          link: '/persediaan/stock-opname',
          priority: 'medium'
        });
      });
    }

    // Sort berdasarkan priority (high > medium > low)
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    notifications.sort((a, b) => 
      priorityOrder[a.priority as keyof typeof priorityOrder] - 
      priorityOrder[b.priority as keyof typeof priorityOrder]
    );

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
