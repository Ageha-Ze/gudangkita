'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';
import { applyFIFO } from '@/lib/fifo/calculateFIFO';

// POST - Stock Keluar dengan FIFO calculation
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const body = await request.json();

    const {
      produk_id,
      cabang_id,
      tanggal,
      jumlah,
      referensi_type, // 'penjualan'
      referensi_id,
      keterangan,
    } = body;

    // Validasi
    if (!produk_id || !cabang_id || !jumlah) {
      return NextResponse.json(
        { error: 'Field wajib tidak lengkap' },
        { status: 400 }
      );
    }

    if (jumlah <= 0) {
      return NextResponse.json(
        { error: 'Jumlah harus lebih dari 0' },
        { status: 400 }
      );
    }

    // Apply FIFO calculation dan update database
    const fifoResult = await applyFIFO(
      supabase,
      Number(produk_id),
      Number(cabang_id),
      Number(jumlah),
      referensi_type || 'penjualan',
      referensi_id ? Number(referensi_id) : 0,
      tanggal || new Date().toISOString().split('T')[0],
      keterangan
    );

    // Update stock di tabel produk (untuk kompatibilitas)
    const { data: currentProduk } = await supabase
      .from('produk')
      .select('stok')
      .eq('id', produk_id)
      .single();

    if (currentProduk) {
      const stokBaru = Number(currentProduk.stok || 0) - Number(jumlah);
      
      await supabase
        .from('produk')
        .update({ stok: Math.max(0, stokBaru) })
        .eq('id', produk_id);
    }

    // Insert ke stock_barang untuk backward compatibility
    await supabase.from('stock_barang').insert({
      produk_id: Number(produk_id),
      cabang_id: Number(cabang_id),
      jumlah: Number(jumlah),
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      tipe: 'keluar',
      hpp: fifoResult.hpp_per_unit,
      keterangan: keterangan || `Stock keluar via FIFO - HPP: Rp ${fifoResult.hpp_per_unit.toLocaleString('id-ID')}`,
    });

    return NextResponse.json({
      message: 'Stock keluar berhasil dicatat dengan FIFO',
      data: {
        jumlah_keluar: jumlah,
        hpp_total: fifoResult.hpp_total,
        hpp_per_unit: fifoResult.hpp_per_unit,
        batches_used: fifoResult.batches_used.length,
        detail_batches: fifoResult.batches_used,
      },
    });
  } catch (error: any) {
    console.error('Error stock keluar FIFO:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
