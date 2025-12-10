'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalTambahBarangProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  penjualanId: number;
  cabangId: number;
}

interface StockBarang {
  produk_id: number;
  nama_produk: string;
  kode_produk: string;
  satuan: string;
  gudang: string;
  total_stock: number;
  hpp: number;
  harga_jual: number;
  persentase: number;
  stock_masuk: number;
  stock_keluar: number;
}

export default function ModalTambahBarang({
  isOpen,
  onClose,
  onSuccess,
  penjualanId,
  cabangId,
}: ModalTambahBarangProps) {
  const [formData, setFormData] = useState({
    produk_id: 0,
    harga: 0,
    jumlah: 0,
  });
  const [stockList, setStockList] = useState<StockBarang[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockBarang | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStock();
    }
  }, [isOpen, cabangId]);

  const fetchStock = async () => {
  try {
    setLoadingStock(true);
    console.log('Fetching stock for cabangId:', cabangId);
    const url = `/api/persediaan/stock-barang?cabang_id=${cabangId}&mode=aggregated&limit=1000`;
    console.log('Fetch URL:', url);
    const res = await fetch(url);
    const json = await res.json();
    console.log('Full response:', res.status, json);  // Add this for status and full JSON
    if (json.data && Array.isArray(json.data)) {
      setStockList(json.data);
      console.log('Stock list set:', json.data.length, 'items');
    } else {
      console.error('No data in response. Full JSON:', json);
      alert(`Error loading stock: ${json.error || 'Unknown error'}`);  // Temporary alert for visibility
      setStockList([]);
    }
  } catch (error) {
    console.error('Fetch error:', error);
    alert('Network error while loading stock');
    setStockList([]);
  } finally {
    setLoadingStock(false);
  }
};

  const handleProdukChange = (produkId: number) => {
    const stock = stockList.find((s) => s.produk_id === produkId);
    console.log('Selected stock:', stock);
    setSelectedStock(stock || null);
    setFormData({
      ...formData,
      produk_id: produkId,
      harga: stock?.harga_jual || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.produk_id === 0) {
      alert('Pilih barang terlebih dahulu');
      return;
    }

    if (formData.jumlah <= 0) {
      alert('Jumlah berat harus lebih dari 0');
      return;
    }

    if (selectedStock && formData.jumlah > selectedStock.total_stock) {
      alert(`Stock tidak mencukupi. Stock tersedia: ${selectedStock.total_stock} Kg`);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/transaksi/penjualan/${penjualanId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cabang_id: cabangId,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        alert('Barang berhasil ditambahkan');
        onSuccess();
        onClose();
        // Reset form
        setFormData({ produk_id: 0, harga: 0, jumlah: 0 });
        setSelectedStock(null);
      } else {
        // Handle duplicate product error specifically
        if (json.errorCode === 'DUPLICATE_PRODUCT') {
          alert(`❌ ${json.error}\n\nSilakan hapus item yang sudah ada terlebih dahulu jika ingin menambahkan kembali.`);
        } else {
          alert(json.error || 'Gagal menambah barang');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return formData.harga * formData.jumlah;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-yellow-50 rounded-lg p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">TAMBAH BARANG</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        {/* Debug Info */}
        {loadingStock && (
          <div className="mb-4 p-2 bg-blue-100 text-blue-700 rounded text-sm">
            Loading stock...
          </div>
        )}
        {!loadingStock && stockList.length === 0 && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
            Tidak ada stock tersedia di cabang ini
          </div>
        )}
        {!loadingStock && stockList.length > 0 && (
          <div className="mb-4 p-2 bg-green-100 text-green-700 rounded text-sm">
            {stockList.length} produk tersedia
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama Barang */}
          <div>
            <label className="block text-sm font-medium mb-1">Nama Barang</label>
            <select
              value={formData.produk_id}
              onChange={(e) => handleProdukChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded"
              disabled={loadingStock || stockList.length === 0}
              required
            >
              <option value={0}>
                {loadingStock ? 'Loading...' : 'Pilih Barang'}
              </option>
              {stockList.map((stock) => (
                <option key={stock.produk_id} value={stock.produk_id}>
              {stock.nama_produk} - Stock: {(stock.total_stock || 0).toFixed(2)} {stock.satuan}
                </option>
              ))}
            </select>
          </div>

          {/* Harga Jual & Satuan */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Harga jual</label>
              <input
                type="number"
                value={formData.harga || ''}
                onChange={(e) =>
                  setFormData({ ...formData, harga: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border rounded"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Satuan</label>
              <input
                type="text"
                value={selectedStock?.satuan || 'Kg'}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100"
              />
            </div>
          </div>

          {/* Jumlah Berat & Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Jumlah Berat</label>
              <input
                type="number"
                step="0.01"
                value={formData.jumlah || ''}
                onChange={(e) =>
                  setFormData({ ...formData, jumlah: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border rounded"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock ( Kg/Gr/Pcs/Ml )</label>
              <input
                type="text"
                value={selectedStock?.total_stock.toFixed(2) || '0.00'}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100"
              />
            </div>
          </div>

          {/* Sub Total */}
          <div>
            <label className="block text-sm font-medium mb-1">Sub Total</label>
            <input
              type="text"
              value={`Rp. ${calculateSubtotal().toLocaleString('id-ID')}`}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 font-bold"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-center mt-6">
            <button
              type="submit"
              disabled={loading || loadingStock || stockList.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
