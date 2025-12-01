'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { KasData } from '@/types/kas';
import { addKas, updateKas, getCabangList } from './actions';

interface KasModalProps {
  isOpen: boolean;
  onClose: () => void;
  kas: KasData | null;
  onSuccess: () => void;
}

export default function KasModal({ isOpen, onClose, kas, onSuccess }: KasModalProps) {
  const [cabangList, setCabangList] = useState<Array<{ id: number; nama_cabang: string }>>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama_kas: '',
    tipe_kas: '',
    no_rekening: '',
    saldo: '',
    cabang_id: '',
  });

  useEffect(() => {
    const loadCabang = async () => {
      setIsLoadingData(true);
      setError(null);
      
      try {
        const result = await getCabangList();
        
        if (result.success) {
          setCabangList(result.data || []);
        } else {
          setError(result.error || 'Gagal memuat data cabang');
        }
      } catch (err: any) {
        console.error('Error loading cabang:', err);
        setError('Terjadi kesalahan saat memuat data cabang');
      } finally {
        setIsLoadingData(false);
      }
    };
    
    if (isOpen) {
      loadCabang();
    }
  }, [isOpen]);

  useEffect(() => {
    if (kas) {
      setFormData({
        nama_kas: kas.nama_kas,
        tipe_kas: kas.tipe_kas,
        no_rekening: kas.no_rekening,
        saldo: kas.saldo.toString(),
        cabang_id: kas.cabang_id?.toString() || '',
      });
    } else {
      setFormData({
        nama_kas: '',
        tipe_kas: '',
        no_rekening: '',
        saldo: '',
        cabang_id: '',
      });
    }
    setError(null);
  }, [kas, isOpen]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.nama_kas) {
      setError('Nama Kas harus diisi');
      return;
    }

    if (!formData.tipe_kas) {
      setError('Tipe Kas harus diisi');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        nama_kas: formData.nama_kas,
        tipe_kas: formData.tipe_kas,
        no_rekening: formData.no_rekening,
        saldo: parseFloat(formData.saldo) || 0,
        cabang_id: formData.cabang_id ? parseInt(formData.cabang_id) : null,
      };

      let result;
      if (kas) {
        result = await updateKas(kas.id, data);
      } else {
        result = await addKas(data);
      }

      if (result.success) {
        onSuccess();
        onClose();
        if (result.message) {
          alert(result.message);
        }
      } else {
        setError(result.error || result.message || 'Terjadi kesalahan');
      }
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={kas ? 'EDIT KAS' : 'TAMBAH KAS'}
    >
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoadingData && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 text-sm mt-2">Memuat data...</p>
          </div>
        )}

        {kas && (
          <div>
            <label className="block text-gray-700 mb-2">Kode Kas</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg"
              value={kas.id}
              disabled
            />
          </div>
        )}

        <div>
          <label className="block text-gray-700 mb-2">Nama Bank <span className="text-red-500">*</span></label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg"
            value={formData.nama_kas}
            onChange={(e) => setFormData({ ...formData, nama_kas: e.target.value })}
            disabled={isSubmitting}
            placeholder="Contoh: Bank BCA"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Tipe Kas <span className="text-red-500">*</span></label>
          <select
            className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg"
            value={formData.tipe_kas}
            onChange={(e) => setFormData({ ...formData, tipe_kas: e.target.value })}
            disabled={isSubmitting}
          >
            <option value="">Pilih Tipe Kas</option>
            <option value="Bank">Bank</option>
            <option value="Cash">Cash</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 mb-2">No Rekening</label>
          <input
            type="text"
            className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg"
            value={formData.no_rekening}
            onChange={(e) => setFormData({ ...formData, no_rekening: e.target.value })}
            disabled={isSubmitting}
            placeholder="Contoh: 1234567890"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Saldo</label>
          <input
            type="number"
            step="0.01"
            className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg"
            value={formData.saldo}
            onChange={(e) => setFormData({ ...formData, saldo: e.target.value })}
            disabled={isSubmitting}
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Kantor</label>
          <select
            className="w-full px-4 py-2 bg-blue-50 border border-gray-300 rounded-lg"
            value={formData.cabang_id}
            onChange={(e) => setFormData({ ...formData, cabang_id: e.target.value })}
            disabled={isSubmitting}
          >
            <option value="">-- Pilih Kantor --</option>
            {cabangList.map((cabang) => (
              <option key={cabang.id} value={cabang.id}>
                {cabang.nama_cabang}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingData}
            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Menyimpan...
              </>
            ) : (
              'Simpan'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
        </div>
      </div>
    </Modal>
  );
}