'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Printer, Trash2 } from 'lucide-react';
import ModalTambahPenjualan from './ModalTambahPenjualan';
import ModalPrintNota from './ModalPrintNota';

interface Penjualan {
  id: number;
  tanggal: string;
  nota_penjualan: string;
  total: number;
  sisa_tagihan: number;
  status: string;
  status_pembayaran: string;
  jenis_pembayaran: string;
  customer?: {
    nama: string;
  };
  pegawai?: {
    nama: string;
    cabang?: {
      nama_cabang: string;
    };
  };
}

export default function PenjualanListPage() {
  const router = useRouter();
  const [penjualans, setPenjualans] = useState<Penjualan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModalTambah, setShowModalTambah] = useState(false);
  const [showModalPrint, setShowModalPrint] = useState(false);
  const [selectedPenjualanId, setSelectedPenjualanId] = useState<number>(0);
  const limit = 10;

  useEffect(() => {
    fetchPenjualans();
  }, [page, search]);

  const fetchPenjualans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search
      });
      
      const res = await fetch(`/api/transaksi/penjualan?${params}`);
      const json = await res.json();
      
      setPenjualans(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus penjualan ini?')) return;

    try {
      const res = await fetch(`/api/transaksi/penjualan/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Penjualan berhasil dihapus');
        fetchPenjualans();
      } else {
        const error = await res.json();
        alert(error.error || 'Gagal menghapus penjualan');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handlePrint = (id: number) => {
    setSelectedPenjualanId(id);
    setShowModalPrint(true);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-lg border-l-4 border-indigo-500">
        <div>
          <p className="text-sm text-indigo-600">Transaksi</p>
          <h1 className="text-2xl font-bold text-indigo-700">Daftar Penjualan</h1>
        </div>
      </div>

      {/* Search Bar and Add Button */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari..."
          className="flex-1 px-4 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => setShowModalTambah(true)}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
        >
          <Plus size={20} />
          Tambah
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-indigo-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Tanggal</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nota</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Sales</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Cabang</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Sisa Tagihan</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Pembayaran</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-8">
                    Loading...
                  </td>
                </tr>
              ) : penjualans.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                penjualans.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`border-b hover:bg-indigo-50 transition ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-sm">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(item.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {item.nota_penjualan}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.customer?.nama || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.pegawai?.nama || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.pegawai?.cabang?.nama_cabang || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">
                      Rp. {item.total.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {item.status === 'billed' ? (
                        <span className={`font-bold ${
                          item.sisa_tagihan > 0 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          Rp. {item.sisa_tagihan.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'billed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status === 'billed' ? 'Billed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status_pembayaran === 'Lunas'
                          ? 'bg-green-100 text-green-800'
                          : item.status_pembayaran === 'Cicil'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status_pembayaran}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => router.push(`/transaksi/penjualan/${item.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handlePrint(item.id)}
                          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition"
                          title="Print"
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Hapus"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t bg-gray-50">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              « Previous
            </button>
            <span className="text-sm text-gray-600">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next »
            </button>
          </div>
        )}
      </div>

      {/* Modal Tambah Penjualan */}
      <ModalTambahPenjualan
        isOpen={showModalTambah}
        onClose={() => setShowModalTambah(false)}
        onSuccess={() => {
          setShowModalTambah(false);
          fetchPenjualans();
        }}
      />

      {/* Modal Print Nota */}
      <ModalPrintNota
        isOpen={showModalPrint}
        onClose={() => setShowModalPrint(false)}
        penjualanId={selectedPenjualanId}
      />
    </div>
  );
}