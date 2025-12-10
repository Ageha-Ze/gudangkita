'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';

// POST - Stock Masuk (dari pembelian atau produksi)
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const body = await request.json();

    const {
      produk_id,
      cabang_id,
      tanggal,
      jumlah,
      hpp_per_unit,
      referensi_type, // 'pembelian', 'produksi', 'adjustment'
      referensi_id,
      keterangan,
    } = body;

    // Validasi
    if (!produk_id || !cabang_id || !jumlah || !hpp_per_unit) {
      return NextResponse.json(
        { error: 'Field wajib tidak lengkap' },
        { status: 400 }
      );
    }

    // Insert batch stock masuk ke stock_movement_fifo
    const { data: stockData, error: stockError } = await supabase
      .from('stock_movement_fifo')
      .insert({
        produk_id: Number(produk_id),
        cabang_id: Number(cabang_id),
        tanggal: tanggal || new Date().toISOString().split('T')[0],
        tipe: 'masuk',
        jumlah_awal: Number(jumlah),
        jumlah_sisa: Number(jumlah), // Awalnya sisa = jumlah awal
        hpp_per_unit: Number(hpp_per_unit),
        referensi_type: referensi_type || null,
        referensi_id: referensi_id ? Number(referensi_id) : null,
        keterangan: keterangan || `Stock masuk ${jumlah} unit @ Rp ${hpp_per_unit}`,
      })
      .select()
      .single();

    if (stockError) throw stockError;

    // OPTIONAL: Update stock di tabel produk juga (untuk kompatibilitas)
    const { data: currentProduk } = await supabase
      .from('produk')
      .select('stok, hpp')
      .eq('id', produk_id)
      .single();

    if (currentProduk) {
      const stokBaru = Number(currentProduk.stok || 0) + Number(jumlah);
      
      await supabase
        .from('produk')
        .update({ 
          stok: stokBaru,
          hpp: hpp_per_unit // Update HPP terbaru
        })
        .eq('id', produk_id);
    }

    // OPTIONAL: Insert ke stock_barang untuk backward compatibility
    await supabase.from('stock_barang').insert({
      produk_id: Number(produk_id),
      cabang_id: Number(cabang_id),
      jumlah: Number(jumlah),
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      tipe: 'masuk',
      hpp: Number(hpp_per_unit),
      keterangan: keterangan || 'Stock masuk via FIFO',
    });

    return NextResponse.json({
      message: 'Stock masuk berhasil dicatat',
      data: stockData,
    });
  } catch (error: any) {
    console.error('Error stock masuk:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
