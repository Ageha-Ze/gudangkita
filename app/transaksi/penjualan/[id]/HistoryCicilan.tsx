'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import ModalEditCicilan from './ModalEditCicilan';

interface HistoryCicilanProps {
  penjualanId: number;
  onUpdate: () => void;
}

interface CicilanItem {
  id: number;
  tanggal_cicilan: string;
  jumlah_cicilan: number;
  keterangan: string;
  kas?: {
    nama_kas: string;
  };
}

export default function HistoryCicilan({
  penjualanId,
  onUpdate,
}: HistoryCicilanProps) {
  const [cicilans, setCicilans] = useState<CicilanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCicilan, setSelectedCicilan] = useState<CicilanItem | null>(null);

  useEffect(() => {
    fetchCicilans();
  }, [penjualanId]);

  const fetchCicilans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/transaksi/penjualan/${penjualanId}/cicilan`);
      const json = await res.json();
      setCicilans(json.data || []);
    } catch (error) {
      console.error('Error fetching cicilans:', error);
      setCicilans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cicilan: CicilanItem) => {
    setSelectedCicilan(cicilan);
    setShowEditModal(true);
  };

  const handleDelete = async (cicilanId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus cicilan ini?')) return;

    try {
      const res = await fetch(
        `/api/transaksi/penjualan/${penjualanId}/cicilan/${cicilanId}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        alert('Cicilan berhasil dihapus');
        fetchCicilans();
        onUpdate();
      } else {
        const error = await res.json();
        alert(error.error || 'Gagal menghapus cicilan');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleEditSuccess = () => {
    fetchCicilans();
    onUpdate();
  };

  if (loading) {
    return <div className="text-center py-4">Loading history...</div>;
  }

  if (cicilans.length === 0) {
    return null; // Tidak tampilkan jika belum ada cicilan
  }

  return (
    <div className="bg-white p-6 rounded shadow mt-6">
      <h2 className="font-bold text-lg mb-4 underline">History Cicilan Penjualan</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cyan-100">
            <tr>
              <th className="px-4 py-3 text-left">Tanggal Cicilan</th>
              <th className="px-4 py-3 text-right">Jumlah Cicilan</th>
              <th className="px-4 py-3 text-left">Rekening</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {cicilans.map((cicilan) => (
              <tr key={cicilan.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  {new Date(cicilan.tanggal_cicilan).toLocaleDateString('id-ID')}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  Rp. {parseFloat(cicilan.jumlah_cicilan.toString()).toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3">{cicilan.kas?.nama_kas || '-'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded text-xs font-semibold">
                    Cicilan
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(cicilan)}
                      className="text-green-600 hover:text-green-800"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(cicilan.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Edit */}
      {selectedCicilan && (
        <ModalEditCicilan
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCicilan(null);
          }}
          onSuccess={handleEditSuccess}
          cicilan={selectedCicilan}
          penjualanId={penjualanId}
        />
      )}
    </div>
  );
}