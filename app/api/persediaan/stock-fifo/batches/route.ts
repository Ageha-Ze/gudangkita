'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - Detail Batch yang masih ada (untuk FIFO preview)
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    
    const produkId = searchParams.get('produk_id');
    const cabangId = searchParams.get('cabang_id');

    if (!produkId || !cabangId) {
      return NextResponse.json(
        { error: 'produk_id dan cabang_id wajib diisi' },
        { status: 400 }
      );
    }

    // Ambil batch stock masuk yang masih ada sisa (sorted by FIFO)
    const { data: batches, error } = await supabase
      .from('stock_movement_fifo')
      .select(`
        id,
        tanggal,
        jumlah_awal,
        jumlah_sisa,
        hpp_per_unit,
        referensi_type,
        referensi_id,
        keterangan,
        produk:produk_id (
          nama_produk,
          kode_produk
        )
      `)
      .eq('produk_id', produkId)
      .eq('cabang_id', cabangId)
      .eq('tipe', 'masuk')
      .gt('jumlah_sisa', 0)
      .order('tanggal', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    // Calculate summary
    const totalStock = (batches || []).reduce((sum, b) => sum + Number(b.jumlah_sisa), 0);
    const totalNilai = (batches || []).reduce(
      (sum, b) => sum + (Number(b.jumlah_sisa) * Number(b.hpp_per_unit)),
      0
    );
    const hppRataRata = totalStock > 0 ? totalNilai / totalStock : 0;

    // Tambahkan info umur batch (dalam hari)
    const today = new Date();
    const batchesWithAge = (batches || []).map(batch => {
      const batchDate = new Date(batch.tanggal);
      const ageInDays = Math.floor((today.getTime() - batchDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...batch,
        umur_hari: ageInDays,
        nilai_batch: Number(batch.jumlah_sisa) * Number(batch.hpp_per_unit),
      };
    });

    return NextResponse.json({
      data: batchesWithAge,
      summary: {
        total_batches: batchesWithAge.length,
        total_stock: totalStock,
        total_nilai: totalNilai,
        hpp_rata_rata: hppRataRata,
        batch_tertua: batchesWithAge.length > 0 ? batchesWithAge[0] : null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}