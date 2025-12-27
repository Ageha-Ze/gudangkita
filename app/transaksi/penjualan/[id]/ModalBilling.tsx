'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { calculatePenjualanTotals } from '@/lib/transaksi/calculateTotals';

interface DetailPenjualan {
  subtotal: number;
}

interface Customer {
  nama: string;
}

interface Penjualan {
  id: number;
  tanggal: string;
  total: number;
  customer?: Customer;
  nilai_diskon?: number;
  uang_muka?: number;
  detail_penjualan?: DetailPenjualan[];
}

interface ModalBillingProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  penjualan: Penjualan | null;
}

interface Kas {
  id: number;
  nama_kas: string;
  saldo: number;
  no_rekening?: string;
}

export default function ModalBilling({
  isOpen,
  onClose,
  onSuccess,
  penjualan,
}: ModalBillingProps) {
  const [formData, setFormData] = useState<{
    jenis_pembayaran: string;
    kas_id: number;
    biaya_lain: boolean;
    biaya_ongkir: number;
    biaya_potong: number;
    jatuh_tempo: string;
  }>({
    jenis_pembayaran: '',
    kas_id: 0,
    biaya_lain: false,
    biaya_ongkir: 0,
    biaya_potong: 0,
    jatuh_tempo: '',
  });
  const [kasList, setKasList] = useState<Kas[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingKas, setLoadingKas] = useState(false);

  useEffect(() => {
    if (isOpen && penjualan) {
      fetchKas();
      // Reset form when modal opens
      setFormData({
        jenis_pembayaran: '',
        kas_id: 0,
        biaya_lain: false,
        biaya_ongkir: 0,
        biaya_potong: 0,
        jatuh_tempo: '',
      });
    }
  }, [isOpen, penjualan]);

  const fetchKas = async () => {
    try {
      setLoadingKas(true);
      // Get kas accounts filtered by the current penjualan branch
      const cabangId = (penjualan as any).cabang_id;
      const url = cabangId ? `/api/master/kas?cabang_id=${cabangId}` : '/api/master/kas';
      const res = await fetch(url);
      const json = await res.json();
      setKasList(json.data || []);
    } catch (error) {
      console.error('Error fetching kas:', error);
      setKasList([]);
    } finally {
      setLoadingKas(false);
    }
  };

  const calculateFinalTotal = () => {
    if (!penjualan) return 0;
    // Build a preview penjualan that includes the temporary biaya values
    const preview = {
      ...penjualan,
      biaya_ongkir: formData.biaya_lain ? formData.biaya_ongkir : 0,
      biaya_potong: formData.biaya_lain ? formData.biaya_potong : 0,
      nilai_diskon: (penjualan as any).nilai_diskon || 0,
      uang_muka: (penjualan as any).uang_muka || 0,
    } as any;

    const { finalTotal } = calculatePenjualanTotals(preview);
    return finalTotal;
  };

  const generateNota = () => {
    if (!penjualan) return '';
    const tanggal = new Date(penjualan.tanggal).toISOString().split('T')[0].replace(/-/g, '');
    return `${String(penjualan.id).padStart(7, '0')}${tanggal}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!penjualan) return;

    if (!formData.jenis_pembayaran) {
      alert('Pilih jenis pembayaran terlebih dahulu');
      return;
    }

    if (formData.jenis_pembayaran === 'tunai' && formData.kas_id === 0) {
      alert('Pilih rekening kas terlebih dahulu');
      return;
    }

    if (formData.jenis_pembayaran === 'hutang' && !formData.jatuh_tempo) {
      alert('Jatuh tempo harus diisi untuk pembayaran hutang');
      return;
    }

    // Additional uang_muka validation - if uang_muka field used or accessible
    const uang_muka = (penjualan as any).uang_muka || 0;
    // Calculate sisa tagihan from penjualan totals
    const preview = {
      ...penjualan,
      biaya_ongkir: formData.biaya_lain ? formData.biaya_ongkir : 0,
      biaya_potong: formData.biaya_lain ? formData.biaya_potong : 0,
      nilai_diskon: penjualan?.nilai_diskon || 0,
      uang_muka,
    } as any;
    const { tagihan } = calculatePenjualanTotals(preview);

    if (uang_muka > tagihan) {
      alert(`Uang muka tidak boleh melebihi total sisa tagihan: Rp. ${tagihan.toLocaleString('id-ID')}`);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/transaksi/penjualan/${penjualan.id}/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis_pembayaran: formData.jenis_pembayaran,
          kas_id: formData.kas_id,
          biaya_ongkir: formData.biaya_lain ? formData.biaya_ongkir : 0,
          biaya_potong: formData.biaya_lain ? formData.biaya_potong : 0,
          nilai_diskon: penjualan?.nilai_diskon || 0,
          jatuh_tempo: formData.jatuh_tempo || null,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        alert(json.message || 'Billing berhasil diproses');
        onSuccess();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || 'Gagal memproses billing');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !penjualan) return null;

  return (
    <>
      {/* Full Screen Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">Memproses Billing...</p>
              <p className="text-sm text-gray-600">Mohon tunggu sebentar</p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-yellow-50 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">BILLING PENJUALAN BARANG</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nota & Tanggal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nota Penjualan</label>
              <input
                type="text"
                value={generateNota()}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tgl jual</label>
              <input
                type="text"
                value={new Date(penjualan.tanggal).toLocaleDateString('id-ID')}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100 text-sm"
              />
            </div>
          </div>

          {/* Nama Customer */}
          <div>
            <label className="block text-sm font-medium mb-1">Nama Customer</label>
            <input
              type="text"
              value={penjualan.customer?.nama || '-'}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-100"
            />
          </div>

          {/* Sub Total Produk */}
          <div>
            <label className="block text-sm font-medium mb-1">Sub Total Produk</label>
              <input
                type="text"
                value={`Rp. ${((penjualan as any).detail_penjualan || []).reduce((s: number, d: any) => s + (Number(d.subtotal) || 0), 0).toLocaleString('id-ID')}`}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100"
              />
            </div>

          {/* Final Total */}
          <div>
            <label className="block text-sm font-medium mb-1">Final Total</label>
            <input
              type="text"
              value={`Rp. ${calculateFinalTotal().toLocaleString('id-ID')}`}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 font-bold"
            />
          </div>

          {/* Jenis Pembayaran */}
          <div>
            <label className="block text-sm font-medium mb-1">Jenis Pembayaran</label>
            <select
              value={formData.jenis_pembayaran}
              onChange={(e) =>
                setFormData({ ...formData, jenis_pembayaran: e.target.value, kas_id: 0 })
              }
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Pilih Jenis Pembayaran</option>
              <option value="tunai">Tunai</option>
              <option value="hutang">Hutang</option>
            </select>
          </div>

          {/* Pilih Kas (jika tunai) */}
          {formData.jenis_pembayaran === 'tunai' && (
            <div>
              <label className="block text-sm font-medium mb-1">Pilih Rekening Kas</label>
              {loadingKas ? (
                <input
                  type="text"
                  value="Loading..."
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100"
                />
              ) : (
                <select
                  value={formData.kas_id}
                  onChange={(e) =>
                    setFormData({ ...formData, kas_id: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value={0}>-- Pilih Kas --</option>
                  {kasList.map((kas) => (
                    <option key={kas.id} value={kas.id}>
                      {kas.nama_kas} - Saldo: Rp. {kas.saldo.toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Jatuh Tempo (jika hutang) */}
          {formData.jenis_pembayaran === 'hutang' && (
            <div>
              <label className="block text-sm font-medium mb-1">Jatuh Tempo</label>
              <input
                type="date"
                value={formData.jatuh_tempo}
                onChange={(e) =>
                  setFormData({ ...formData, jatuh_tempo: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
          )}

          {/* Checkbox Biaya Lain */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="biayaLain"
              checked={formData.biaya_lain}
              onChange={(e) =>
                setFormData({ ...formData, biaya_lain: e.target.checked })
              }
            />
            <label htmlFor="biayaLain" className="text-sm font-medium">
              Biaya Lain
            </label>
          </div>

          {/* Biaya Ongkir & Potong */}
          {formData.biaya_lain && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Biaya Kirim</label>
                <input
                  type="number"
                  value={formData.biaya_ongkir || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      biaya_ongkir: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Biaya Kemas</label>
                <input
                  type="number"
                  value={formData.biaya_potong || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      biaya_potong: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="0"
                />
              </div>
            </>
          )}

          {/* Status Pembayaran Info */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lunas"
                checked={formData.jenis_pembayaran === 'tunai'}
                readOnly
              />
              <label htmlFor="lunas">Lunas</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="dp" disabled />
              <label htmlFor="dp" className="text-gray-400">DP</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cbd" disabled />
              <label htmlFor="cbd" className="text-gray-400">CBD</label>
            </div>
          </div>

          {/* Tagihan */}
          <div>
            <label className="block text-sm font-medium mb-1">Tagihan</label>
            <input
              type="text"
              value={`Rp. ${calculateFinalTotal().toLocaleString('id-ID')}`}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-100 font-bold"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-center mt-6">
            <button
              type="submit"
              disabled={loading || loadingKas}
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
    </>
  );
}
