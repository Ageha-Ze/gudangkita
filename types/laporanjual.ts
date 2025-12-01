// types/laporanjual.ts

// Type Definitions
export interface Customer {
  id: string;
  nama: string;
  alamat?: string;
  no_hp?: string;
}

export interface Cabang {
  id: string;
  nama_cabang: string;
  kode_cabang: string;
}

export interface Pegawai {
  id: string;
  nama: string;
}

export interface Produk {
  id: string;
  nama_produk: string;
  kode_produk: string;
  satuan: string;
}

export interface DetailPenjualan {
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
  metode_pembayaran?: string;
}

export interface PenjualanData {
  id: string;
  tanggal: string;
  nota_penjualan: string;
  total: number;
  biaya_ongkir: number;
  biaya_potong: number;
  nilai_diskon: number;
  uang_muka: number;
  dibayar: number;
  jenis_pembayaran: string;
  status_pembayaran: string;
  status_diterima: string;
  status: string;
  jatuh_tempo?: string;
  tanggal_diterima?: string;
  diterima_oleh?: string;
  catatan_penerimaan?: string;
  keterangan?: string;
  customer?: Customer;
  cabang?: Cabang;
  pegawai?: Pegawai;
  detail_penjualan?: DetailPenjualan[];
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

export interface StatusDiterima {
  diterima: number;
  belumDiterima: number;
}

export interface JenisPembayaran {
  tunai: number;
  hutang: number;
  transfer: number;
}

export interface TopCustomer {
  nama: string;
  total: number;
  count: number;
  id?: string;
}

export interface Summary {
  totalPenjualan: number;
  totalNilaiPenjualan: number;
  totalSubtotal: number;
  totalBiayaOngkir: number;
  totalBiayaPotong: number;
  totalDiskon: number;
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
  statusDiterima: StatusDiterima;
  jenisPembayaran: JenisPembayaran;
  nilaiByJenisPembayaran: {
    tunai: number;
    hutang: number;
    transfer: number;
  };
  topCustomer: TopCustomer[];
  topCabang: TopCustomer[];
  topPegawai: TopCustomer[];
  rataRataPenjualan: number;
  rataRataBiayaOngkir: number;
}

export interface FilterState {
  start_date: string;
  end_date: string;
  cabang_id: string;
  customer_id: string;
  pegawai_id: string;
  status_pembayaran: string;
  status_diterima: string;
  jenis_pembayaran: string;
}