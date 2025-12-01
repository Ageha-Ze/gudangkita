// app/api/persediaan/stock-barang/reset-rebuild/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * POST - Reset and rebuild stock from scratch
 * This will:
 * 1. DELETE all existing stock_barang records
 * 2. Rebuild from ALL transactions in correct order
 * 3. Recalculate final stock
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();
    const { mode = 'check' } = body; // 'check' or 'reset'

    console.log(`🔄 Starting stock reset & rebuild - MODE: ${mode}...`);

    const summary = {
      mode: mode,
      current_stock_records: 0,
      will_be_created: {
        pembelian: 0,
        produksi: 0,
        konsinyasi: 0,
        penjualan: 0,
        stock_opname: 0,
        bahan_produksi: 0,
      },
      final_products: [] as any[],
    };

    // ===== COUNT CURRENT RECORDS =====
    const { count: currentCount } = await supabase
      .from('stock_barang')
      .select('*', { count: 'exact', head: true });

    summary.current_stock_records = currentCount || 0;

    // ===== COUNT TRANSACTIONS TO BE CREATED =====

    // 1. Pembelian (status Diterima)
    const { data: pembelian } = await supabase
      .from('transaksi_pembelian')
      .select('id')
      .eq('status_barang', 'Diterima');

    if (pembelian) {
      const { data: detailPembelian } = await supabase
        .from('detail_pembelian')
        .select('id')
        .in('pembelian_id', pembelian.map(p => p.id));
      
      summary.will_be_created.pembelian = detailPembelian?.length || 0;
    }

    // 2. Produksi (status posted)
    const { count: produksiCount } = await supabase
      .from('transaksi_produksi')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'posted');

    summary.will_be_created.produksi = produksiCount || 0;

    // 3. Konsinyasi
    const { count: konsinyasiCount } = await supabase
      .from('penjualan_konsinyasi')
      .select('*', { count: 'exact', head: true });

    summary.will_be_created.konsinyasi = konsinyasiCount || 0;

    // 4. Penjualan (status billed/paid)
    const { data: penjualan } = await supabase
      .from('transaksi_penjualan')
      .select('id')
      .in('status', ['billed', 'paid']);

    if (penjualan) {
      const { data: detailPenjualan } = await supabase
        .from('detail_penjualan')
        .select('id')
        .in('penjualan_id', penjualan.map(p => p.id));
      
      summary.will_be_created.penjualan = detailPenjualan?.length || 0;
    }

    // 5. Stock Opname (status approved)
    const { count: opnameCount } = await supabase
      .from('stock_opname')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    summary.will_be_created.stock_opname = opnameCount || 0;

    // 6. Bahan Produksi
    const { data: detailProduksi } = await supabase
      .from('detail_produksi')
      .select('id, produksi_id, item_id, jumlah');

    if (detailProduksi) {
      const produksiIds = [...new Set(detailProduksi.map(dp => dp.produksi_id))];
      const { data: produksiPosted } = await supabase
        .from('transaksi_produksi')
        .select('id')
        .in('id', produksiIds)
        .eq('status', 'posted');
      
      const postedIds = new Set(produksiPosted?.map(p => p.id) || []);
      summary.will_be_created.bahan_produksi = detailProduksi.filter(
        dp => postedIds.has(dp.produksi_id)
      ).length;
    }

    // If mode is 'reset', do the actual rebuild
    if (mode === 'reset') {
      console.log('🗑️ Deleting all existing stock_barang records...');
      
      // DELETE ALL stock_barang
      const { error: deleteError } = await supabase
        .from('stock_barang')
        .delete()
        .neq('id', 0); // Delete all (workaround for delete all)

      if (deleteError) throw deleteError;

      console.log('✅ All stock_barang deleted');

      // Now rebuild from scratch
      console.log('🔨 Rebuilding stock from transactions...');

      const insertResults = {
        pembelian: 0,
        produksi: 0,
        konsinyasi: 0,
        penjualan: 0,
        opname: 0,
        bahan: 0,
        errors: [] as any[],
      };

      // 1. Insert Pembelian
      if (pembelian && pembelian.length > 0) {
        const { data: detailPembelian } = await supabase
          .from('detail_pembelian')
          .select('id, pembelian_id, produk_id, jumlah, harga')
          .in('pembelian_id', pembelian.map(p => p.id));

        const { data: pembelianData } = await supabase
          .from('transaksi_pembelian')
          .select('id, tanggal, cabang_id')
          .in('id', pembelian.map(p => p.id));

        const pembelianMap = new Map(pembelianData?.map(p => [p.id, p]) || []);

        for (const detail of detailPembelian || []) {
          const pb = pembelianMap.get(detail.pembelian_id);
          if (!pb) continue;

          const { error } = await supabase
            .from('stock_barang')
            .insert({
              produk_id: detail.produk_id,
              cabang_id: pb.cabang_id,
              tanggal: pb.tanggal,
              jumlah: detail.jumlah,
              tipe: 'masuk',
              keterangan: `Pembelian - ${detail.pembelian_id}`,
              hpp: detail.harga,
              harga_jual: detail.harga * 1.2,
              persentase: 20,
            });

          if (error) {
            insertResults.errors.push({ type: 'pembelian', error: error.message });
          } else {
            insertResults.pembelian++;
          }
        }
      }

      // 2. Insert Produksi (produk jadi)
      const { data: produksiData } = await supabase
        .from('transaksi_produksi')
        .select('id, tanggal, produk_id, jumlah, cabang_id')
        .eq('status', 'posted');

      for (const prod of produksiData || []) {
        const { error } = await supabase
          .from('stock_barang')
          .insert({
            produk_id: prod.produk_id,
            cabang_id: prod.cabang_id,
            tanggal: prod.tanggal,
            jumlah: prod.jumlah,
            tipe: 'masuk',
            keterangan: `Produksi - ${prod.id}`,
            hpp: 0,
            harga_jual: 0,
            persentase: 0,
          });

        if (error) {
          insertResults.errors.push({ type: 'produksi', error: error.message });
        } else {
          insertResults.produksi++;
        }
      }

      // 3. Insert Bahan Produksi (keluar)
      if (detailProduksi) {
        const produksiIds = [...new Set(detailProduksi.map(dp => dp.produksi_id))];
        const { data: produksiInfo } = await supabase
          .from('transaksi_produksi')
          .select('id, tanggal, cabang_id, status')
          .in('id', produksiIds)
          .eq('status', 'posted');

        const produksiInfoMap = new Map(produksiInfo?.map(p => [p.id, p]) || []);

        for (const dp of detailProduksi) {
          const prod = produksiInfoMap.get(dp.produksi_id);
          if (!prod) continue;

          const { error } = await supabase
            .from('stock_barang')
            .insert({
              produk_id: dp.item_id,
              cabang_id: prod.cabang_id,
              tanggal: prod.tanggal,
              jumlah: dp.jumlah,
              tipe: 'keluar',
              keterangan: `Bahan Produksi - ${dp.produksi_id}`,
              hpp: 0,
              harga_jual: 0,
              persentase: 0,
            });

          if (error) {
            insertResults.errors.push({ type: 'bahan', error: error.message });
          } else {
            insertResults.bahan++;
          }
        }
      }

      // 4. Insert Penjualan
      if (penjualan && penjualan.length > 0) {
        const { data: detailPenjualan } = await supabase
          .from('detail_penjualan')
          .select('id, penjualan_id, produk_id, jumlah')
          .in('penjualan_id', penjualan.map(p => p.id));

        const { data: penjualanData } = await supabase
          .from('transaksi_penjualan')
          .select('id, tanggal, cabang_id')
          .in('id', penjualan.map(p => p.id));

        const penjualanMap = new Map(penjualanData?.map(p => [p.id, p]) || []);

        for (const detail of detailPenjualan || []) {
          const pj = penjualanMap.get(detail.penjualan_id);
          if (!pj) continue;

          const { error } = await supabase
            .from('stock_barang')
            .insert({
              produk_id: detail.produk_id,
              cabang_id: pj.cabang_id,
              tanggal: pj.tanggal,
              jumlah: detail.jumlah,
              tipe: 'keluar',
              keterangan: `Penjualan - ${detail.penjualan_id}`,
              hpp: 0,
              harga_jual: 0,
              persentase: 0,
            });

          if (error) {
            insertResults.errors.push({ type: 'penjualan', error: error.message });
          } else {
            insertResults.penjualan++;
          }
        }
      }

      // 5. Insert Konsinyasi
      const { data: konsinyasiData } = await supabase
        .from('penjualan_konsinyasi')
        .select('id, tanggal_jual, jumlah_terjual, detail_konsinyasi_id');

      if (konsinyasiData && konsinyasiData.length > 0) {
        const { data: detailKons } = await supabase
          .from('detail_konsinyasi')
          .select('id, produk_id, konsinyasi_id')
          .in('id', konsinyasiData.map(k => k.detail_konsinyasi_id));

        const { data: transaksiKons } = await supabase
          .from('transaksi_konsinyasi')
          .select('id, cabang_id')
          .in('id', [...new Set(detailKons?.map(d => d.konsinyasi_id) || [])]);

        const detailKonsMap = new Map(detailKons?.map(d => [d.id, d]) || []);
        const transaksiKonsMap = new Map(transaksiKons?.map(t => [t.id, t]) || []);

        for (const kons of konsinyasiData) {
          const detail = detailKonsMap.get(kons.detail_konsinyasi_id);
          if (!detail) continue;

          const transaksi = transaksiKonsMap.get(detail.konsinyasi_id);
          if (!transaksi) continue;

          const { error } = await supabase
            .from('stock_barang')
            .insert({
              produk_id: detail.produk_id,
              cabang_id: transaksi.cabang_id,
              tanggal: kons.tanggal_jual,
              jumlah: kons.jumlah_terjual,
              tipe: 'keluar',
              keterangan: `Konsinyasi - ${kons.id}`,
              hpp: 0,
              harga_jual: 0,
              persentase: 0,
            });

          if (error) {
            insertResults.errors.push({ type: 'konsinyasi', error: error.message });
          } else {
            insertResults.konsinyasi++;
          }
        }
      }

      // 6. Insert Stock Opname
      const { data: opnameData } = await supabase
        .from('stock_opname')
        .select('id, tanggal, produk_id, cabang_id, selisih')
        .eq('status', 'approved');

      for (const opname of opnameData || []) {
        const selisih = parseFloat(opname.selisih.toString());
        if (Math.abs(selisih) < 0.01) continue;

        const { error } = await supabase
          .from('stock_barang')
          .insert({
            produk_id: opname.produk_id,
            cabang_id: opname.cabang_id,
            tanggal: opname.tanggal,
            jumlah: Math.abs(selisih),
            tipe: selisih > 0 ? 'masuk' : 'keluar',
            keterangan: `Stock Opname - ${opname.id}`,
            hpp: 0,
            harga_jual: 0,
            persentase: 0,
          });

        if (error) {
          insertResults.errors.push({ type: 'opname', error: error.message });
        } else {
          insertResults.opname++;
        }
      }

      console.log('✅ Rebuild completed:', insertResults);

      // Recalculate final stock
      const { data: movements } = await supabase
        .from('stock_barang')
        .select('produk_id, jumlah, tipe')
        .order('produk_id', { ascending: true })
        .order('tanggal', { ascending: true });

      const stockByProduk = new Map<number, number>();

      movements?.forEach((m: any) => {
        const current = stockByProduk.get(m.produk_id) || 0;
        const jumlah = parseFloat(m.jumlah.toString());
        
        if (m.tipe === 'masuk') {
          stockByProduk.set(m.produk_id, current + jumlah);
        } else {
          stockByProduk.set(m.produk_id, current - jumlah);
        }
      });

      // Update produk table
      for (const [produkId, stock] of stockByProduk.entries()) {
        await supabase
          .from('produk')
          .update({ stok: stock })
          .eq('id', produkId);
      }

      // Get final result
      const { data: finalProduk } = await supabase
        .from('produk')
        .select('id, nama_produk, kode_produk, stok')
        .in('id', Array.from(stockByProduk.keys()));

      summary.final_products = finalProduk || [];

      return NextResponse.json({
        success: true,
        message: 'Stock reset & rebuild completed',
        summary,
        insert_results: insertResults,
      });
    }

    // Check mode only
    return NextResponse.json({
      success: true,
      message: 'Check completed - use mode:"reset" to rebuild',
      summary,
    });
  } catch (error: any) {
    console.error('❌ Error in reset & rebuild:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}