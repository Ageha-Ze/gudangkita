// app/api/transaksi/pembelian/[id]/terima/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    console.log('Processing terima barang for pembelian_id:', id);

    // ============================================
    // 1. Ambil detail pembelian
    // ============================================
    const { data: details, error: detailsError } = await supabase
      .from('detail_pembelian')
      .select('produk_id, jumlah, harga') // harga = harga beli
      .eq('pembelian_id', id);

    if (detailsError) throw detailsError;

    if (!details || details.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada detail pembelian' },
        { status: 400 }
      );
    }

    // ============================================
    // 2. Ambil tanggal & cabang dari transaksi pembelian
    // ============================================
    const { data: pembelian, error: pembelianError } = await supabase
      .from('transaksi_pembelian')
      .select('tanggal, cabang_id')
      .eq('id', id)
      .single();

    if (pembelianError) throw pembelianError;

    const tanggal = pembelian?.tanggal || new Date().toISOString().split('T')[0];
    const cabangId = pembelian?.cabang_id;

    if (!cabangId) {
      return NextResponse.json(
        { error: 'Pembelian tidak memiliki cabang_id' },
        { status: 400 }
      );
    }

    // ============================================
    // 3. Loop tiap detail -> insert ke stock_barang + update stok produk
    // ============================================
    for (const detail of details) {

      const jumlahMasuk = Number(detail.jumlah);
      const hargaBeli = Number(detail.harga);

      // --------------------------
      // Hitung HPP otomatis
      // --------------------------
      const hpp = hargaBeli; // karena harga di detail = harga pembelian per item

      // Insert ke stock_barang
      const { error: insertError } = await supabase
        .from('stock_barang')
        .insert({
          produk_id: detail.produk_id,
          cabang_id: cabangId,
          jumlah: jumlahMasuk,
          tanggal: tanggal,
          tipe: 'masuk',
          hpp: hpp,
          persentase: null,       // biarkan user isi manual kalau mau
          harga_jual: null,       // optional
          keterangan: `Pembelian barang ID: ${id}`
        });

      if (insertError) throw insertError;

      // ============================================
      // Update stok di tabel produk
      // ============================================
      const { data: produk, error: produkError } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', detail.produk_id)
        .single();

      if (produkError) throw produkError;

      const newStok = Number(produk.stok) + jumlahMasuk;

      const { error: updateProdukError } = await supabase
        .from('produk')
        .update({
          stok: newStok,
          hpp: hpp              // update HPP terbaru
        })
        .eq('id', detail.produk_id);

      if (updateProdukError) throw updateProdukError;

      console.log(`Produk ${detail.produk_id} stok updated: ${produk.stok} -> ${newStok}`);
    }

    // ============================================
    // 4. Update status transaksi pembelian
    // ============================================
    const { error: updateError } = await supabase
      .from('transaksi_pembelian')
      .update({ status_barang: 'Diterima' })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({
      message: 'Barang berhasil diterima & stok diperbarui',
      details_count: details.length
    });

  } catch (error: any) {
    console.error('Error processing terima barang:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
