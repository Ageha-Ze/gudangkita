export interface KasData {
  id: number;
  nama_kas: string;
  tipe_kas: string;
  no_rekening: string;
  saldo: number;
  cabang_id: number;
  cabang?: {
    id: number;
    nama_cabang: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface KasFormData {
  nama_kas: string;
  tipe_kas: string;
  no_rekening: string;
  saldo: string;
  cabang_id: string;
}

export interface TransaksiKasData {
  id: number;
  kas_id: number;
  tanggal_transaksi: string;
  kredit: number;
  debit: number;
  keterangan: string;
  created_at?: string;
}