// app/api/persediaan/stock-barang/update-harga/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * POST - Update harga (HPP & Harga Jual)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    const { produk_id, cabang_id, hpp, harga_jual, persentase } = body;

    // Validation
    if (!produk_id || !hpp || !harga_jual) {
      return NextResponse.json(
        { success: false, error: 'produk_id, hpp, dan harga_jual wajib diisi' },
        { status: 400 }
      );
    }

    // Update produk table
    const { error: produkError } = await supabase
      .from('produk')
      .update({
        hpp: hpp,
        harga: harga_jual,
      })
      .eq('id', produk_id);

    if (produkError) throw produkError;

    // Update stock_barang records
    let updateQuery = supabase
      .from('stock_barang')
      .update({
        hpp: hpp,
        harga_jual: harga_jual,
        persentase: persentase,
      })
      .eq('produk_id', produk_id);

    // If cabang_id = 0, update all branches
    // If cabang_id != 0, update specific branch only
    if (cabang_id !== 0) {
      updateQuery = updateQuery.eq('cabang_id', cabang_id);
    }

    const { error: stockError, count } = await updateQuery;

    if (stockError) throw stockError;

    // If no records found and cabang_id is specific, create initial record
    if ((count === 0 || count === null) && cabang_id !== 0) {
      const { error: insertError } = await supabase
        .from('stock_barang')
        .insert({
          produk_id: produk_id,
          cabang_id: cabang_id,
          jumlah: 0,
          tanggal: new Date().toISOString().split('T')[0],
          tipe: 'masuk',
          keterangan: 'Inisialisasi harga produk',
          hpp: hpp,
          harga_jual: harga_jual,
          persentase: persentase,
        });

      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: `Harga berhasil diupdate untuk ${count || 1} record`,
    });
  } catch (error: any) {
    console.error('❌ Error updating harga:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}