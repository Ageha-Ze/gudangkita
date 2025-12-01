'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { ProdukData } from '@/types/produk';
import { addProduk, updateProduk } from './actions';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ProdukModalProps {
  isOpen: boolean;
  onClose: () => void;
  produk: ProdukData | null;
  onSuccess: () => void;
}

export default function ProdukModal({ isOpen, onClose, produk, onSuccess }: ProdukModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    kode_produk: '',
    nama_produk: '',
    harga: '',
    hpp: '',
    stok: '',
    satuan: '',
    is_jerigen: false,
  });

  useEffect(() => {
    if (produk) {
      setFormData({
        kode_produk: produk.kode_produk || '',
        nama_produk: produk.nama_produk,
        harga: produk.harga.toString(),
        hpp: produk.hpp?.toString() || '',
        stok: produk.stok.toString(),
        satuan: produk.satuan,
        is_jerigen: produk.is_jerigen ?? false,
      });
    } else {
      setFormData({
        kode_produk: '',
        nama_produk: '',
        harga: '',
        hpp: '',
        stok: '',
        satuan: '',
        is_jerigen: false,
      });
    }
    setError(null);
  }, [produk, isOpen]);

  const generateKodeProduk = (namaProduk: string) => {
    const prefix = namaProduk
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3)
      .padEnd(3, 'X');
    
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${timestamp}`;
  };

  const handleSubmit = async () => {
    setError(null);
    
    // Validasi
    if (!formData.nama_produk) {
      setError('Nama Barang harus diisi');
      return;
    }

    if (!formData.satuan) {
      setError('Satuan harus dipilih');
      return;
    }

    setIsLoading(true);

    try {
      // Generate kode_produk jika kosong (untuk produk baru)
      let kode = formData.kode_produk;
      if (!kode && !produk) {
        kode = generateKodeProduk(formData.nama_produk);
      }

      const data = {
        kode_produk: kode || null,
        nama_produk: formData.nama_produk,
        harga: parseFloat(formData.harga) || 0,
        hpp: parseFloat(formData.hpp) || null,
        stok: parseFloat(formData.stok) || 0,
        satuan: formData.satuan,
        is_jerigen: !!formData.is_jerigen,
      };

      let result;
      if (produk) {
        result = await updateProduk(produk.id, data);
      } else {
        result = await addProduk(data);
      }

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || result.message || 'Terjadi kesalahan');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan tidak terduga');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        kode_produk: '',
        nama_produk: '',
        harga: '',
        hpp: '',
        stok: '',
        satuan: '',
        is_jerigen: false,
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={produk ? 'UBAH BARANG' : 'TAMBAH BARANG'}
    >
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Kode Barang */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Kode Barang {!produk && <span className="text-xs text-gray-500">(opsional, auto-generate jika kosong)</span>}
          </label>
          <input
            type="text"
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              produk ? 'bg-gray-100' : 'bg-blue-50'
            }`}
            value={formData.kode_produk}
            onChange={(e) => setFormData({ ...formData, kode_produk: e.target.value.toUpperCase() })}
            placeholder={produk ? 'Kode tidak bisa diubah' : 'Contoh: MDU001 (kosongkan untuk auto-generate)'}
            disabled={!!produk || isLoading}
          />
          {!produk && formData.nama_produk && !formData.kode_produk && (
            <p className="text-xs text-blue-600 mt-1">
              Akan di-generate otomatis: {generateKodeProduk(formData.nama_produk)}
            </p>
          )}
        </div>

        {/* Nama Barang */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Nama Barang <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            value={formData.nama_produk}
            onChange={(e) => setFormData({ ...formData, nama_produk: e.target.value })}
            placeholder="Contoh: Madu Hutan Liar"
            disabled={isLoading}
            required
          />
        </div>

        {/* Grid 2 Kolom: Satuan & Is Jerigen */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Satuan <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={formData.satuan}
              onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
              disabled={isLoading}
              required
            >
              <option value="">-- Pilih Satuan --</option>
              <option value="Kg">Kilogram (Kg)</option>
              <option value="Gr">Gram (Gr)</option>
              <option value="Liter">Liter</option>
              <option value="Ml">Mililiter (Ml)</option>
              <option value="Pcs">Pieces (Pcs)</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Type</label>
            <div className="flex items-center h-10 mt-1">
              <input
                type="checkbox"
                id="is_jerigen"
                checked={formData.is_jerigen}
                onChange={(e) =>
                  setFormData({ ...formData, is_jerigen: e.target.checked })
                }
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <label htmlFor="is_jerigen" className="ml-2 text-gray-700">
                Jerigen
              </label>
            </div>
          </div>
        </div>

        {/* Grid 2 Kolom: HPP & Harga Jual */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              HPP (Harga Pokok)
            </label>
            <input
              type="number"
              className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={formData.hpp}
              onChange={(e) => setFormData({ ...formData, hpp: e.target.value })}
              placeholder="0"
              min="0"
              step="0.01"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Harga Jual
            </label>
            <input
              type="number"
              className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={formData.harga}
              onChange={(e) => setFormData({ ...formData, harga: e.target.value })}
              placeholder="0"
              min="0"
              step="0.01"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Stok */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">Stok Awal</label>
          <input
            type="number"
            className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            value={formData.stok}
            onChange={(e) => setFormData({ ...formData, stok: e.target.value })}
            placeholder="0"
            min="0"
            step="0.01"
            disabled={isLoading}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Menyimpan...' : (produk ? 'Update' : 'Simpan')}
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
        </div>
      </div>
    </Modal>
  );
}