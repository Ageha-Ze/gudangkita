export interface PegawaiData {
  id: number;
  jabatan: string;
  nama: string;
  no_telp: string;
  level_jabatan: string;
  daerah_operasi: string;
  nomor_ktp: string;
  tanggal_lahir: string;
  cabang_id: number;
  user_id: number;
  cabang?: {
    id: number;
    kode_cabang: string;
    nama_cabang: string;
  };
  user?: {
    id: number;
    username: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface PegawaiFormData {
  jabatan: string;
  nama: string;
  no_telp: string;
  level_jabatan: string;
  daerah_operasi: string;
  nomor_ktp: string;
  tanggal_lahir: string;
  cabang_id: string;
  user_id: string;
}