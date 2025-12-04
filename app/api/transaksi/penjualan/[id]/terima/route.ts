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
    const body = await request.json();

    console.log('✅ Konfirmasi penerimaan:', id, body);

    // ✅ Step 1: Get penjualan data dengan detail
    const { data: penjualan, error: getPenjualanError } = await supabase
      .from('transaksi_penjualan')
      .select(`
        *,
        detail_penjualan (
          id,
          produk_id,
          jumlah,
          harga,
          subtotal
        )
      `)
      .eq('id', id)
      .single();

    if (getPenjualanError) throw getPenjualanError;
    if (!penjualan) throw new Error('Penjualan tidak ditemukan');

    console.log('📦 Penjualan data:', penjualan);

    // Check if already confirmed
    if (penjualan.status_diterima === 'Diterima') {
      return NextResponse.json({
        error: 'Penjualan sudah dikonfirmasi sebelumnya'
      }, { status: 400 });
    }

    const details = penjualan.detail_penjualan || [];

    if (details.length === 0) {
      return NextResponse.json({
        error: 'Tidak ada detail penjualan'
      }, { status: 400 });
    }

    // ✅ Step 2: Validasi stock SEMUA produk DULU
    console.log('🔍 Validating stock for', details.length, 'items...');
    
    for (const detail of details) {
      if (!detail.produk_id) continue;

      const { data: produk, error: produkError } = await supabase
        .from('produk')
        .select('id, nama_produk, stok')
        .eq('id', detail.produk_id)
        .single();

      if (produkError || !produk) {
        throw new Error(`❌ Produk ID ${detail.produk_id} tidak ditemukan`);
      }

      const currentStok = parseFloat(produk.stok?.toString() || '0');
      const needed = parseFloat(detail.jumlah?.toString() || '0');

      console.log(`  - ${produk.nama_produk}: stock=${currentStok}, needed=${needed}`);

      if (currentStok < needed) {
        throw new Error(
          `❌ Stock ${produk.nama_produk} tidak mencukupi!\n` +
          `Tersedia: ${currentStok} | Dibutuhkan: ${needed}`
        );
      }
    }

    console.log('✅ Stock validation passed');

    // ✅ Step 3: Update status_diterima
    const { error: updateError } = await supabase
      .from('transaksi_penjualan')
      .update({
        status_diterima: 'Diterima',
        tanggal_diterima: body.tanggal_diterima,
        diterima_oleh: body.diterima_oleh,
        catatan_penerimaan: body.catatan || null,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    console.log('✅ Status diterima updated');

    // ✅ Step 4: Kurangi stock produk
    for (const detail of details) {
      if (!detail.produk_id) continue;

      // Get current stock
      const { data: produk, error: getProdukError } = await supabase
        .from('produk')
        .select('stok, nama_produk')
        .eq('id', detail.produk_id)
        .single();

      if (getProdukError) throw getProdukError;

      const currentStok = parseFloat(produk.stok?.toString() || '0');
      const jumlahKeluar = parseFloat(detail.jumlah?.toString() || '0');
      const newStok = currentStok - jumlahKeluar;

      console.log(`  📉 ${produk.nama_produk}: ${currentStok} - ${jumlahKeluar} = ${newStok}`);

      // Update stock produk
      const { error: updateStokError } = await supabase
        .from('produk')
        .update({ 
          stok: newStok,
          updated_at: new Date().toISOString()
        })
        .eq('id', detail.produk_id);

      if (updateStokError) {
        console.error('❌ Failed to update stock for produk:', detail.produk_id);
        throw updateStokError;
      }

      // ✅ Check for duplicate before insert
      const { data: existingRecord } = await supabase
        .from('stock_barang')
        .select('id')
        .eq('produk_id', detail.produk_id)
        .eq('cabang_id', penjualan.cabang_id)
        .eq('tanggal', body.tanggal_diterima)
        .eq('tipe', 'keluar')
        .eq('keterangan', `Penjualan ID: ${id}`)
        .maybeSingle();

      if (existingRecord) {
        console.log('⏭️ Stock record already exists, skipping insert');
        continue;
      }

      // ✅ Insert history ke stock_barang
      const { error: historyError } = await supabase
        .from('stock_barang')
        .insert({
          produk_id: detail.produk_id,
          cabang_id: penjualan.cabang_id,
          jumlah: jumlahKeluar,
          tanggal: body.tanggal_diterima,
          tipe: 'keluar',
          keterangan: `Penjualan ID: ${id}`,
          hpp: parseFloat(detail.harga?.toString() || '0')
        });

      if (historyError) {
        console.error('⚠️ Warning: Failed to record stock history:', historyError);
        // Don't throw, continue process
      }
    }

    console.log('✅ All stock reduced successfully');

    return NextResponse.json({
      success: true,
      message: 'Penerimaan barang berhasil dikonfirmasi dan stock telah dikurangi',
      data: {
        penjualan_id: id,
        items_processed: details.length,
        tanggal_diterima: body.tanggal_diterima
      }
    });
  } catch (error: any) {
    console.error('❌ Error:', error);
    
    // Attempt rollback status if possible
    try {
      const supabase = await supabaseServer();
      const { id } = await context.params;
      
      await supabase
        .from('transaksi_penjualan')
        .update({ 
          status_diterima: 'Belum Diterima',
          tanggal_diterima: null,
          diterima_oleh: null,
          catatan_penerimaan: null
        })
        .eq('id', id);
      
      console.log('🔄 Status rolled back');
    } catch (rollbackError) {
      console.error('⚠️ Failed to rollback:', rollbackError);
    }

    return NextResponse.json({ 
      error: error.message || 'Terjadi kesalahan saat konfirmasi'
    }, { status: 500 });
  }
}