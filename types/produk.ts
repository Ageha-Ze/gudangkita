export interface ProdukData {
  id: number;
  kode_produk?: string;
  nama_produk: string;
  harga: number;
  hpp?: number;
  stok: number;
  satuan: string;
  is_jerigen: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProdukFormData {
  nama_produk: string;
  harga: string;
  stok: string;
  satuan: string;
  is_jerigen: boolean;
}
