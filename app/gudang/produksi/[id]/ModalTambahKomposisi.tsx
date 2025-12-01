'use client';

import { useState, useEffect } from 'react';

interface Produk {
  produk_id: number;
  nama_produk: string;
  stok: number;
  satuan: string;
  terakhir_dibeli?: string;
  hpp: number;
}

interface ModalTambahKomposisiProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  produksiId: number;
  cabangId: number;
}

export default function ModalTambahKomposisi({ 
  isOpen, 
  onClose, 
  onSuccess, 
  produksiId, 
  cabangId 
}: ModalTambahKomposisiProps) {
  const [form, setForm] = useState({ item_id: '', jumlah: '' });
  const [produks, setProduks] = useState<Produk[]>([]);
  const [selectedProduk, setSelectedProduk] = useState<Produk | null>(null);
  const [hpp, setHpp] = useState<number>(0);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch produk saat modal dibuka
  useEffect(() => {
    if (isOpen && cabangId) {
      fetchProduks();
      // Reset form saat modal dibuka
      setForm({ item_id: '', jumlah: '' });
      setSelectedProduk(null);
      setHpp(0);
      setSubtotal(0);
    }
  }, [isOpen, cabangId]);

  // Hitung subtotal saat jumlah atau hpp berubah
  useEffect(() => {
    if (form.jumlah && hpp) {
      const qty = parseFloat(form.jumlah || '0');
      setSubtotal(hpp * qty);
    } else {
      setSubtotal(0);
    }
  }, [form.jumlah, hpp]);

  const fetchProduks = async () => {
    try {
      console.log('=== FETCHING PRODUCTS ===');
      console.log('Cabang ID:', cabangId);
      console.log('API URL:', `/api/gudang/produksi/bahan/${cabangId}`);
      
      const res = await fetch(`/api/gudang/produksi/bahan/${cabangId}`);
      
      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);
      
      const json = await res.json();
      console.log('Response JSON:', json);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}, error: ${json.error || 'Unknown'}`);
      }
      
      setProduks(json.data || []);
      console.log('Products set:', json.data?.length || 0, 'items');

      if (!json.data || json.data.length === 0) {
        console.warn('⚠️ No products found for this cabang');
        alert('Belum ada bahan baku yang pernah dibeli untuk cabang ini. Pastikan sudah ada pembelian dengan status "posted".');
      }
    } catch (error) {
      console.error('❌ Error fetching produk:', error);
      alert('Gagal memuat data produk. Cek console untuk detail error.');
    }
  };

  const handleItemChange = (itemId: string) => {
    setForm({ ...form, item_id: itemId, jumlah: '' });
    
    if (itemId) {
      const selected = produks.find(p => p.produk_id === Number(itemId));
      setSelectedProduk(selected || null);
      
      // Langsung set HPP dari data produk
      setHpp(selected?.hpp || 0);
    } else {
      setSelectedProduk(null);
      setHpp(0);
      setSubtotal(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduk) {
      alert('Pilih item terlebih dahulu');
      return;
    }

    const qty = parseFloat(form.jumlah);
    
    if (qty <= 0) {
      alert('Jumlah harus lebih dari 0');
      return;
    }

    // Validasi stock
    if (qty > selectedProduk.stok) {
      alert(`Stock tidak mencukupi! Tersedia: ${selectedProduk.stok} ${selectedProduk.satuan}`);
      return;
    }

    if (hpp <= 0) {
      alert('HPP tidak valid. Pastikan produk memiliki HPP.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/gudang/produksi/${produksiId}/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          item_id: form.item_id,
          jumlah: qty,
          hpp: hpp,
          subtotal: subtotal 
        }),
      });

      const responseData = await res.json();

      if (res.ok) {
        alert('Item berhasil ditambahkan');
        setForm({ item_id: '', jumlah: '' });
        setSelectedProduk(null);
        setHpp(0);
        setSubtotal(0);
        onSuccess();
        onClose();
      } else {
        alert('Error: ' + (responseData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Terjadi kesalahan saat menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Tambah Komposisi Item</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Item */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Item Bahan Baku <span className="text-red-500">*</span>
            </label>
            <select
              value={form.item_id}
              onChange={(e) => handleItemChange(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-violet-500"
              disabled={loading}
            >
              <option value="">Pilih Item</option>
              {produks.map((p) => (
                <option key={p.produk_id} value={p.produk_id}>
                  {p.nama_produk} (Stock: {p.stok} {p.satuan})
                </option>
              ))}
            </select>
            {produks.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                Belum ada bahan baku yang dibeli untuk cabang ini
              </p>
            )}
          </div>

          {/* Info Produk Terpilih */}
          {selectedProduk && (
            <>
              {/* Jumlah */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Jumlah <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                  required
                  max={selectedProduk.stok}
                  min="0.01"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-violet-500"
                  placeholder="0"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max: {selectedProduk.stok} {selectedProduk.satuan}
                </p>
              </div>

              {/* Stock Tersedia */}
              <div>
                <label className="block text-sm font-medium mb-1">Stock Tersedia</label>
                <input
                  type="text"
                  value={`${selectedProduk.stok} ${selectedProduk.satuan}`}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700"
                />
              </div>

              {/* HPP */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  HPP (Harga Pokok)
                </label>
                <input
                  type="text"
                  value={`Rp. ${hpp.toLocaleString('id-ID')}`}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700"
                />
              </div>

              {/* Subtotal */}
              <div>
                <label className="block text-sm font-medium mb-1">Subtotal</label>
                <input
                  type="text"
                  value={`Rp. ${subtotal.toLocaleString('id-ID')}`}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-blue-50 text-blue-900 font-semibold"
                />
              </div>

              {/* Terakhir Dibeli */}
              {selectedProduk.terakhir_dibeli && (
                <div>
                  <label className="block text-sm font-medium mb-1">Terakhir Dibeli</label>
                  <input
                    type="text"
                    value={new Date(selectedProduk.terakhir_dibeli).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                    disabled
                    className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-700"
                  />
                </div>
              )}
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading || !selectedProduk || !form.jumlah}
              className="flex-1 px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 transition-all"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}