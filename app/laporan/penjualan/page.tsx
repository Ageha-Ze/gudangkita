'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, Calendar, FileText, Users, MapPin } from 'lucide-react';
import type { 
  PenjualanData,
  Summary,
  FilterState,
  TopCustomer,
  DetailPenjualan,
  Cicilan
} from '@/types/laporanjual';

export default function LaporanPenjualan() {
  const [data, setData] = useState<PenjualanData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    start_date: '',
    end_date: '',
    cabang_id: '',
    customer_id: '',
    pegawai_id: '',
    status_pembayaran: '',
    status_diterima: '',
    jenis_pembayaran: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<PenjualanData | null>(null);

  useEffect(() => {
    fetchLaporan();
  }, []);

  const fetchLaporan = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      console.log('🔍 Fetching with params:', params.toString());

      const response = await fetch(`/api/laporan/penjualan?${params}`);
      const result = await response.json();
      
      console.log('✅ API Response:', result);
      
      if (result.success) {
        console.log('📦 Data:', result.data);
        console.log('📊 Summary:', result.summary);
        setData(result.data);
        setSummary(result.summary);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Lunas': 'bg-green-100 text-green-800 border-green-200',
      'Cicil': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Belum Lunas': 'bg-red-100 text-red-800 border-red-200',
      'Diterima': 'bg-blue-100 text-blue-800 border-blue-200',
      'Belum Diterima': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    const headers = ['Tanggal', 'Nota', 'Customer', 'Cabang', 'Subtotal', 'Ongkir', 'Total', 'Terbayar', 'Sisa', 'Status'];
    const rows = data.map((p: PenjualanData) => [
      formatDate(p.tanggal),
      p.nota_penjualan,
      p.customer?.nama || '-',
      p.cabang?.nama_cabang || '-',
      p.subtotal,
      p.biaya_ongkir || 0,
      p.finalTotal,
      p.totalBayar,
      p.sisaTagihan,
      p.status_pembayaran,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-penjualan-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Memuat laporan...</p>
        </div>
      </div>
    );
  }

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header - sama seperti sebelumnya */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-600" />
              Laporan Penjualan
            </h1>
            <p className="text-slate-600 mt-2">Ringkasan dan detail transaksi penjualan</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-blue-100 text-sm font-medium">Total Penjualan</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(summary.totalNilaiPenjualan)}</p>
            <p className="text-blue-100 text-xs mt-2">{summary.totalPenjualan} transaksi</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-green-100 text-sm font-medium">Total Terbayar</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(summary.totalTerbayar)}</p>
            <p className="text-green-100 text-xs mt-2">
              {((summary.totalTerbayar / summary.totalNilaiPenjualan) * 100).toFixed(1)}% dari total
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-8 h-8 opacity-80" />
              <TrendingDown className="w-6 h-6" />
            </div>
            <p className="text-red-100 text-sm font-medium">Sisa Tagihan</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(summary.totalSisaTagihan)}</p>
            <p className="text-red-100 text-xs mt-2">{summary.statusPembayaran.belumLunas + summary.statusPembayaran.cicil} transaksi belum lunas</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Package className="w-8 h-8 opacity-80" />
              <Users className="w-6 h-6" />
            </div>
            <p className="text-purple-100 text-sm font-medium">Rata-rata Transaksi</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(summary.rataRataPenjualan)}</p>
            <p className="text-purple-100 text-xs mt-2">per transaksi</p>
          </div>
        </div>
      )}

       {/* Status Overview */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Pembayaran */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-lg mb-4 text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Status Pembayaran
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
                <span className="font-medium text-green-800">Lunas</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-600">{summary.statusPembayaran.lunas}</span>
                  <p className="text-xs text-green-600 mt-1">{formatCurrency(summary.nilaiByStatusPembayaran.lunas)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-200 hover:shadow-md transition-shadow">
                <span className="font-medium text-yellow-800">Cicilan</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-yellow-600">{summary.statusPembayaran.cicil}</span>
                  <p className="text-xs text-yellow-600 mt-1">{formatCurrency(summary.nilaiByStatusPembayaran.cicil)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200 hover:shadow-md transition-shadow">
                <span className="font-medium text-red-800">Belum Lunas</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-red-600">{summary.statusPembayaran.belumLunas}</span>
                  <p className="text-xs text-red-600 mt-1">{formatCurrency(summary.nilaiByStatusPembayaran.belumLunas)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 Customer */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-lg mb-4 text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Top 5 Customer
            </h3>
            <div className="space-y-3">
              {summary.topCustomer && summary.topCustomer.length > 0 ? (
                summary.topCustomer.slice(0, 5).map((customer: TopCustomer, idx: number) => (
                  <div key={customer.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all hover:scale-[1.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="font-medium text-slate-800 block">{customer.nama}</span>
                        <span className="text-xs text-slate-500">{customer.count} transaksi</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">{formatCurrency(customer.total)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Belum ada data customer</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-slate-700 hover:text-blue-600 font-medium transition-colors"
        >
          <Filter className="w-5 h-5" />
          {showFilters ? 'Sembunyikan' : 'Tampilkan'} Filter
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Mulai</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Akhir</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status Pembayaran</label>
              <select
                value={filters.status_pembayaran}
                onChange={(e) => setFilters({ ...filters, status_pembayaran: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Status</option>
                <option value="Lunas">Lunas</option>
                <option value="Cicil">Cicil</option>
                <option value="Belum Lunas">Belum Lunas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Jenis Pembayaran</label>
              <select
                value={filters.jenis_pembayaran}
                onChange={(e) => setFilters({ ...filters, jenis_pembayaran: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Jenis</option>
                <option value="tunai">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="hutang">Hutang</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <button
                onClick={fetchLaporan}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                <Search className="w-5 h-5 inline mr-2" />
                Terapkan Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nota</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Cabang</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Terbayar</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Sisa</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Tidak ada data penjualan</p>
                    <p className="text-slate-400 text-sm mt-1">Coba ubah filter pencarian</p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(item.tanggal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-blue-600">{item.nota_penjualan}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{item.customer?.nama || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{item.cabang?.nama_cabang || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-slate-800">
                      {formatCurrency(item.finalTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                      {formatCurrency(item.totalBayar)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-red-600">
                      {formatCurrency(item.sisaTagihan)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status_pembayaran)}`}>
                        {item.status_pembayaran}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setSelectedDetail(item)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Detail Penjualan</h2>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Info Umum */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Nota Penjualan</p>
                  <p className="text-lg font-semibold text-slate-800">{selectedDetail.nota_penjualan}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Tanggal</p>
                  <p className="text-lg font-semibold text-slate-800">{formatDate(selectedDetail.tanggal)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Customer</p>
                  <p className="text-lg font-semibold text-slate-800">{selectedDetail.customer?.nama || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Cabang</p>
                  <p className="text-lg font-semibold text-slate-800">{selectedDetail.cabang?.nama_cabang || '-'}</p>
                </div>
              </div>

              {/* Ringkasan Pembayaran */}
              <div className="bg-slate-50 rounded-xl p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(selectedDetail.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Ongkir</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(selectedDetail.biaya_ongkir || 0)}</span>
                </div>
                <div className="border-t border-slate-300 pt-3 flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-800">Total</span>
                  <span className="text-lg font-bold text-slate-800">{formatCurrency(selectedDetail.finalTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-medium">Terbayar</span>
                  <span className="font-bold">{formatCurrency(selectedDetail.totalBayar)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span className="font-medium">Sisa Tagihan</span>
                  <span className="font-bold">{formatCurrency(selectedDetail.sisaTagihan)}</span>
                </div>
              </div>

              {/* Detail Produk */}
              {selectedDetail.detail_penjualan && selectedDetail.detail_penjualan.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Produk</h3>
                  <div className="space-y-3">
                    {selectedDetail.detail_penjualan.map((detail: DetailPenjualan) => (
                      <div key={detail.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-800">{detail.produk?.nama_produk || '-'}</p>
                          <p className="text-sm text-slate-500">{detail.jumlah} x {formatCurrency(detail.harga)}</p>
                        </div>
                        <p className="font-semibold text-slate-800">{formatCurrency(detail.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Riwayat Cicilan */}
              {selectedDetail.cicilan && selectedDetail.cicilan.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Riwayat Cicilan</h3>
                  <div className="space-y-3">
                    {selectedDetail.cicilan.map((cicil: Cicilan, index: number) => (
                      <div key={cicil.id} className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <p className="font-medium text-slate-800">{formatDate(cicil.tanggal_cicilan)}</p>
                          <p className="text-sm text-slate-500">Cicilan ke-{index + 1}</p>
                        </div>
                        <p className="font-semibold text-green-600">{formatCurrency(cicil.jumlah_cicilan)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}