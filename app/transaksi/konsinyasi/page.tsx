'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, Eye, Trash2, Store, ShoppingCart } from 'lucide-react';

interface TokoKonsinyasi {
  id: number;
  kode_toko: string;
  nama_toko: string;
  pemilik?: string;
  alamat?: string;
  no_telp?: string;
  status: string;
  cabang?: {
    nama_cabang: string;
  };
}

interface DetailKonsinyasi {
  id: number;
  jumlah_titip: number;
  jumlah_terjual: number;
  jumlah_sisa: number;
  jumlah_kembali: number;
  subtotal_nilai_titip: number;
  harga_konsinyasi: number;
}

interface TransaksiKonsinyasi {
  id: number;
  kode_konsinyasi: string;
  tanggal_titip: string;
  total_nilai_titip: number;
  status: string;
  toko?: {
    nama_toko: string;
  };
  cabang?: {
    nama_cabang: string;
  };
  detail_konsinyasi?: DetailKonsinyasi[];
}

export default function KonsinyasiPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'transaksi' | 'toko'>('transaksi');
  const [transaksiList, setTransaksiList] = useState<TransaksiKonsinyasi[]>([]);
  const [tokoList, setTokoList] = useState<TokoKonsinyasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === 'transaksi') {
      fetchTransaksi();
    } else {
      fetchToko();
    }
  }, [activeTab, page, search]);

  const fetchTransaksi = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/transaksi/konsinyasi?page=${page}&limit=10&search=${search}`);
      const json = await res.json();
      
      setTransaksiList(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching transaksi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchToko = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/transaksi/konsinyasi/toko?page=${page}&limit=10&search=${search}`);
      const json = await res.json();
      
      setTokoList(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching toko:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToko = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus toko ini?')) return;

    try {
      const res = await fetch(`/api/transaksi/konsinyasi/toko?id=${id}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (res.ok) {
        alert('Toko berhasil dihapus');
        fetchToko();
      } else {
        alert(json.error || 'Gagal menghapus toko');
      }
    } catch (error) {
      console.error('Error deleting toko:', error);
      alert('Terjadi kesalahan saat menghapus');
    }
  };

  const handleDeleteKonsinyasi = async (id: number) => {
    if (!confirm('⚠️ PERINGATAN!\n\nMenghapus konsinyasi akan:\n• Menghapus semua detail barang\n• Menghapus semua penjualan terkait\n• Mengembalikan stock produk ke gudang\n\nApakah Anda yakin ingin melanjutkan?')) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/transaksi/konsinyasi?id=${id}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (res.ok) {
        alert('✅ Konsinyasi berhasil dihapus dan stock dikembalikan ke gudang');
        fetchTransaksi();
      } else {
        alert(`❌ ${json.error || 'Gagal menghapus konsinyasi'}`);
      }
    } catch (error) {
      console.error('Error deleting konsinyasi:', error);
      alert('Terjadi kesalahan saat menghapus');
    } finally {
      setLoading(false);
    }
  };

  // Calculate hasil penjualan (total dari jumlah_terjual * harga_konsinyasi)
  const calculateHasilPenjualan = (detail?: DetailKonsinyasi[]) => {
    if (!detail || detail.length === 0) return 0;
    
    return detail.reduce((total, item) => {
      return total + (item.jumlah_terjual * item.harga_konsinyasi);
    }, 0);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-lg border-l-4 border-indigo-500">
        <div className="bg-indigo-500 p-3 rounded-lg">
          <Package className="text-white" size={24} />
        </div>
        <div>
          <p className="text-sm text-indigo-600">Transaksi</p>
          <h1 className="text-2xl font-bold text-indigo-700">Konsinyasi / Penitipan Barang</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setActiveTab('transaksi');
            setPage(1);
            setSearch('');
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
            activeTab === 'transaksi'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-indigo-50'
          }`}
        >
          <ShoppingCart size={20} />
          <span className="font-medium">Transaksi Konsinyasi</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('toko');
            setPage(1);
            setSearch('');
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
            activeTab === 'toko'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-indigo-50'
          }`}
        >
          <Store size={20} />
          <span className="font-medium">Master Toko</span>
        </button>
      </div>

      {/* Search & Add Button */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Search:</label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Cari..."
          />
        </div>
        <button
          onClick={() => {
            if (activeTab === 'transaksi') {
              router.push('/transaksi/konsinyasi/tambah');
            } else {
              router.push('/transaksi/konsinyasi/toko/tambah');
            }
          }}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={20} />
          Tambah {activeTab === 'transaksi' ? 'Konsinyasi' : 'Toko'}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'transaksi' ? (
        // Table Transaksi
        <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-indigo-200">
          <table className="w-full border-collapse">
            <thead className="bg-indigo-100">
              <tr>
                <th className="px-4 py-3 text-left border border-indigo-200">Kode</th>
                <th className="px-4 py-3 text-left border border-indigo-200">Tanggal</th>
                <th className="px-4 py-3 text-left border border-indigo-200">Toko</th>
                <th className="px-4 py-3 text-left border border-indigo-200">Cabang</th>
                <th className="px-4 py-3 text-right border border-indigo-200">Total Nilai Titip</th>
                <th className="px-4 py-3 text-right border border-indigo-200">Hasil Penjualan</th>
                <th className="px-4 py-3 text-left border border-indigo-200">Status</th>
                <th className="px-4 py-3 text-center border border-indigo-200">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 border border-indigo-200">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : transaksiList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 border border-indigo-200">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Package className="w-12 h-12 opacity-50" />
                      <p className="font-medium">Belum ada transaksi konsinyasi</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transaksiList.map((item, index) => {
                  const hasilPenjualan = calculateHasilPenjualan(item.detail_konsinyasi);
                  const persentaseTerjual = item.total_nilai_titip > 0 
                    ? (hasilPenjualan / item.total_nilai_titip * 100) 
                    : 0;

                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-indigo-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-indigo-50'
                      } hover:bg-indigo-100 transition-colors`}
                    >
                      <td className="px-4 py-3 border border-indigo-200 font-medium text-indigo-700">
                        {item.kode_konsinyasi}
                      </td>
                      <td className="px-4 py-3 border border-indigo-200">
                        {new Date(item.tanggal_titip).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3 border border-indigo-200">
                        {item.toko?.nama_toko || '-'}
                      </td>
                      <td className="px-4 py-3 border border-indigo-200">
                        {item.cabang?.nama_cabang || '-'}
                      </td>
                      <td className="px-4 py-3 text-right border border-indigo-200 font-semibold">
                        Rp {item.total_nilai_titip.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 border border-indigo-200">
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            Rp {hasilPenjualan.toLocaleString('id-ID')}
                          </div>
                          {item.total_nilai_titip > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {persentaseTerjual.toFixed(1)}% terjual
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 border border-indigo-200">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'Aktif' ? 'bg-green-100 text-green-800' :
                          item.status === 'Selesai' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-indigo-200">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => router.push(`/transaksi/konsinyasi/${item.id}`)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                            title="Detail"
                          >
                            <Eye size={18} />
                          </button>
                          {item.status === 'Aktif' && (
                            <button
                              onClick={() => handleDeleteKonsinyasi(item.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                              title="Hapus Konsinyasi"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        // Table Toko
        <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-indigo-200">
          <table className="w-full border-collapse">
            <thead className="bg-indigo-100">
              <tr>
                <th className="px-4 py-3 text-left border border-indigo-200">Kode</th>
                <th className="px-4 py-3 text-left border border-indigo-200">Nama Toko</th>
                <th className="px-4 py-3 text-left border border-indigo-200">Pemilik</th>
                <th className="px-4 py-3 text-left border border-indigo-200">No Telp</th>
                <th className="px-4 py-3 text-left border border-indigo-200">Alamat</th>
                <th className="px-4 py-3 text-left border border-indigo-200">Status</th>
                <th className="px-4 py-3 text-center border border-indigo-200">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 border border-indigo-200">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-500 font-medium">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : tokoList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 border border-indigo-200">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Store className="w-12 h-12 opacity-50" />
                      <p className="font-medium">Belum ada toko konsinyasi</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tokoList.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b border-indigo-200 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-indigo-50'
                    } hover:bg-indigo-100 transition-colors`}
                  >
                    <td className="px-4 py-3 border border-indigo-200 font-medium text-indigo-700">
                      {item.kode_toko}
                    </td>
                    <td className="px-4 py-3 border border-indigo-200 font-medium">
                      {item.nama_toko}
                    </td>
                    <td className="px-4 py-3 border border-indigo-200">{item.pemilik || '-'}</td>
                    <td className="px-4 py-3 border border-indigo-200">{item.no_telp || '-'}</td>
                    <td className="px-4 py-3 border border-indigo-200">
                      {item.alamat ? (
                        <div className="max-w-xs truncate" title={item.alamat}>
                          {item.alamat}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 border border-indigo-200">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 border border-indigo-200">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => router.push(`/transaksi/konsinyasi/toko/${item.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                          title="Edit"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteToko(item.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8 bg-white p-4 rounded-lg shadow-md">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          
          <div className="flex gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-4 py-2 border border-indigo-300 rounded-lg transition ${
                    page === pageNum ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && (
              <>
                <span className="px-2 text-indigo-600 flex items-center">...</span>
                <button
                  onClick={() => setPage(totalPages)}
                  className={`px-4 py-2 border border-indigo-300 rounded-lg transition ${
                    page === totalPages ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-100'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}