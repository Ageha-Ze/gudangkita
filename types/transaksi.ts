// types/transaksi.ts
import { BaseEntity } from './global';

// Transaksi Pembelian
export interface TransaksiPembelian extends BaseEntity {
  tanggal: string;
  suplier_id: number;
  cabang_id?: number;
  nota_supplier: string;
  total: number;
  biaya_kirim?: number;
  uang_muka?: number;
  jenis_pembayaran: 'cash' | 'transfer';
  status: 'pending' | 'billed' | 'diterima' | 'cicil' | 'lunas' | 'batal';
  status_barang: 'Belum Diterima' | 'Diterima' | 'Sebagian';
  status_pembayaran: 'Belum Lunas' | 'Lunas' | 'Cicil';
  keterangan?: string;
}

export interface TransaksiPembelianInsert {
  tanggal: string;
  suplier_id: number;
  cabang_id?: number;
  nota_supplier?: string;
  total?: number;
  biaya_kirim?: number;
  uang_muka?: number;
  jenis_pembayaran: 'cash' | 'transfer';
  status?: string;
  status_barang?: string;
  status_pembayaran?: string;
  keterangan?: string;
}

export type TransaksiPembelianUpdate = Partial<TransaksiPembelianInsert>;

// Detail Pembelian
export interface DetailPembelian {
  id: number;
  tanggal: string;
  nota_supplier: string;
  total: number;
  status_barang: string;
  status_pembayaran: string;
  uang_muka: number;
  biaya_kirim: number;
  suplier?: {
    nama: string;
  };
  cabang?: {
    nama_cabang: string;
  };
  detail_pembelian?: {
    jumlah: number;
    harga: number;
  }[];
}

export interface DetailPembelianInsert {
  pembelian_id: number;
  produk_id: number;
  jumlah: number;
  jumlah_box?: number;
  harga: number;
  subtotal: number;
}

// With Relations
export interface TransaksiPembelianWithRelations extends TransaksiPembelian {
  suplier?: {
    id: number;
    nama: string;
    cabang_id: number;
  };
  cabang?: {
    id: number;
    nama_cabang: string;
    kode_cabang: string;
  };
  detail_pembelian?: DetailPembelianWithProduk[];
}

export interface DetailPembelianWithProduk extends DetailPembelian {
  produk?: {
    id: number;
    nama_produk: string;
    is_jerigen: boolean;
    satuan: string;
  };
}

// Cicilan Pembelian
export interface CicilanPembelian extends BaseEntity {
  pembelian_id: number;
  tanggal_cicilan: string;
  jumlah_cicilan: number;
  rekening: string;
  type: 'Uang Muka' | 'Cicilan' | 'Pelunasan';
  keterangan?: string;
}

export interface CicilanPembelianInsert {
  pembelian_id: number;
  tanggal_cicilan: string;
  jumlah_cicilan: number;
  rekening: string;
  type: 'Uang Muka' | 'Cicilan' | 'Pelunasan';
  keterangan?: string;
}

// Cicilan Pembelian (sudah ada di database schema modification)
export interface CicilanPembelianRow extends BaseEntity {
  pembelian_id: number;
  tanggal_cicilan: string;
  jumlah_cicilan: number;
  rekening: string | null;
  type: 'Uang Muka' | 'Cicilan' | 'Pelunasan';
  keterangan: string | null;
}

// Form States
export interface PembelianFormData {
  tanggal: string;
  suplier_id: number | null;
  cabang_id: number | null;
  jenis_pembayaran: 'cash' | 'transfer';
  show_biaya_kirim: boolean;
  biaya_kirim: number;
  show_uang_muka: boolean;
  uang_muka: number;
}

export interface DetailBarangFormData {
  produk_id: number | null;
  harga: number;
  jumlah: number;
  jumlah_box: number;
  total_harga: number;
}

export interface BillingFormData {
  uang_muka: number;
  biaya_kirim: number;
  rekening?: string;
}

// ==================== PENJUALAN ====================
export interface DetailPenjualan {
  id: number;
  penjualan_id: number;
  produk_id: number;
  jumlah: number;
  harga: number;
  subtotal: number;
  produk?: {
    id: number;
    nama_produk: string;
    kode_produk?: string;
    satuan?: string;
  };
}

export interface Penjualan {
  id: number;
  tanggal: string;
  customer_id: number;
  pegawai_id: number;
  total: number;
  status: string;
  status_pembayaran: string;
  jenis_pembayaran: string;
  biaya_ongkir?: number;
  uang_muka?: number;
  biaya_potong?: number;
  nilai_diskon?: number;
  tanggal_transaksi_terakhir?: string;
  keterangan?: string;
  created_at: string;
  customer?: {
    id: number;
    nama: string;
    kode_customer?: string;
  };
  pegawai?: {
    id: number;
    nama: string;
    jabatan?: string;
    cabang_id?: number;
    cabang?: {
      id: number;
      nama_cabang: string;
      kode_cabang?: string;
    };
  };
  detail_penjualan: DetailPenjualan[];
}

export interface PiutangPenjualan {
  id: number;
  penjualan_id: number;
  customer_id: number;
  total_piutang: number;
  dibayar: number;
  sisa: number;
  status: string;
  jatuh_tempo?: string;
  created_at: string;
}

export interface CicilanPenjualan {
  id: number;
  penjualan_id: number;
  tanggal_cicilan: string;
  jumlah_cicilan: number;
  kas_id: number;
  keterangan?: string;
  created_at: string;
}