import { TransaksiPembelianWithRelations, DetailPembelianWithProduk } from '@/types/transaksi';

export interface PembelianTotals {
  subtotal: number;
  finalTotal: number;
  tagihan: number;
}

export function calculatePembelianTotals(pembelian: TransaksiPembelianWithRelations | any): PembelianTotals {
  // derive subtotal from detail_pembelian (source of truth)
  const subtotal = (pembelian?.detail_pembelian || []).reduce((acc: number, item: DetailPembelianWithProduk | any) => {
    // prefer explicit subtotal if provided, otherwise compute from jumlah * harga
    if (typeof item.subtotal === 'number') return acc + Number(item.subtotal || 0);
    return acc + (Number(item.jumlah || 0) * Number(item.harga || 0));
  }, 0);

  const biayaKirim = Number(pembelian?.biaya_kirim || 0);
  const uangMuka = Number(pembelian?.uang_muka || 0);

  const finalTotal = subtotal + biayaKirim;
  const tagihan = finalTotal - uangMuka; // note: callers may subtract additional paid amounts (cicilan)

  return {
    subtotal,
    finalTotal,
    tagihan,
  };
}

export default calculatePembelianTotals;
