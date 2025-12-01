// app/api/persediaan/stock-barang/adjust/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * POST - Adjust stock (set new stock value)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    const {
      produk_id,
      cabang_id,
      jumlah_baru,
      hpp,
      harga_jual,
      persentase_harga_jual,
      keterangan,
    } = body;

    // Validation
    if (!produk_id || !cabang_id || jumlah_baru === undefined) {
      return NextResponse.json(
        { success: false, error: 'produk_id, cabang_id, dan jumlah_baru wajib diisi' },
        { status: 400 }
      );
    }

    // Calculate current stock from movements
    const { data: movements, error: movementsError } = await supabase
      .from('stock_barang')
      .select('jumlah, tipe')
      .eq('produk_id', produk_id)
      .eq('cabang_id', cabang_id);

    if (movementsError) throw movementsError;

    let stockSekarang = 0;
    movements?.forEach(m => {
      const jumlah = parseFloat(m.jumlah.toString());
      if (m.tipe === 'masuk') {
        stockSekarang += jumlah;
      } else if (m.tipe === 'keluar') {
        stockSekarang -= jumlah;
      }
    });

    const stockBaru = parseFloat(jumlah_baru);
    const selisih = stockBaru - stockSekarang;

    console.log(`📊 Stock sekarang: ${stockSekarang}, Stock baru: ${stockBaru}, Selisih: ${selisih}`);

    // If there's a difference, create adjustment transaction
    if (Math.abs(selisih) > 0.001) {
      const { error: insertError } = await supabase
        .from('stock_barang')
        .insert({
          produk_id,
          cabang_id,
          tanggal: new Date().toISOString().split('T')[0],
          jumlah: Math.abs(selisih),
          tipe: selisih > 0 ? 'masuk' : 'keluar',
          keterangan: keterangan || `Penyesuaian stock: ${selisih > 0 ? '+' : ''}${selisih.toFixed(2)}`,
          hpp: parseFloat(hpp) || 0,
          harga_jual: parseFloat(harga_jual) || 0,
          persentase: parseFloat(persentase_harga_jual) || 0,
        });

      if (insertError) throw insertError;
    }

    // Calculate total stock across all branches
    const { data: allMovements, error: allError } = await supabase
      .from('stock_barang')
      .select('jumlah, tipe')
      .eq('produk_id', produk_id);

    if (allError) throw allError;

    let totalStock = 0;
    allMovements?.forEach(m => {
      const jumlah = parseFloat(m.jumlah.toString());
      if (m.tipe === 'masuk') {
        totalStock += jumlah;
      } else if (m.tipe === 'keluar') {
        totalStock -= jumlah;
      }
    });

    // Update produk.stok
    const { error: updateError } = await supabase
      .from('produk')
      .update({ stok: totalStock })
      .eq('id', produk_id);

    if (updateError) throw updateError;

    // Get produk & cabang names
    const { data: produk } = await supabase
      .from('produk')
      .select('nama_produk')
      .eq('id', produk_id)
      .single();

    const { data: cabang } = await supabase
      .from('cabang')
      .select('nama_cabang')
      .eq('id', cabang_id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Stock berhasil disesuaikan',
      data: {
        produk: produk?.nama_produk,
        cabang: cabang?.nama_cabang,
        stock_lama: stockSekarang,
        stock_baru: stockBaru,
        selisih: selisih,
        total_stock_produk: totalStock,
      },
    });
  } catch (error: any) {
    console.error('❌ Error adjusting stock:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}