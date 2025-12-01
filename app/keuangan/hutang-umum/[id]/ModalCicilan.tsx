'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Kas {
  id: number;
  nama_kas: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hutangId: number;
  sisaHutang: number;
}

export default function ModalCicilan({
  isOpen,
  onClose,
  onSuccess,
  hutangId,
  sisaHutang,
}: ModalProps) {
  const [formData, setFormData] = useState({
    tanggal_cicilan: new Date().toISOString().split('T')[0],
    jumlah_cicilan: '',
    kas_id: '',
    keterangan: '',
  });
  const [kasList, setKasList] = useState<Kas[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchKas();
    }
  }, [isOpen]);

  const fetchKas = async () => {
    try {
      const res = await fetch('/api/master/kas');
      const json = await res.json();
      setKasList(json.data || []);
    } catch (error) {
      console.error('Error fetching kas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const jumlah = Number(formData.jumlah_cicilan);

    if (jumlah <= 0) {
      alert('Jumlah cicilan harus lebih dari 0');
      return;
    }

    if (jumlah > sisaHutang) {
      alert('Jumlah cicilan melebihi sisa hutang');
      return;
    }

    if (!formData.kas_id) {
      alert('Pilih rekening terlebih dahulu');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/keuangan/hutang-umum/${hutangId}/cicilan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          is_pelunasan: false,
        }),
      });

      if (res.ok) {
        alert('Cicilan berhasil ditambahkan');
        onSuccess();
        handleClose();
      } else {
        const error = await res.json();
        alert(error.error || 'Gagal menambahkan cicilan');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tanggal_cicilan: new Date().toISOString().split('T')[0],
      jumlah_cicilan: '',
      kas_id: '',
      keterangan: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Tambah Cicilan Hutang</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="bg-red-50 p-3 rounded mb-4">
          <p className="text-sm">Sisa Hutang:</p>
          <p className="text-xl font-bold text-red-600">
            Rp. {sisaHutang.toLocaleString('id-ID')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tanggal Cicilan <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.tanggal_cicilan}
              onChange={(e) => setFormData({ ...formData, tanggal_cicilan: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Jumlah Cicilan <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.jumlah_cicilan}
              onChange={(e) => setFormData({ ...formData, jumlah_cicilan: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              placeholder="0"
              max={sisaHutang}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Maksimal: Rp. {sisaHutang.toLocaleString('id-ID')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Rekening <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.kas_id}
              onChange={(e) => setFormData({ ...formData, kas_id: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">-- Pilih Rekening --</option>
              {kasList.map((kas) => (
                <option key={kas.id} value={kas.id}>
                  {kas.nama_kas}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Keterangan</label>
            <textarea
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              rows={3}
              placeholder="Keterangan..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}