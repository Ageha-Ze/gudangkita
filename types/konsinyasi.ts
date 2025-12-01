// types/konsinyasi.ts

export interface TokoKonsinyasi {
  id: number;
  kode_toko: string;
  nama_toko: string;
  pemilik?: string;
  alamat?: string;
  no_telp?: string;
  email?: string;
  cabang_id?: number;
  status: 'Aktif' | 'Nonaktif';
  tanggal_kerjasama?: string;
  keterangan?: string;
  created_at: string;
  updated_at: string;
  cabang?: {
    id: number;
    nama_cabang: string;
  };
}

export interface TransaksiKonsinyasi {
  id: number;
  kode_konsinyasi: string;
  tanggal_titip: string;
  toko_id: number;
  cabang_id: number;
  pegawai_id?: number;
  total_nilai_titip: number;
  status: 'Aktif' | 'Selesai' | 'Dibatalkan';
  keterangan?: string;
  created_at: string;
  updated_at: string;
  toko?: TokoKonsinyasi;
  cabang?: {
    id: number;
    nama_cabang: string;
  };
  pegawai?: {
    id: number;
    nama: string;
  };
  detail_konsinyasi?: DetailKonsinyasi[];
}

export interface DetailKonsinyasi {
  id: number;
  konsinyasi_id: number;
  produk_id: number;
  jumlah_titip: number;
  jumlah_terjual: number;
  jumlah_sisa: number;
  jumlah_kembali: number;
  harga_konsinyasi: number;
  harga_jual_toko: number;
  subtotal_nilai_titip: number;
  keuntungan_toko: number;
  created_at: string;
  produk?: {
    id: number;
    nama_produk: string;
    kode_produk: string;
    satuan: string;
  };
}

export interface PenjualanKonsinyasi {
  id: number;
  detail_konsinyasi_id: number;
  tanggal_jual: string;
  jumlah_terjual: number;
  harga_jual_toko: number;
  total_penjualan: number;
  total_nilai_kita: number;
  keuntungan_toko: number;
  kas_id?: number;
  status_pembayaran: 'Belum Dibayar' | 'Sudah Dibayar';
  tanggal_pembayaran?: string;
  keterangan?: string;
  created_at: string;
  detail_konsinyasi?: DetailKonsinyasi;
  kas?: {
    id: number;
    nama_kas: string;
  };
}

export interface ReturKonsinyasi {
  id: number;
  detail_konsinyasi_id: number;
  tanggal_retur: string;
  jumlah_retur: number;
  kondisi?: 'Baik' | 'Rusak';
  keterangan?: string;
  created_at: string;
  detail_konsinyasi?: DetailKonsinyasi;
}

// Input types for forms
export interface TokoKonsinyasiInput {
  kode_toko: string;
  nama_toko: string;
  pemilik?: string;
  alamat?: string;
  no_telp?: string;
  email?: string;
  cabang_id?: number;
  status?: 'Aktif' | 'Nonaktif';
  tanggal_kerjasama?: string;
  keterangan?: string;
}

export interface TransaksiKonsinyasiInput {
  tanggal_titip: string;
  toko_id: number;
  cabang_id: number;
  pegawai_id?: number;
  keterangan?: string;
  detail: DetailKonsinyasiInput[];
}

export interface DetailKonsinyasiInput {
  produk_id: number;
  jumlah_titip: number;
  harga_konsinyasi: number;
  harga_jual_toko: number;
}

export interface PenjualanKonsinyasiInput {
  detail_konsinyasi_id: number;
  tanggal_jual: string;
  jumlah_terjual: number;
  harga_jual_toko: number;
  kas_id?: number;
  status_pembayaran?: 'Belum Dibayar' | 'Sudah Dibayar';
  tanggal_pembayaran?: string;
  keterangan?: string;
}

export interface ReturKonsinyasiInput {
  detail_konsinyasi_id: number;
  tanggal_retur: string;
  jumlah_retur: number;
  kondisi?: 'Baik' | 'Rusak';
  keterangan?: string;
}

// Summary/Report types
export interface KonsinyasiSummary {
  toko_id: number;
  nama_toko: string;
  total_nilai_titip: number;
  total_terjual: number;
  total_nilai_terjual: number;
  total_keuntungan_toko: number;
  total_sisa: number;
  total_nilai_sisa: number;
  total_kembali: number;
  jumlah_transaksi: number;
}

export interface ProdukKonsinyasiSummary {
  produk_id: number;
  nama_produk: string;
  total_titip: number;
  total_terjual: number;
  total_sisa: number;
  total_kembali: number;
  total_nilai_titip: number;
  total_nilai_terjual: number;
  persentase_terjual: number;
}