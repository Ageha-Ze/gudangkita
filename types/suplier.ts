export interface SuplierData {
  id: number;
  cabang_id: number;
  nama: string;
  alamat: string;
  no_telp: string;
  email: string;
  website: string;
  no_rekening: string;
  nama_bank: string;
  daerah_operasi: string;
  tanggal_order_terakhir: string;
  cabang?: {
    id: number;
    nama_cabang: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface SuplierFormData {
  cabang_id: string;
  nama: string;
  alamat: string;
  no_telp: string;
  email: string;
  website: string;
  no_rekening: string;
  nama_bank: string;
  daerah_operasi: string;
  tanggal_order_terakhir: string;
}