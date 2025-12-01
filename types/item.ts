export interface DetailItem {
  id: number;
  produk_id: number;
  jumlah: number;
  harga: number;
  subtotal: number;
  produk?: {
    nama_produk: string;
    kode_produk: string;
  };
}