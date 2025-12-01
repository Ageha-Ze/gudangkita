export interface Customer {
  id: number;
  kode_customer: string;
  nama: string;
  alamat: string | null;
  no_hp: string | null;
  cabang_id: number | null;
  created_at: string;
  updated_at: string;
  // Relasi
  cabang?: {
    id: number;
    nama_cabang: string;
  } | null; // Tambahkan | null disini
}

export interface CustomerFormData {
  kode_customer?: string;
  nama: string;
  alamat: string;
  no_hp: string;
  cabang_id: number | null;
}