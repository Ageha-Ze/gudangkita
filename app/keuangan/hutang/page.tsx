'use client';

import { useState, useEffect } from 'react';
import { Receipt, Search, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';

interface HutangPembelian {
  id: number;
  total_hutang: number;
  dibayar: number;
  sisa: number;
  status: string;
  jatuh_tempo: string;
  suplier?: { nama: string };
  transaksi_pembelian?: {
    cabang?: {
      nama_cabang: string;
    };
  };
}

export default function HutangPembelianPage() {
  const [hutangList, setHutangList] = useState<HutangPembelian[]>([]);
  const [filteredData, setFilteredData] = useState<HutangPembelian[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHutang();
  }, [page, searchTerm]);

  const fetchHutang = async () => {
    try {
      setLoading(true);
      // Updated API endpoint path
      const res = await fetch(`/api/keuangan/hutang?page=${page}&limit=10&search=${searchTerm}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Fetch failed:', res.status, errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const json = await res.json();
      setHutangList(json.data || []);
      setFilteredData(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error fetching hutang:', errorMessage);
      alert(`Failed to load data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Format number to Rupiah
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Stats calculations
  const totalDebt = hutangList.reduce((sum, h) => sum + h.total_hutang, 0);
  const totalPaid = hutangList.reduce((sum, h) => sum + h.dibayar, 0);
  const totalRemaining = hutangList.reduce((sum, h) => sum + h.sisa, 0);
  const overdueCount = hutangList.filter(h => new Date(h.jatuh_tempo) < new Date() && h.status !== 'lunas').length;

  return (
    <div className="p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hutang Pembelian</h1>
              <p className="text-gray-500 text-sm mt-1">Pantau hutang pembelian per cabang ke supplier</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Hutang</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatRupiah(totalDebt)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Sudah Dibayar</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{formatRupiah(totalPaid)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Sisa Hutang</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">{formatRupiah(totalRemaining)}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Jatuh Tempo</p>
                <p className="text-3xl font-bold mt-2">{overdueCount}</p>
                <p className="text-red-100 text-xs mt-1">Belum lunas</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Toolbar */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari supplier, cabang, atau status..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cabang
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Hutang
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Dibayar
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sisa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium">Memuat data...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Receipt className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-gray-900 font-semibold text-lg">
                            {searchTerm ? 'Tidak ada hasil' : 'Belum ada hutang'}
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            {searchTerm 
                              ? 'Coba gunakan kata kunci lain' 
                              : 'Hutang pembelian akan muncul di sini'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((hutang) => (
                    <tr
                      key={hutang.id}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{hutang.suplier?.nama || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
<p className="text-gray-600 text-sm">{hutang.transaksi_pembelian?.cabang?.nama_cabang ?? '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-gray-900">{formatRupiah(hutang.total_hutang)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-green-600">{formatRupiah(hutang.dibayar)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-orange-600 font-semibold">{formatRupiah(hutang.sisa)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${
                          hutang.status === 'lunas' ? 'bg-green-100 text-green-700' :
                          hutang.status === 'belum_lunas' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {hutang.status === 'lunas' ? 'Lunas' : 
                           hutang.status === 'belum_lunas' ? 'Belum Lunas' : 
                           hutang.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filteredData.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold text-gray-900">{filteredData.length}</span> hutang
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-4 py-2 border border-gray-300 rounded-lg transition ${
                    page === pageNum ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && <span className="px-2 text-gray-600">...</span>}
            {totalPages > 5 && (
              <button
                onClick={() => setPage(totalPages)}
                className={`px-4 py-2 border border-gray-300 rounded-lg transition ${
                  page === totalPages ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
  );
}