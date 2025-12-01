'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, CheckCircle, Package, User, MapPin, Calendar, CreditCard, TrendingUp, Wallet, Receipt } from 'lucide-react';
import ModalTambahBarang from './ModalTambahBarang';
import ModalBilling from './ModalBilling';
import ModalCicilan from './ModalCicilan';
import { Penjualan } from '@/types/transaksi';
import { calculatePenjualanTotals } from '@/lib/transaksi/calculateTotals';
import ModalPelunasan from './ModalPelunasan';
import HistoryCicilan from './HistoryCicilan';
import ModalEditDataPenjualan from './ModalEditDataPenjualan';
import ModalEditBiayaPenjualan from './ModalEditBiayaPenjualan';
import ModalTerimaPenjualan from './ModalTerimaPenjualan';

interface CicilanItem {
  id: number;
  jumlah_cicilan: number;
}

export default function DetailPenjualanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string>('');
  const [penjualan, setPenjualan] = useState<Penjualan | null>(null);
  const [cicilans, setCicilans] = useState<CicilanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModalTambah, setShowModalTambah] = useState(false);
  const [showModalBilling, setShowModalBilling] = useState(false);
  const [showModalCicilan, setShowModalCicilan] = useState(false);
  const [showModalPelunasan, setShowModalPelunasan] = useState(false);
  const [showModalEditPenjualan, setShowModalEditPenjualan] = useState(false);
  const [showModalEditBiaya, setShowModalEditBiaya] = useState(false);
  const [showModalTerima, setShowModalTerima] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (id) {
      fetchPenjualan();
      fetchCicilans();
    }
  }, [id]);

  const fetchPenjualan = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/transaksi/penjualan/${id}`);
      const json = await res.json();
      setPenjualan(json.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCicilans = async () => {
    try {
      const res = await fetch(`/api/transaksi/penjualan/${id}/cicilan`);
      const json = await res.json();
      setCicilans(json.data || []);
    } catch (error) {
      console.error('Error fetching cicilans:', error);
      setCicilans([]);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus barang ini?')) return;

    try {
      const res = await fetch(
        `/api/transaksi/penjualan/${id}/items?itemId=${itemId}&penjualanId=${id}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        alert('Item berhasil dihapus');
        fetchPenjualan();
      } else {
        alert('Gagal menghapus item');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleBatal = async () => {
    if (!confirm('Apakah Anda yakin ingin membatalkan penjualan ini? Semua item akan dihapus.')) return;

    try {
      const res = await fetch(`/api/transaksi/penjualan/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Penjualan berhasil dibatalkan');
        router.push('/transaksi/penjualan');
      } else {
        alert('Gagal membatalkan penjualan');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleUpdate = () => {
    fetchPenjualan();
    fetchCicilans();
  };

  const generateNota = () => {
    if (!penjualan) return '';
    const tanggal = new Date(penjualan.tanggal).toISOString().split('T')[0].replace(/-/g, '');
    return `${String(penjualan.id).padStart(7, '0')}${tanggal}`;
  };

  const calculateTotalCicilan = () => {
    return cicilans.reduce((sum, c) => sum + Number(c.jumlah_cicilan || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!penjualan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Data tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const isBilled = penjualan.status === 'billed';
  const isLunas = penjualan.status_pembayaran === 'Lunas';
  const isHutang = penjualan.jenis_pembayaran === 'hutang';
  const isDiterima = (penjualan as any).status_diterima === 'Diterima';

  const totalCicilan = calculateTotalCicilan();
  const { subtotal, finalTotal, tagihan } = calculatePenjualanTotals(penjualan, {
    totalCicilan,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header dengan Glassmorphism */}
        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/transaksi/penjualan')}
                className="group p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <p className="text-sm font-medium text-indigo-600 mb-1">Transaksi Penjualan</p>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Detail Penjualan
                </h1>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
              <Receipt className="w-5 h-5" />
              <span className="font-bold text-lg">{generateNota()}</span>
            </div>
          </div>
        </div>

        {/* Status Penerimaan - Compact Card */}
        {isBilled && (
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-5 border border-purple-200/50 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isDiterima ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status Penerimaan</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-4 py-1.5 rounded-lg font-semibold text-sm shadow-md ${
                      isDiterima
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-white'
                    }`}>
                      {isDiterima ? 'Diterima' : 'Menunggu'}
                    </span>
                    {isDiterima && (penjualan as any).tanggal_diterima && (
                      <span className="text-xs text-gray-500">
                        {new Date((penjualan as any).tanggal_diterima).toLocaleDateString('id-ID')}
                        {(penjualan as any).diterima_oleh && ` • ${(penjualan as any).diterima_oleh}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!isDiterima && (
                <button
                  onClick={() => setShowModalTerima(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 font-medium"
                >
                  <CheckCircle className="w-5 h-5" />
                  Konfirmasi
                </button>
              )}
            </div>
          </div>
        )}

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <User className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Customer</p>
            </div>
            <p className="text-lg font-bold text-gray-800">{penjualan.customer?.nama || '-'}</p>
          </div>

          {/* Card 2 */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Gudang</p>
            </div>
            <p className="text-lg font-bold text-gray-800">{penjualan.pegawai?.cabang?.nama_cabang || '-'}</p>
          </div>

          {/* Card 3 */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Tanggal</p>
            </div>
            <p className="text-lg font-bold text-gray-800">{new Date(penjualan.tanggal).toLocaleDateString('id-ID')}</p>
          </div>

          {/* Card 4 */}
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl group-hover:scale-110 transition-transform ${
                isLunas ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'
              }`}>
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Status</p>
            </div>
            <p className={`text-lg font-bold ${isLunas ? 'text-green-600' : 'text-red-600'}`}>
              {penjualan.status_pembayaran}
            </p>
          </div>
        </div>

        {/* Detail Barang */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Detail Barang</h2>
              </div>
              {!isBilled && (
                <button
                  onClick={() => setShowModalTambah(true)}
                  className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 font-semibold"
                >
                  + Tambah Barang
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Kode</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nama Barang</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Harga</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Qty</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Subtotal</th>
                  {!isBilled && <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {penjualan.detail_penjualan.length === 0 ? (
                  <tr>
                    <td colSpan={isBilled ? 5 : 6} className="px-6 py-12 text-center text-gray-500">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p>Belum ada barang</p>
                    </td>
                  </tr>
                ) : (
                  penjualan.detail_penjualan.map((item, index) => (
                    <tr key={item.id} className="hover:bg-indigo-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600">{item.produk?.kode_produk || '-'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{item.produk?.nama_produk || '-'}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-700">
                        Rp {item.harga.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-700">
                        {parseFloat(item.jumlah.toString()).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-800">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </td>
                      {!isBilled && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Cards */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-md">
                <p className="text-sm text-gray-600 mb-1">Subtotal</p>
                <p className="text-xl font-bold text-gray-800">Rp {(subtotal || 0).toLocaleString('id-ID')}</p>
              </div>
              {isBilled && (
                <>
                  <div className="bg-white rounded-xl p-4 shadow-md">
                    <p className="text-sm text-gray-600 mb-1">Biaya Tambahan</p>
                    <p className="text-xl font-bold text-gray-800">
                      Rp {((penjualan.biaya_ongkir || 0) + (penjualan.biaya_potong || 0)).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-md">
                    <p className="text-sm text-gray-600 mb-1">Diskon</p>
                    <p className="text-xl font-bold text-red-600">- Rp {(penjualan.nilai_diskon || 0).toLocaleString('id-ID')}</p>
                  </div>
                </>
              )}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 shadow-lg">
                <p className="text-sm text-indigo-100 mb-1">Total Transaksi</p>
                <p className="text-2xl font-bold text-white">Rp {finalTotal.toLocaleString('id-ID')}</p>
              </div>
            </div>

            {isBilled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-700 font-medium">Uang Muka</p>
                  </div>
                  <p className="text-xl font-bold text-blue-600">Rp {(penjualan.uang_muka || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-700 font-medium">Total Cicilan</p>
                  </div>
                  <p className="text-xl font-bold text-green-600">Rp {totalCicilan.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-700 font-medium">Sisa Tagihan</p>
                  </div>
                  <p className="text-xl font-bold text-red-600">Rp {tagihan.toLocaleString('id-ID')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-white flex flex-wrap gap-3 justify-center border-t border-gray-200">
            {!isBilled ? (
              <>
                <button
                  onClick={() => setShowModalBilling(true)}
                  disabled={penjualan.detail_penjualan.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  Billing Sekarang
                </button>
                <button
                  onClick={handleBatal}
                  className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Batalkan
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/transaksi/penjualan')}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-all duration-300"
                >
                  Kembali
                </button>
                {isHutang && !isLunas && (
                  <>
                    <button
                      onClick={() => setShowModalCicilan(true)}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      Cicil
                    </button>
                    <button
                      onClick={() => setShowModalPelunasan(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      Lunasi
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowModalEditPenjualan(true)}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Edit Data
                </button>
                <button
                  onClick={() => setShowModalEditBiaya(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Edit Biaya
                </button>
              </>
            )}
          </div>
        </div>

        {/* History Cicilan */}
        {isBilled && isHutang && (
          <HistoryCicilan penjualanId={parseInt(id)} onUpdate={handleUpdate} />
        )}
      </div>

      {/* Modals */}
      {penjualan.pegawai?.cabang && (
        <ModalTambahBarang
          isOpen={showModalTambah}
          onClose={() => setShowModalTambah(false)}
          onSuccess={fetchPenjualan}
          penjualanId={parseInt(id)}
          cabangId={penjualan.pegawai.cabang.id}
        />
      )}

      <ModalBilling
        isOpen={showModalBilling}
        onClose={() => setShowModalBilling(false)}
        onSuccess={fetchPenjualan}
        penjualan={penjualan}
      />

      <ModalCicilan
        isOpen={showModalCicilan}
        onClose={() => setShowModalCicilan(false)}
        onSuccess={handleUpdate}
        penjualanId={parseInt(id)}
      />

      <ModalPelunasan
        isOpen={showModalPelunasan}
        onClose={() => setShowModalPelunasan(false)}
        onSuccess={handleUpdate}
        penjualanId={parseInt(id)}
      />

      <ModalEditDataPenjualan
        isOpen={showModalEditPenjualan}
        onClose={() => setShowModalEditPenjualan(false)}
        onSuccess={fetchPenjualan}
        penjualan={penjualan}
      />

      <ModalEditBiayaPenjualan
        isOpen={showModalEditBiaya}
        onClose={() => setShowModalEditBiaya(false)}
        onSuccess={fetchPenjualan}
        penjualan={penjualan}
      />

      <ModalTerimaPenjualan
        isOpen={showModalTerima}
        onClose={() => setShowModalTerima(false)}
        onSuccess={fetchPenjualan}
        penjualanId={parseInt(id)}
      />
    </div>
  );
}