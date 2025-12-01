// Type Definitions
export interface Suplier {
  id: string;
  nama: string;
  alamat?: string;
}

export interface Cabang {
  id: string;
  nama_cabang: string;
  kode_cabang: string;
}

export interface Produk {
  id: string;
  nama_produk: string;
  kode_produk: string;
  satuan: string;
}

export interface DetailPembelian {
  id: string;
  jumlah: number;
  harga: number;
  subtotal: number;
  produk_id: string;
  produk?: Produk;
}

export interface Cicilan {
  id: string;
  tanggal_cicilan: string;
  jumlah_cicilan: number;
  rekening?: string;
}

export interface PembelianData {
  id: string;
  tanggal: string;
  nota_supplier: string;
  total: number;
  biaya_kirim: number;
  uang_muka: number;
  jenis_pembayaran: string;
  status_pembayaran: string;
  status_barang: string;
  status: string;
  keterangan?: string;
  suplier?: Suplier;
  cabang?: Cabang;
  detail_pembelian?: DetailPembelian[];
  cicilan?: Cicilan[];
  subtotal: number;
  finalTotal: number;
  totalBayar: number;
  sisaTagihan: number;
  persenTerbayar: number;
  jumlahCicilan: number;
}

export interface StatusPembayaran {
  lunas: number;
  cicil: number;
  belumLunas: number;
}

export interface StatusBarang {
  diterima: number;
  belumDiterima: number;
}

export interface JenisPembayaran {
  cash: number;
  transfer: number;
}

export interface TopSuplier {
  nama: string;
  total: number;
  count: number;
  id?: string;
}

export interface Summary {
  totalPembelian: number;
  totalNilaiPembelian: number;
  totalSubtotal: number;
  totalBiayaKirim: number;
  totalUangMuka: number;
  totalCicilan: number;
  totalTerbayar: number;
  totalSisaTagihan: number;
  statusPembayaran: StatusPembayaran;
  nilaiByStatusPembayaran: {
    lunas: number;
    cicil: number;
    belumLunas: number;
  };
  statusBarang: StatusBarang;
  jenisPembayaran: JenisPembayaran;
  nilaiByJenisPembayaran: {
    cash: number;
    transfer: number;
  };
  topSuplier: TopSuplier[];
  topCabang: TopSuplier[];
  rataRataPembelian: number;
  rataRataBiayaKirim: number;
}

export interface FilterState {
  start_date: string;
  end_date: string;
  cabang_id: string;
  suplier_id: string;
  status_pembayaran: string;
  status_barang: string;
  jenis_pembayaran: string;
}