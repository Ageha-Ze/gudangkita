'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { calculatePembelianTotals } from '@/lib/transaksi/calculatePembelianTotals';

interface PembelianData {
  id: number;
  tanggal: string;
  nota_supplier: string;
  jenis_pembayaran: string;
  total: number;
  uang_muka: number;
  biaya_kirim: number;
  detail_pembelian?: {
    jumlah: number;
    harga: number;
  }[];
  suplier?: {
    nama: string;
    id?: number;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPembelian?: any) => void;
  pembelianData: PembelianData | null;
}

export default function ModalBilling({ isOpen, onClose, onSuccess, pembelianData }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    uang_muka: '',
    biaya_kirim: '',
  });

  const [calculatedData, setCalculatedData] = useState({
    total_harga_produk: 0,
    terbayar: 0,
    tagihan: 0,
  });

  // Initialize form data
  useEffect(() => {
    if (pembelianData) {
      setFormData({
        uang_muka: String(pembelianData.uang_muka || 0),
        biaya_kirim: String(pembelianData.biaya_kirim || 0),
      });
    }
  }, [pembelianData]);

  // Hitung tagihan
  useEffect(() => {
    if (!pembelianData) return;

    const preview = {
      ...pembelianData,
      biaya_kirim: parseInt(formData.biaya_kirim) || 0,
      uang_muka: parseInt(formData.uang_muka) || 0,
    } as any;

    const { subtotal, finalTotal, tagihan } = calculatePembelianTotals(preview);

    setCalculatedData({
      total_harga_produk: subtotal,
      terbayar: Number(preview.uang_muka || 0),
      tagihan,
    });
  }, [pembelianData, formData.uang_muka, formData.biaya_kirim]);

  const handleChangeNumber = (field: 'uang_muka' | 'biaya_kirim', value: string) => {
    // Hanya terima digit
    const filtered = value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, [field]: filtered }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pembelianData) return;

    setLoading(true);

    try {
      const payload = {
        uang_muka: parseInt(formData.uang_muka) || 0,
        biaya_kirim: parseInt(formData.biaya_kirim) || 0,
        suplier_id: pembelianData.suplier?.id,
      };

      const res = await fetch(`/api/transaksi/pembelian/${pembelianData.id}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok) {
        alert('Billing berhasil');
        onSuccess(json?.pembelian);
        onClose();
      } else {
        alert(json.error || 'Gagal proses billing');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !pembelianData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-yellow-100 px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">BILLING PEMBELIAN BARANG</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tgl Beli */}
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium">Tgl Beli</label>
            <input
              type="text"
              value={new Date(pembelianData.tanggal).toLocaleDateString('id-ID')}
              disabled
              className="col-span-2 px-3 py-2 border rounded bg-gray-100"
            />
          </div>

          {/* Supplier / Nota */}
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium">Supplier / Nota</label>
            <input
              type="text"
              value={`${pembelianData.suplier?.nama || '-'} / ${pembelianData.nota_supplier}`}
              disabled
              className="col-span-2 px-3 py-2 border rounded bg-gray-100"
            />
          </div>

          {/* Jenis Pembayaran */}
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium">Jenis Pembayaran</label>
            <input
              type="text"
              value={pembelianData.jenis_pembayaran === 'cash' ? 'Cash' : 'Transfer'}
              disabled
              className="col-span-2 px-3 py-2 border rounded bg-gray-100"
            />
          </div>

          {/* Uang Muka */}
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium">Uang Muka</label>
            <div className="col-span-2">
              <input
                type="text"
                value={formData.uang_muka}
                onChange={(e) => handleChangeNumber('uang_muka', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Rp 0"
              />
            </div>
          </div>

          {/* Biaya Kirim */}
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium">Biaya Kirim</label>
            <div className="col-span-2">
              <input
                type="text"
                value={formData.biaya_kirim}
                onChange={(e) => handleChangeNumber('biaya_kirim', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Rp 0"
              />
            </div>
          </div>

          {/* Total Harga Produk */}
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium">Total Harga Produk</label>
            <input
              type="text"
              value={`Rp ${calculatedData.total_harga_produk.toLocaleString('id-ID')}`}
              disabled
              className="col-span-2 px-3 py-2 border rounded bg-gray-100"
            />
          </div>

          {/* Terbayar */}
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium">Terbayar (Uang Muka)</label>
            <input
              type="text"
              value={calculatedData.terbayar.toLocaleString('id-ID')}
              disabled
              className="col-span-2 px-3 py-2 border rounded bg-gray-100"
            />
          </div>

          {/* Tagihan */}
          <div className="grid grid-cols-3 items-center gap-4">
            <label className="font-medium">Tagihan</label>
            <input
              type="text"
              value={`Rp ${calculatedData.tagihan.toLocaleString('id-ID')}`}
              disabled
              className="col-span-2 px-3 py-2 border rounded bg-gray-100 font-bold"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
