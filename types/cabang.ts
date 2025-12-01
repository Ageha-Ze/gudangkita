export interface CabangData {
  id: number;
  jenis_kantor: string;
  kode_cabang: string;
  nama_cabang: string;
  no_telp: string;
  alamat: string;
  email: string;
  nama_kc: string;
  jumlah_pegawai: number;
  tanggal_operasi: string;
  link_google_map: string;
  nama_kas: string;
  nomor_rekening: string;
  kapasitas_box: number;
  kapasitas_kg: number;
  created_at?: string;
  updated_at?: string;
}

export interface CabangFormData {
  jenis_kantor: string;
  kode_cabang: string;
  nama_cabang: string;
  no_telp: string;
  alamat: string;
  email: string;
  nama_kc: string;
  jumlah_pegawai: string;
  tanggal_operasi: string;
  link_google_map: string;
  nama_kas: string;
  nomor_rekening: string;
  kapasitas_box: string;
  kapasitas_kg: string;
}