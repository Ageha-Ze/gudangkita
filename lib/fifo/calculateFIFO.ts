// lib/fifo/calculateFIFO.ts
import { SupabaseClient } from '@supabase/supabase-js';

interface FIFOBatch {
  id: number;
  jumlah_sisa: number;
  hpp_per_unit: number;
  tanggal: string;
}

interface FIFOResult {
  hpp_total: number;
  hpp_per_unit: number;
  batches_used: Array<{
    batch_id: number;
    jumlah_diambil: number;
    hpp_per_unit: number;
    subtotal: number;
    jumlah_sisa_baru: number;
  }>;
}

/**
 * Calculate HPP menggunakan metode FIFO
 * @param supabase - Supabase client
 * @param produkId - ID produk
 * @param cabangId - ID cabang
 * @param jumlahKeluar - Jumlah yang akan keluar
 * @returns FIFOResult dengan detail batch yang digunakan
 */
export async function calculateFIFO(
  supabase: SupabaseClient,
  produkId: number,
  cabangId: number,
  jumlahKeluar: number
): Promise<FIFOResult> {
  // 1. Ambil batch stock masuk yang masih ada sisa (FIFO - oldest first)
  const { data: batches, error } = await supabase
    .from('stock_movement_fifo')
    .select('id, jumlah_sisa, hpp_per_unit, tanggal')
    .eq('produk_id', produkId)
    .eq('cabang_id', cabangId)
    .eq('tipe', 'masuk')
    .gt('jumlah_sisa', 0)
    .order('tanggal', { ascending: true }) // FIFO: ambil yang paling lama dulu
    .order('id', { ascending: true }); // Jika tanggal sama, ambil yang ID lebih kecil

  if (error) {
    throw new Error(`Error fetching FIFO batches: ${error.message}`);
  }

  if (!batches || batches.length === 0) {
    throw new Error('Stock tidak mencukupi atau tidak ada batch stock masuk');
  }

  // 2. Hitung total stock available
  const totalAvailable = batches.reduce((sum, b) => sum + Number(b.jumlah_sisa), 0);

  if (totalAvailable < jumlahKeluar) {
    throw new Error(
      `Stock tidak mencukupi. Available: ${totalAvailable}, Required: ${jumlahKeluar}`
    );
  }

  // 3. Alokasikan stock keluar ke batch-batch (FIFO)
  let sisaKeluar = jumlahKeluar;
  let totalHPP = 0;
  const batchesUsed: FIFOResult['batches_used'] = [];

  for (const batch of batches) {
    if (sisaKeluar <= 0) break;

    const jumlahSisa = Number(batch.jumlah_sisa);
    const hppPerUnit = Number(batch.hpp_per_unit);

    // Ambil sebanyak mungkin dari batch ini
    const jumlahDiambil = Math.min(sisaKeluar, jumlahSisa);
    const subtotal = jumlahDiambil * hppPerUnit;

    totalHPP += subtotal;
    sisaKeluar -= jumlahDiambil;

    batchesUsed.push({
      batch_id: batch.id,
      jumlah_diambil: jumlahDiambil,
      hpp_per_unit: hppPerUnit,
      subtotal: subtotal,
      jumlah_sisa_baru: jumlahSisa - jumlahDiambil,
    });
  }

  return {
    hpp_total: totalHPP,
    hpp_per_unit: jumlahKeluar > 0 ? totalHPP / jumlahKeluar : 0,
    batches_used: batchesUsed,
  };
}

/**
 * Apply FIFO calculation dan update database
 */
export async function applyFIFO(
  supabase: SupabaseClient,
  produkId: number,
  cabangId: number,
  jumlahKeluar: number,
  referensiType: string,
  referensiId: number,
  tanggal: string,
  keterangan?: string
): Promise<FIFOResult> {
  // 1. Calculate FIFO
  const fifoResult = await calculateFIFO(supabase, produkId, cabangId, jumlahKeluar);

  // 2. Update jumlah_sisa di batch-batch yang digunakan
  for (const batch of fifoResult.batches_used) {
    const { error: updateError } = await supabase
      .from('stock_movement_fifo')
      .update({
        jumlah_sisa: batch.jumlah_sisa_baru,
      })
      .eq('id', batch.batch_id);

    if (updateError) {
      throw new Error(`Error updating batch ${batch.batch_id}: ${updateError.message}`);
    }

    // 3. Insert record stock keluar untuk history
    const { error: insertError } = await supabase
      .from('stock_movement_fifo')
      .insert({
        produk_id: produkId,
        cabang_id: cabangId,
        tanggal: tanggal,
        tipe: 'keluar',
        jumlah_awal: batch.jumlah_diambil,
        jumlah_sisa: 0, // Stock keluar tidak punya sisa
        hpp_per_unit: batch.hpp_per_unit,
        referensi_type: referensiType,
        referensi_id: referensiId,
        batch_masuk_id: batch.batch_id,
        keterangan: keterangan || `Penjualan ${batch.jumlah_diambil} unit @ Rp ${batch.hpp_per_unit}`,
      });

    if (insertError) {
      throw new Error(`Error inserting stock keluar: ${insertError.message}`);
    }
  }

  return fifoResult;
}