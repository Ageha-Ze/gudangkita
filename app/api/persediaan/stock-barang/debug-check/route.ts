// app/api/persediaan/stock-barang/debug-check/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * GET - Debug check untuk lihat detail stock sebelum rebuild
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();

    console.log('🔍 Starting debug check...');

    const report = {
      current_stock_barang: {
        total: 0,
        by_tipe: { masuk: 0, keluar: 0 },
        duplicates: [] as any[],
      },
      transactions: {
        pembelian: 0,
        detail_pembelian: 0,
        produksi: 0,
        penjualan: 0,
        detail_penjualan: 0,
        konsinyasi: 0,
        opname: 0,
        detail_produksi: 0,
      },
      stock_by_satuan: {} as any,
      problematic_products: [] as any[],
    };

    // 1. Check current stock_barang
    const { data: stockBarang, error: sbError } = await supabase
      .from('stock_barang')
      .select('id, produk_id, cabang_id, tanggal, jumlah, tipe, keterangan');

    if (sbError) throw sbError;

    report.current_stock_barang.total = stockBarang?.length || 0;
    report.current_stock_barang.by_tipe.masuk = stockBarang?.filter(s => s.tipe === 'masuk').length || 0;
    report.current_stock_barang.by_tipe.keluar = stockBarang?.filter(s => s.tipe === 'keluar').length || 0;

    // Check for duplicates
    const groupedStock = new Map<string, any[]>();
    stockBarang?.forEach((s: any) => {
      const key = `${s.produk_id}-${s.cabang_id}-${s.tanggal}-${s.tipe}-${s.jumlah}-${s.keterangan}`;
      if (!groupedStock.has(key)) {
        groupedStock.set(key, []);
      }
      groupedStock.get(key)!.push(s);
    });

    groupedStock.forEach((items, key) => {
      if (items.length > 1) {
        report.current_stock_barang.duplicates.push({
          key: key,
          count: items.length,
          ids: items.map(i => i.id),
          sample: items[0],
        });
      }
    });

    // 2. Check transactions
    const { count: pembelianCount } = await supabase
      .from('transaksi_pembelian')
      .select('*', { count: 'exact', head: true })
      .eq('status_barang', 'Diterima');
    report.transactions.pembelian = pembelianCount || 0;

    const { count: detailPembelianCount } = await supabase
      .from('detail_pembelian')
      .select('*', { count: 'exact', head: true });
    report.transactions.detail_pembelian = detailPembelianCount || 0;

    const { count: produksiCount } = await supabase
      .from('transaksi_produksi')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'posted');
    report.transactions.produksi = produksiCount || 0;

    const { count: penjualanCount } = await supabase
      .from('transaksi_penjualan')
      .select('*', { count: 'exact', head: true })
      .in('status', ['billed', 'paid']);
    report.transactions.penjualan = penjualanCount || 0;

    const { count: detailPenjualanCount } = await supabase
      .from('detail_penjualan')
      .select('*', { count: 'exact', head: true });
    report.transactions.detail_penjualan = detailPenjualanCount || 0;

    const { count: konsinyasiCount } = await supabase
      .from('penjualan_konsinyasi')
      .select('*', { count: 'exact', head: true });
    report.transactions.konsinyasi = konsinyasiCount || 0;

    const { count: opnameCount } = await supabase
      .from('stock_opname')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');
    report.transactions.opname = opnameCount || 0;

    const { count: detailProduksiCount } = await supabase
      .from('detail_produksi')
      .select('*', { count: 'exact', head: true });
    report.transactions.detail_produksi = detailProduksiCount || 0;

    // 3. Check stock by satuan
    const { data: produkData } = await supabase
      .from('produk')
      .select('id, nama_produk, kode_produk, satuan, stok');

    const satuanGroups = new Map<string, { total_stock: number, products: any[] }>();
    
    produkData?.forEach((p: any) => {
      const satuan = p.satuan || 'Unknown';
      if (!satuanGroups.has(satuan)) {
        satuanGroups.set(satuan, { total_stock: 0, products: [] });
      }
      const group = satuanGroups.get(satuan)!;
      group.total_stock += parseFloat(p.stok?.toString() || '0');
      group.products.push({
        id: p.id,
        nama: p.nama_produk,
        kode: p.kode_produk,
        stock: parseFloat(p.stok?.toString() || '0'),
      });
    });

    satuanGroups.forEach((data, satuan) => {
      report.stock_by_satuan[satuan] = {
        total: data.total_stock,
        count: data.products.length,
        products: data.products,
      };
    });

    // 4. Check problematic products (negative or very high stock)
    produkData?.forEach((p: any) => {
      const stock = parseFloat(p.stok?.toString() || '0');
      if (stock < 0 || stock > 100000) {
        report.problematic_products.push({
          id: p.id,
          nama: p.nama_produk,
          kode: p.kode_produk,
          stock: stock,
          satuan: p.satuan,
          issue: stock < 0 ? 'NEGATIVE' : 'VERY_HIGH',
        });
      }
    });

    return NextResponse.json({
      success: true,
      report,
      recommendations: {
        has_duplicates: report.current_stock_barang.duplicates.length > 0,
        duplicate_count: report.current_stock_barang.duplicates.length,
        should_rebuild: report.current_stock_barang.duplicates.length > 0 || 
                       report.problematic_products.length > 0,
        total_transactions: Object.values(report.transactions).reduce((a, b) => a + b, 0),
      },
    });
  } catch (error: any) {
    console.error('❌ Error in debug check:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}