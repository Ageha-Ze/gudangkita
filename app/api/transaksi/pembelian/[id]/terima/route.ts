// app/api/transaksi/pembelian/[id]/terima/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pembelian_id } = await context.params;
    const supabase = await supabaseServer();

    console.log('📦 Processing terima barang for pembelian:', pembelian_id);

    // ✅ Get pembelian data
    const { data: pembelian, error: pembelianError } = await supabase
      .from('transaksi_pembelian')
      .select(`
        *,
        cabang:cabang_id (
          id,
          nama_cabang
        ),
        detail_pembelian (
          id,
          produk_id,
          jumlah,
          harga,
          subtotal
        )
      `)
      .eq('id', parseInt(pembelian_id))
      .single();

    if (pembelianError) throw pembelianError;
    if (!pembelian) {
      return NextResponse.json(
        { error: 'Pembelian tidak ditemukan' },
        { status: 404 }
      );
    }

    // ✅ Validation: Must be billed first
    if (pembelian.status !== 'billed') {
      return NextResponse.json(
        { error: 'Pembelian harus di-billing terlebih dahulu' },
        { status: 400 }
      );
    }

    // ✅ Validation: Already received?
    if (pembelian.status_barang === 'Diterima') {
      console.log('⚠️ Barang already received, skipping...');
      return NextResponse.json({
        error: 'Barang sudah diterima sebelumnya'
      }, { status: 400 });
    }

    const detail_pembelian = pembelian.detail_pembelian || [];

    if (detail_pembelian.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada detail pembelian' },
        { status: 400 }
      );
    }

    const cabangId = pembelian.cabang_id || pembelian.cabang?.id;

    if (!cabangId) {
      return NextResponse.json(
        { error: 'Pembelian tidak memiliki cabang_id' },
        { status: 400 }
      );
    }

    // ✅ Update status FIRST (prevent race condition)
    const { error: updateStatusError } = await supabase
      .from('transaksi_pembelian')
      .update({
        status_barang: 'Diterima',
        updated_at: new Date().toISOString()
      })
      .eq('id', parseInt(pembelian_id));

    if (updateStatusError) throw updateStatusError;

    console.log('✅ Status updated to Diterima');

    // ✅ CRITICAL: Check if stock already recorded (prevent duplicate)
    const { data: stockCheck } = await supabase
      .from('stock_barang')
      .select('id')
      .eq('keterangan', `Pembelian #${pembelian_id}`)
      .limit(1);

    const stockAlreadyRecorded = stockCheck && stockCheck.length > 0;

    if (stockAlreadyRecorded) {
      console.log('⚠️ Stock already recorded, skipping insert');
      return NextResponse.json({
        success: true,
        message: 'Barang sudah diterima sebelumnya',
        details_count: detail_pembelian.length
      });
    }

    // ✅ Loop & insert stock
    for (const item of detail_pembelian) {
      if (!item) continue;

      const jumlahMasuk = Number(item.jumlah);
      const hpp = Number(item.harga);

      console.log(`  📦 Processing: Produk ${item.produk_id}, Qty: ${jumlahMasuk}`);

      // Get current stock
      const { data: produkData, error: produkGetError } = await supabase
        .from('produk')
        .select('stok, nama_produk')
        .eq('id', item.produk_id)
        .single();

      if (produkGetError) {
        console.error('Error getting produk:', produkGetError);
        continue;
      }

      const currentStok = Number(produkData?.stok || 0);
      const newStok = currentStok + jumlahMasuk;

      // ✅ Insert to stock_barang (history)
      const { error: stockInsertError } = await supabase
        .from('stock_barang')
        .insert({
          produk_id: item.produk_id,
          cabang_id: cabangId,
          jumlah: jumlahMasuk,
          tanggal: pembelian.tanggal,
          tipe: 'masuk',
          hpp: hpp,
          harga_jual: 0,
          persentase: 0,
          keterangan: `Pembelian #${pembelian_id}`
        });

      if (stockInsertError) {
        console.error('Error inserting stock_barang:', stockInsertError);
        throw stockInsertError;
      }

      // ✅ Update produk stock
      const { error: produkUpdateError } = await supabase
        .from('produk')
        .update({
          stok: newStok,
          hpp: hpp,
          harga: hpp,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.produk_id);

      if (produkUpdateError) {
        console.error('Error updating produk stock:', produkUpdateError);
        throw produkUpdateError;
      }

      console.log(`    ✅ ${produkData.nama_produk}: ${currentStok} + ${jumlahMasuk} = ${newStok}`);
    }

    console.log('✅ All stock recorded successfully!');

    return NextResponse.json({
      success: true,
      message: 'Barang berhasil diterima & stock diperbarui',
      details_count: detail_pembelian.length
    });

  } catch (error: any) {
    console.error('❌ Error processing terima barang:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
