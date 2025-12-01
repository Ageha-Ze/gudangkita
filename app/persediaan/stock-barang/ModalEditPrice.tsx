'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp } from 'lucide-react';

interface ModalEditPriceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  data: {
    produk_id: number;
    nama_produk: string;
    kode_produk: string;
    cabang_id: number;
    cabang: string;
    hpp: number;
    harga_jual: number;
    margin: number;
  } | null;
}

interface Cabang {
  id: number;
  nama_cabang: string;
  kode_cabang: string;
}

export default function ModalEditPrice({
  isOpen,
  onClose,
  onSuccess,
  data
}: ModalEditPriceProps) {
  const [loading, setLoading] = useState(false);
  const [cabangs, setCabangs] = useState<Cabang[]>([]);
  const [applyToAllCabang, setApplyToAllCabang] = useState(false);
  
  const [formData, setFormData] = useState({
    cabang_id: 0,
    hpp: 0,
    harga_jual: 0,
    persentase: 0,
  });

  useEffect(() => {
    if (isOpen) {
      fetchCabangs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (data) {
      setFormData({
        cabang_id: data.cabang_id,
        hpp: data.hpp,
        harga_jual: data.harga_jual,
        persentase: data.margin,
      });
    }
  }, [data]);

  const fetchCabangs = async () => {
    try {
      const res = await fetch('/api/master/cabang');
      const json = await res.json();
      setCabangs(json.data || []);
    } catch (error) {
      console.error('Error fetching cabangs:', error);
    }
  };

  // Auto calculate functions
  const handleHppChange = (hpp: number) => {
    const persentase = formData.persentase;
    const harga_jual = hpp + (hpp * persentase / 100);
    setFormData(prev => ({ ...prev, hpp, harga_jual }));
  };

  const handlePersentaseChange = (persentase: number) => {
    const harga_jual = formData.hpp + (formData.hpp * persentase / 100);
    setFormData(prev => ({ ...prev, persentase, harga_jual }));
  };

  const handleHargaJualChange = (harga_jual: number) => {
    const persentase = formData.hpp > 0 
      ? ((harga_jual - formData.hpp) / formData.hpp * 100) 
      : 0;
    setFormData(prev => ({ ...prev, harga_jual, persentase }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data) return;

    setLoading(true);

    try {
      const res = await fetch('/api/persediaan/stock-barang/update-harga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produk_id: data.produk_id,
          cabang_id: applyToAllCabang ? 0 : formData.cabang_id,
          hpp: formData.hpp,
          harga_jual: formData.harga_jual,
          persentase: formData.persentase,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        alert(json.message || 'Harga berhasil diupdate!');
        onSuccess();
        onClose();
      } else {
        alert(json.error || 'Gagal update harga');
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert('Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !data) return null;

  const marginColor = formData.persentase >= 20 ? 'text-green-600' :
                      formData.persentase >= 10 ? 'text-yellow-600' :
                      'text-red-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Edit Harga</h2>
                <p className="text-sm text-yellow-100 mt-1">Update HPP & Harga Jual</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Product Info */}
          <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{data.nama_produk}</h3>
                <p className="text-sm text-gray-600">Kode: {data.kode_produk}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Gudang</p>
                <p className="text-sm font-semibold text-gray-700">{data.cabang}</p>
              </div>
            </div>
          </div>

          {/* Current Price Info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-600 font-medium mb-1">HPP Saat Ini</p>
              <p className="text-lg font-bold text-gray-800">
                Rp {data.hpp.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 font-medium mb-1">Harga Jual</p>
              <p className="text-lg font-bold text-gray-800">
                Rp {data.harga_jual.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <p className="text-xs text-purple-600 font-medium mb-1">Margin</p>
              <p className="text-lg font-bold text-gray-800">
                {data.margin.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="text-sm text-gray-500 font-medium">HARGA BARU</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Apply to All Cabang */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAllCabang}
                onChange={(e) => setApplyToAllCabang(e.target.checked)}
                className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-gray-800">Terapkan ke Semua Gudang</span>
                <p className="text-xs text-gray-600 mt-0.5">
                  Centang jika ingin update harga di semua cabang/gudang
                </p>
              </div>
            </label>
          </div>

          {/* Cabang Selector (if not apply to all) */}
          {!applyToAllCabang && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gudang/Cabang <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.cabang_id}
                onChange={(e) => setFormData({ ...formData, cabang_id: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value={0}>Pilih Gudang</option>
                {cabangs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nama_cabang} ({c.kode_cabang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* HPP Baru */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              HPP Baru <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                Rp
              </span>
              <input
                type="number"
                step="0.01"
                value={formData.hpp || ''}
                onChange={(e) => handleHppChange(parseFloat(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Margin % */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Margin (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={formData.persentase || ''}
                onChange={(e) => handlePersentaseChange(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="0.00"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <TrendingUp className={`w-5 h-5 ${marginColor}`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Otomatis menghitung harga jual berdasarkan margin
            </p>
          </div>

          {/* Harga Jual Baru */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Harga Jual Baru <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                Rp
              </span>
              <input
                type="number"
                step="0.01"
                value={formData.harga_jual || ''}
                onChange={(e) => handleHargaJualChange(parseFloat(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Price Comparison */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Ringkasan Perubahan</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">HPP:</span>
                <span className="font-semibold text-gray-800">
                  Rp {(data.hpp || 0).toLocaleString('id-ID')} → Rp {(formData.hpp || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Harga Jual:</span>
                <span className="font-semibold text-gray-800">
                  Rp {(data.harga_jual || 0).toLocaleString('id-ID')} → Rp {(formData.harga_jual || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Margin:</span>
                <span className={`font-semibold ${marginColor}`}>
                  {(data.margin || 0).toFixed(2)}% → {(formData.persentase || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : '💾 Simpan Perubahan'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}