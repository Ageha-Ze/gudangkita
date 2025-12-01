'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SuplierData } from '@/types/suplier';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pembelianData: {
    id: number;
    tanggal: string;
    nota_supplier: string;
    jenis_pembayaran: string;
    suplier?: {
      nama: string;
    };
  };
}

export default function ModalEditDataPembelian({
  isOpen,
  onClose,
  onSuccess,
  pembelianData,
}: Props) {
  const [formData, setFormData] = useState({
    tanggal: '',
    nota_supplier: '',
    jenis_pembayaran: '',
    suplier_id: '',
  });
  const [supliers, setSupliers] = useState<SuplierData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && pembelianData) {
      setFormData({
        tanggal: pembelianData.tanggal.split('T')[0],
        nota_supplier: pembelianData.nota_supplier,
        jenis_pembayaran: pembelianData.jenis_pembayaran,
        suplier_id: '', // Assuming suplier_id not in pembelianData, set to ''
      });
    }

    // Fetch supliers
    const fetchSupliers = async () => {
      try {
        const res = await fetch('/api/master/suplier');
        const responseData = await res.json();
        if (res.ok) {
          setSupliers(responseData.data);
        }
      } catch (error) {
        console.error('Error fetching supliers:', error);
      }
    };

    if (isOpen) {
      fetchSupliers();
    }
  }, [isOpen, pembelianData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/transaksi/pembelian/${pembelianData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (res.ok) {
        alert('Data berhasil diupdate');
        onSuccess();
        onClose();
      } else {
        alert('Gagal update: ' + json.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">EDIT PEMBELIAN BARANG</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Tgl Pembelian */}
            <div>
              <label className="block mb-2 font-medium">Tgl Pembelian</label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={(e) =>
                  setFormData({ ...formData, tanggal: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            {/* Nota Supplier */}
            <div>
              <label className="block mb-2 font-medium">Nota Supplier</label>
              <input
                type="text"
                value={formData.nota_supplier}
                onChange={(e) =>
                  setFormData({ ...formData, nota_supplier: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            {/* Supplier (Read Only) */}
            <div>
              <label className="block mb-2 font-medium">Supplier</label>
               <select
              value={formData.suplier_id}
              onChange={(e) => setFormData({ ...formData, suplier_id: e.target.value })}
              className="col-span-2 px-3 py-2 border rounded"
              required
            >
              <option value="">Pilih Supplier</option>
              {supliers.map((s) => (
                <option key={s.id} value={s.id}>{s.nama}</option>
              ))}
            </select>
            </div>

            {/* Jenis Pembayaran */}
            <div>
              <label className="block mb-2 font-medium">Jenis Pembayaran</label>
              <select
                value={formData.jenis_pembayaran}
                onChange={(e) =>
                  setFormData({ ...formData, jenis_pembayaran: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">Pilih Jenis Pembayaran</option>
                <option value="transfer">Transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}