'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, Calendar, FileText, Users, MapPin } from 'lucide-react';
import type { 
  PembelianData,
  Summary,
  FilterState,
  TopSuplier,
  DetailPembelian,
  Cicilan
} from '@/types/laporanbeli';

export default function LaporanPembelian() {
  const [data, setData] = useState<PembelianData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    start_date: '',
    end_date: '',
    cabang_id: '',
    suplier_id: '',
    status_pembayaran: '',
    status_barang: '',
    jenis_pembayaran: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<PembelianData | null>(null);
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

    const response = await fetch(`/api/laporan/pembelian?${params}`);

    if (!response.ok) {
      let errorMessage = 'Gagal memuat laporan pembelian';

      if (response.status === 401) {
        errorMessage = 'Sesi login telah berakhir. Silakan login kembali.';
      } else if (response.status === 403) {
        errorMessage = 'Anda tidak memiliki akses untuk melihat laporan pembelian.';
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
      throw new Error(result.error || 'Gagal memuat laporan pembelian');
    }

    setData(result.data || []);
    setSummary(result.summary);
  } catch (error: any) {
    console.error('Error fetching pembelian report:', error);
    let errorMessage = 'Terjadi kesalahan saat memuat data. Silakan periksa koneksi internet Anda.';
    if (error.message?.includes('NetworkError') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Koneksi internet bermasalah. Tidak dapat memuat laporan pembelian.';
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
    const headers = ['Tanggal', 'Nota', 'Supplier', 'Cabang', 'Subtotal', 'Biaya Kirim', 'Total', 'Terbayar', 'Sisa', 'Status'];
    const rows = data.map((p: PembelianData) => [
      formatDate(p.tanggal),
      p.nota_supplier,
      p.suplier?.nama || '-',
      p.cabang?.nama_cabang || '-',
      p.subtotal,
      p.biaya_kirim || 0,
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
    a.download = `laporan-pembelian-${new Date().toISOString().split('T')[0]}.csv`;
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
              Laporan Pembelian
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">Ringkasan dan analisis transaksi pembelian</p>
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
              onClick={() => setFilters({ start_date: '', end_date: '', cabang_id: '', suplier_id: '', status_pembayaran: '', status_barang: '', jenis_pembayaran: '' })}
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
            <p className="text-blue-100 text-xs sm:text-sm font-medium">Total Pembelian</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 break-all">{formatCurrency(summary.totalNilaiPembelian)}</p>
            <p className="text-blue-100 text-xs mt-2">{summary.totalPembelian} transaksi</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
              <span className="text-[10px] xs:text-xs bg-white/20 px-2 py-1 rounded-full">Lunas</span>
            </div>
            <p className="text-green-100 text-xs sm:text-sm font-medium">Sudah Terbayar</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 break-all">{formatCurrency(summary.totalTerbayar)}</p>
            <p className="text-green-100 text-xs mt-2">{summary.statusPembayaran.lunas} lunas</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-amber-100 text-xs sm:text-sm font-medium">Sisa Tagihan</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 break-all">{formatCurrency(summary.totalSisaTagihan)}</p>
            <p className="text-amber-100 text-xs mt-2">{summary.statusPembayaran.cicil} cicilan</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-purple-100 text-xs sm:text-sm font-medium">Biaya Tambahan</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 break-all">{formatCurrency(summary.totalBiayaKirim)}</p>
            <p className="text-purple-100 text-xs mt-2">Biaya kirim</p>
          </div>
        </div>
      )}

      {/* Status Overview */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-slate-200">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 text-slate-900">Status Pembayaran</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-green-50 rounded-lg sm:rounded-xl border border-green-200">
                <span className="font-medium text-sm sm:text-base text-green-800">Lunas</span>
                <span className="text-xl sm:text-2xl font-bold text-green-600">{summary.statusPembayaran.lunas}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-yellow-50 rounded-lg sm:rounded-xl border border-yellow-200">
                <span className="font-medium text-sm sm:text-base text-yellow-800">Cicilan</span>
                <span className="text-xl sm:text-2xl font-bold text-yellow-600">{summary.statusPembayaran.cicil}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-red-50 rounded-lg sm:rounded-xl border border-red-200">
                <span className="font-medium text-sm sm:text-base text-red-800">Belum Lunas</span>
                <span className="text-xl sm:text-2xl font-bold text-red-600">{summary.statusPembayaran.belumLunas}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-lg mb-4 text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Top 5 Supplier
            </h3>
            <div className="space-y-3">
              {summary.topSuplier && summary.topSuplier.length > 0 ? (
                summary.topSuplier.slice(0, 5).map((supplier: TopSuplier, idx: number) => (
                  <div key={supplier.id || idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm truncate">{supplier.nama}</div>
                      <div className="text-xs text-slate-500">{supplier.count} transaksi • {formatCurrency(supplier.total)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Belum ada data supplier</p>
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
                <th className="px-6 py-4 text-left text-sm font-semibold">Supplier</th>
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
              {data.map((item: PembelianData) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-700">{formatDate(item.tanggal)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.nota_supplier}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{item.suplier?.nama || '-'}</td>
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
        {data.map((item: PembelianData) => (
          <div key={item.id} className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 mb-1 truncate">{item.nota_supplier}</p>
                <p className="text-xs text-slate-600">{formatDate(item.tanggal)}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium border shrink-0 ml-2 ${getStatusColor(item.status_pembayaran)}`}>
                {item.status_pembayaran}
              </span>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Supplier:</span>
                <span className="font-medium text-slate-900 text-right">{item.suplier?.nama || '-'}</span>
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
                  <h2 className="text-lg sm:text-2xl font-bold">Detail Pembelian</h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1 truncate">{selectedDetail.nota_supplier}</p>
                </div>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl transition-all flex items-center justify-center shrink-0 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200">
                  <p className="text-[10px] xs:text-xs text-slate-600 mb-1">Tanggal</p>
                  <p className="font-semibold text-sm sm:text-base text-slate-900">{formatDate(selectedDetail.tanggal)}</p>
                </div>
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200">
                  <p className="text-[10px] xs:text-xs text-slate-600 mb-1">Supplier</p>
                  <p className="font-semibold text-sm sm:text-base text-slate-900 truncate">{selectedDetail.suplier?.nama}</p>
                </div>
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200">
                  <p className="text-[10px] xs:text-xs text-slate-600 mb-1">Cabang</p>
                  <p className="font-semibold text-sm sm:text-base text-slate-900 truncate">{selectedDetail.cabang?.nama_cabang}</p>
                </div>
                <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200">
                  <p className="text-[10px] xs:text-xs text-slate-600 mb-1">Jenis Pembayaran</p>
                  <p className="font-semibold text-sm sm:text-base text-slate-900 capitalize">{selectedDetail.jenis_pembayaran}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-base sm:text-lg mb-3 text-slate-900">Item Pembelian</h3>
                <div className="space-y-2">
                  {selectedDetail.detail_pembelian?.map((detail: DetailPembelian, idx: number) => (
                    <div key={idx} className="flex items-start justify-between gap-3 p-2.5 sm:p-3 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base text-slate-900 truncate">{detail.produk?.nama_produk || 'Produk'}</p>
                        <p className="text-xs sm:text-sm text-slate-600">{detail.jumlah} {detail.produk?.satuan} × {formatCurrency(detail.harga)}</p>
                      </div>
                      <p className="font-semibold text-sm sm:text-base text-slate-900 shrink-0">{formatCurrency(detail.subtotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm text-slate-700">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrency(selectedDetail.subtotal)}</span>
                  </div>
                  {selectedDetail.biaya_kirim > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm text-slate-700">
                      <span>Biaya Kirim</span>
                      <span className="font-medium">{formatCurrency(selectedDetail.biaya_kirim)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base sm:text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total</span>
                    <span>{formatCurrency(selectedDetail.finalTotal)}</span>
                  </div>
                  {selectedDetail.uang_muka > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm text-green-600">
                      <span>Uang Muka</span>
                      <span className="font-medium">{formatCurrency(selectedDetail.uang_muka)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs sm:text-sm text-blue-600">
                    <span>Total Terbayar</span>
                    <span className="font-semibold">{formatCurrency(selectedDetail.totalBayar)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600 font-semibold text-base sm:text-lg pt-2 border-t border-slate-200">
                    <span>Sisa Tagihan</span>
                    <span>{formatCurrency(selectedDetail.sisaTagihan)}</span>
                  </div>
                </div>
              </div>

              {selectedDetail.cicilan && selectedDetail.cicilan.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-semibold text-base sm:text-lg mb-3 text-slate-900">Riwayat Cicilan</h3>
                  <div className="space-y-2">
                    {selectedDetail.cicilan.map((c: Cicilan, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 sm:p-3 bg-green-50 rounded-lg sm:rounded-xl border border-green-200 gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-slate-700">{formatDate(c.tanggal_cicilan)}</p>
                          <p className="text-[10px] xs:text-xs text-slate-600 truncate">{c.rekening || 'Cash'}</p>
                        </div>
                        <p className="font-semibold text-sm sm:text-base text-green-700 shrink-0">{formatCurrency(c.jumlah_cicilan)}</p>
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
