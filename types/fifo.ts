// types/fifo.ts

export interface StockMovementFIFO {
  id: number;
  produk_id: number;
  cabang_id: number;
  tanggal: string;
  tipe: 'masuk' | 'keluar';
  jumlah_awal: number;
  jumlah_sisa: number;
  hpp_per_unit: number;
  referensi_type?: 'pembelian' | 'penjualan' | 'produksi' | 'adjustment';
  referensi_id?: number;
  batch_masuk_id?: number;
  keterangan?: string;
  created_at: string;
  produk?: {
    nama_produk: string;
    kode_produk: string;
  };
  cabang?: {
    nama_cabang: string;
  };
}

export interface StockSummary {
  produk_id: number;
  cabang_id: number;
  nama_produk: string;
  kode_produk: string;
  nama_cabang: string;
  total_stock: number;
  nilai_stock: number;
  hpp_rata_rata: number;
}

export interface FIFOCalculationResult {
  hpp_total: number;
  hpp_per_unit: number;
  batches_used: Array<{
    batch_id: number;
    jumlah_diambil: number;
    hpp_per_unit: number;
    subtotal: number;
  }>;
}