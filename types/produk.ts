export interface ProdukData {
  id: number;
  kode_produk: string | null;
  nama_produk: string;
  harga: number;
  hpp: number | null;
  stok: number;
  satuan: string;
  is_jerigen: boolean;
  density_kg_per_liter?: number; // 🆕 Density factor for KG → ML conversion
  allow_manual_conversion?: boolean; // 🆕 Allow manual override in unloading
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
