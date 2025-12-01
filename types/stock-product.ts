export type Produk = {
id: number;
nama_produk: string;
harga?: number | null;
stok?: number | null;
is_jerigen?: boolean;
kode_produk?: string | null;
};


export type Cabang = {
id: number;
nama_cabang: string;
};


export type StockBarang = {
id: number;
produk_id: number;
cabang_id: number;
jumlah: number;
hpp?: number | null;
persentase?: number | null;
harga_jual?: number | null;
created_at?: string;
produk?: Produk;
cabang?: Cabang;
};