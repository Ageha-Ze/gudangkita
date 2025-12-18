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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLaporan();
  }, []);

  const fetchLaporan = async () => {
  setLoading(true);
  setError(null);
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const response = await fetch(`/api/laporan/penjualan?${params}`);

    if (!response.ok) {
      let errorMessage = 'Gagal memuat laporan penjualan';

      if (response.status === 401) {
        errorMessage = 'Sesi login telah berakhir. Silakan login kembali.';
      } else if (response.status === 403) {
        errorMessage = 'Anda tidak memiliki akses untuk melihat laporan penjualan.';
      } else if (response.status === 500) {
        errorMessage = 'Server mengalami masalah. Silakan coba lagi dalam beberapa saat.';
      } else {
        const errorJson = await response.json().catch(() => null);
        if (errorJson?.error) {
          errorMessage += ': ' + errorJson.error;
        }
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (result.success === false) {
      throw new Error(result.error || 'Gagal memuat laporan penjualan');
    }

    setData(result.data || []);
    setSummary(result.summary);
  } catch (error: any) {
    console.error('Error fetching penjualan report:', error);
    let errorMessage = 'Terjadi kesalahan saat memuat data. Silakan periksa koneksi internet Anda.';
    if (error.message?.includes('NetworkError') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Koneksi internet bermasalah. Tidak dapat memuat laporan penjualan.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    setError(errorMessage);
    setData([]);
    setSummary(null);
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
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 md:p-6">
    <div className="max-w-7xl mx-auto">

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg flex items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <span className="text-red-500 shrink-0 text-lg sm:text-xl">⚠️</span>
            <p className="text-xs sm:text-sm font-medium break-words">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 font-bold text-xl shrink-0 w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" />
              Laporan Penjualan
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">Ringkasan dan analisis transaksi penjualan</p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 sm:flex-none px-3 py-2 sm:px-4 bg-white border-2 border-slate-200 rounded-lg sm:rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
            >
              <Filter className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Filter</span>
            </button>
            <button
              onClick={exportToCSV}
              className="flex-1 sm:flex-none px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-slate-200">
          <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-slate-900">Filter Laporan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Tanggal Mulai</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Tanggal Akhir</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Status Pembayaran</label>
              <select
                value={filters.status_pembayaran}
                onChange={(e) => setFilters({ ...filters, status_pembayaran: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="Lunas">Lunas</option>
                <option value="Cicil">Cicil</option>
                <option value="Belum Lunas">Belum Lunas</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-4">
            <button
              onClick={() => setFilters({ start_date: '', end_date: '', cabang_id: '', customer_id: '', pegawai_id: '', status_pembayaran: '', status_diterima: '', jenis_pembayaran: '' })}
              className="w-full sm:w-auto px-4 py-2 text-sm border-2 border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              Reset
            </button>
            <button
              onClick={fetchLaporan}
              className="w-full sm:w-auto px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-blue-100 text-xs sm:text-sm font-medium">Total Penjualan</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 break-all">{formatCurrency(summary.totalNilaiPenjualan)}</p>
            <p className="text-blue-100 text-xs mt-2">{summary.totalPenjualan} transaksi</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-green-100 text-xs sm:text-sm font-medium">Total Terbayar</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 break-all">{formatCurrency(summary.totalTerbayar)}</p>
            <p className="text-green-100 text-xs mt-2">
              {((summary.totalTerbayar / summary.totalNilaiPenjualan) * 100).toFixed(1)}% dari total
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-amber-100 text-xs sm:text-sm font-medium">Sisa Tagihan</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 break-all">{formatCurrency(summary.totalSisaTagihan)}</p>
            <p className="text-amber-100 text-xs mt-2">{summary.statusPembayaran.belumLunas + summary.statusPembayaran.cicil} transaksi belum lunas</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-purple-100 text-xs sm:text-sm font-medium">Biaya Tambahan</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 break-all">{formatCurrency(summary.rataRataPenjualan)}</p>
            <p className="text-purple-100 text-xs mt-2">Rata-rata transaksi</p>
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
                  <div key={customer.id || idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all">
  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
    {idx + 1}
  </div>
  <div className="flex-1 min-w-0">
    <div className="font-medium text-slate-800 text-sm truncate">{customer.nama}</div>
    <div className="text-xs text-slate-500">{customer.count} transaksi • {formatCurrency(customer.total)}</div>
  </div>
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

      {/* Data Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200 mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Tanggal</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Nota</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Cabang</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Subtotal</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Total</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Terbayar</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Sisa</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((item: PenjualanData) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-700">{formatDate(item.tanggal)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.nota_penjualan}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{item.customer?.nama || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {item.cabang?.nama_cabang || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-slate-700">{formatCurrency(item.subtotal)}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">{formatCurrency(item.finalTotal)}</td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">{formatCurrency(item.totalBayar)}</td>
                  <td className="px-6 py-4 text-sm text-right text-amber-600 font-medium">{formatCurrency(item.sisaTagihan)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status_pembayaran)}`}>
                      {item.status_pembayaran}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedDetail(item)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Cards - Mobile */}
      <div className="lg:hidden space-y-3 mb-6">
        {data.map((item: PenjualanData) => (
          <div key={item.id} className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 mb-1 truncate">{item.nota_penjualan}</p>
                <p className="text-xs text-slate-600">{formatDate(item.tanggal)}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium border shrink-0 ml-2 ${getStatusColor(item.status_pembayaran)}`}>
                {item.status_pembayaran}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Customer:</span>
                <span className="font-medium text-slate-900 text-right">{item.customer?.nama || '-'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Cabang:</span>
                <span className="font-medium text-slate-900 text-right">{item.cabang?.nama_cabang || '-'}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium text-slate-700">{formatCurrency(item.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-900">Total:</span>
                <span className="font-bold text-slate-900">{formatCurrency(item.finalTotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-600">Terbayar:</span>
                <span className="font-medium text-green-600">{formatCurrency(item.totalBayar)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-amber-600">Sisa:</span>
                <span className="font-medium text-amber-600">{formatCurrency(item.sisaTagihan)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedDetail(item)}
              className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium"
            >
              Lihat Detail
            </button>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold">Detail Penjualan</h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1 truncate">{selectedDetail.nota_penjualan}</p>
                </div>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl transition-all flex items-center justify-center shrink-0 text-xl"
                >
                  ✕
                </button>
              </div>
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
