import { Penjualan, DetailPenjualan } from '@/types/transaksi';

export interface PenjualanTotals {
  subtotal: number;
  finalTotal: number;
  tagihan: number;
}

export interface CalculatePenjualanOptions {
  totalCicilan?: number;
}

export function calculatePenjualanTotals(
  penjualan: Penjualan,
  options?: CalculatePenjualanOptions
): PenjualanTotals {
  // derive subtotal from detail_penjualan (source of truth)
  const subtotal = (penjualan.detail_penjualan || []).reduce((acc: number, item: DetailPenjualan) => {
    return acc + Number(item.subtotal || 0);
  }, 0);

  const biayaOngkir = Number(penjualan.biaya_ongkir || 0);
  const biayaPotong = Number(penjualan.biaya_potong || 0);
  const nilaiDiskon = Number(penjualan.nilai_diskon || 0);
  const uangMuka = Number(penjualan.uang_muka || 0);
  const totalCicilan = Number(options?.totalCicilan || 0);

  const finalTotal = subtotal + biayaOngkir + biayaPotong - nilaiDiskon;
  
  // ✅ Tagihan = finalTotal - uangMuka - totalCicilan
  const tagihan = finalTotal - uangMuka - totalCicilan;

  return {
    subtotal,
    finalTotal,
    tagihan: Math.max(0, tagihan), // Pastikan tidak negatif
  };
}

export default calculatePenjualanTotals;