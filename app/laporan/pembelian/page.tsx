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

    console.log('🔍 Fetching with params:', params.toString()); // DEBUG

    const response = await fetch(`/api/laporan/pembelian?${params}`);
    const result = await response.json();
    
    console.log('✅ API Response:', result); // DEBUG
    
    if (result.success) {
      console.log('📦 Data:', result.data); // DEBUG
      console.log('📊 Summary:', result.summary); // DEBUG
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - sama seperti sebelumnya */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                Laporan Pembelian
              </h1>
              <p className="text-slate-600 mt-1">Ringkasan dan analisis transaksi pembelian</p>
            </div>
            <div className="flex gap-2 sm:gap-3 justify-end sm:justify-start">
  <button
    onClick={() => setShowFilters(!showFilters)}
    className="sm:flex-none px-3 py-2 sm:px-4 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all shadow-sm flex items-center justify-center gap-2"
  >
    <Filter className="w-4 h-4" />
    <span className="hidden sm:inline">Filter</span>
  </button>
  <button
    onClick={exportToCSV}
    className="sm:flex-none px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
  >
    <Download className="w-4 h-4" />
    <span className="hidden sm:inline">Export CSV</span>
  </button>
</div>
          </div>
        </div>

        {/* Filters - sama seperti sebelumnya */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
            <h3 className="font-semibold text-lg mb-4 text-slate-900">Filter Laporan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Mulai</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Akhir</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status Pembayaran</label>
                <select
                  value={filters.status_pembayaran}
                  onChange={(e) => setFilters({ ...filters, status_pembayaran: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Semua Status</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Cicil">Cicil</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setFilters({ start_date: '', end_date: '', cabang_id: '', suplier_id: '', status_pembayaran: '', status_barang: '', jenis_pembayaran: '' })}
                className="px-4 py-2 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Reset
              </button>
              <button
                onClick={fetchLaporan}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 opacity-80" />
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-blue-100 text-sm font-medium">Total Pembelian</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(summary.totalNilaiPembelian)}</p>
              <p className="text-blue-100 text-xs mt-2">{summary.totalPembelian} transaksi</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-8 h-8 opacity-80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Lunas</span>
              </div>
              <p className="text-green-100 text-sm font-medium">Sudah Terbayar</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(summary.totalTerbayar)}</p>
              <p className="text-green-100 text-xs mt-2">{summary.statusPembayaran.lunas} lunas</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-8 h-8 opacity-80" />
                <TrendingDown className="w-5 h-5" />
              </div>
              <p className="text-amber-100 text-sm font-medium">Sisa Tagihan</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(summary.totalSisaTagihan)}</p>
              <p className="text-amber-100 text-xs mt-2">{summary.statusPembayaran.cicil} cicilan</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 opacity-80" />
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-purple-100 text-sm font-medium">Biaya Tambahan</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(summary.totalBiayaKirim)}</p>
              <p className="text-purple-100 text-xs mt-2">Biaya kirim</p>
            </div>
          </div>
        )}

        {/* Status Overview */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h3 className="font-semibold text-lg mb-4 text-slate-900">Status Pembayaran</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                  <span className="font-medium text-green-800">Lunas</span>
                  <span className="text-2xl font-bold text-green-600">{summary.statusPembayaran.lunas}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <span className="font-medium text-yellow-800">Cicilan</span>
                  <span className="text-2xl font-bold text-yellow-600">{summary.statusPembayaran.cicil}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                  <span className="font-medium text-red-800">Belum Lunas</span>
                  <span className="text-2xl font-bold text-red-600">{summary.statusPembayaran.belumLunas}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h3 className="font-semibold text-lg mb-4 text-slate-900">Top 5 Supplier</h3>
              <div className="space-y-3">
                {summary.topSuplier.slice(0, 5).map((sup: TopSuplier, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                        {idx + 1}
                      </div>
                      <span className="font-medium text-slate-800">{sup.nama}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">{formatCurrency(sup.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
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
                {data.map((item: PembelianData, idx: number) => (
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

        {/* Detail Modal */}
        {selectedDetail && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Detail Pembelian</h2>
                    <p className="text-blue-100 text-sm mt-1">{selectedDetail.nota_supplier}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl transition-all flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Tanggal</p>
                    <p className="font-semibold text-slate-900">{formatDate(selectedDetail.tanggal)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Supplier</p>
                    <p className="font-semibold text-slate-900">{selectedDetail.suplier?.nama}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Cabang</p>
                    <p className="font-semibold text-slate-900">{selectedDetail.cabang?.nama_cabang}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Jenis Pembayaran</p>
                    <p className="font-semibold text-slate-900 capitalize">{selectedDetail.jenis_pembayaran}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-semibold text-lg mb-3 text-slate-900">Item Pembelian</h3>
                  <div className="space-y-2">
                    {selectedDetail.detail_pembelian?.map((detail: DetailPembelian, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <p className="font-medium text-slate-900">{detail.produk?.nama_produk || 'Produk'}</p>
                          <p className="text-sm text-slate-600">{detail.jumlah} {detail.produk?.satuan} × {formatCurrency(detail.harga)}</p>
                        </div>
                        <p className="font-semibold text-slate-900">{formatCurrency(detail.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-700">
                      <span>Subtotal</span>
                      <span className="font-medium">{formatCurrency(selectedDetail.subtotal)}</span>
                    </div>
                    {selectedDetail.biaya_kirim > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>Biaya Kirim</span>
                        <span className="font-medium">{formatCurrency(selectedDetail.biaya_kirim)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total</span>
                      <span>{formatCurrency(selectedDetail.finalTotal)}</span>
                    </div>
                    {selectedDetail.uang_muka > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Uang Muka</span>
                        <span className="font-medium">{formatCurrency(selectedDetail.uang_muka)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-blue-600">
                      <span>Total Terbayar</span>
                      <span className="font-semibold">{formatCurrency(selectedDetail.totalBayar)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 font-semibold text-lg pt-2 border-t border-slate-200">
                      <span>Sisa Tagihan</span>
                      <span>{formatCurrency(selectedDetail.sisaTagihan)}</span>
                    </div>
                  </div>
                </div>

                {selectedDetail.cicilan && selectedDetail.cicilan.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="font-semibold text-lg mb-3 text-slate-900">Riwayat Cicilan</h3>
                    <div className="space-y-2">
                      {selectedDetail.cicilan.map((c: Cicilan, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                          <div>
                            <p className="text-sm text-slate-700">{formatDate(c.tanggal_cicilan)}</p>
                            <p className="text-xs text-slate-600">{c.rekening || 'Cash'}</p>
                          </div>
                          <p className="font-semibold text-green-700">{formatCurrency(c.jumlah_cicilan)}</p>
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