'use client';

import { useState, useEffect } from 'react';
import { X, History, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';

interface ModalHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  produkId: number;
  namaProduk: string;
}

interface StockHistory {
  id: number;
  tanggal: string;
  jumlah: number;
  tipe: 'masuk' | 'keluar';
  keterangan: string;
  hpp: number;
  harga_jual: number;
  balance: number; // running balance
}

interface HistorySummary {
  stock_awal: number;
  stock_akhir: number;
  total_masuk: number;
  total_keluar: number;
  satuan: string;
  nama_produk: string;
  kode_produk: string;
  hpp: number;
}

export default function ModalHistory({
  isOpen,
  onClose,
  produkId,
  namaProduk
}: ModalHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [histories, setHistories] = useState<StockHistory[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [dateFilter, setDateFilter] = useState({
    start: '',
    end: ''
  });

  useEffect(() => {
    if (isOpen && produkId) {
      fetchHistory();
    }
  }, [isOpen, produkId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/persediaan/stock-barang/${produkId}`);
      const json = await res.json();

      if (res.ok) {
        setHistories(json.data || []);
        setSummary(json.summary || null);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        type: 'movements',
        produk_id: produkId.toString(),
        start_date: dateFilter.start,
        end_date: dateFilter.end,
      });

      const response = await fetch(`/api/persediaan/stock-barang/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export gagal');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'Stock_Movements.xlsx';

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Gagal export Excel');
    }
  };

  if (!isOpen) return null;

  // Filter by date range
  const filteredHistories = histories.filter(h => {
    if (!dateFilter.start && !dateFilter.end) return true;
    const date = new Date(h.tanggal);
    if (dateFilter.start && date < new Date(dateFilter.start)) return false;
    if (dateFilter.end && date > new Date(dateFilter.end)) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">History Stock</h2>
                <p className="text-sm text-purple-100 mt-1">{summary?.nama_produk || namaProduk}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">STOCK AWAL</p>
                <p className="text-2xl font-bold text-gray-800">
                  {summary.stock_awal.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">{summary.satuan}</p>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">TOTAL MASUK</p>
                <p className="text-2xl font-bold text-green-700">
                  +{summary.total_masuk.toFixed(2)}
                </p>
                <p className="text-xs text-green-600">{summary.satuan}</p>
              </div>
              
              <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">TOTAL KELUAR</p>
                <p className="text-2xl font-bold text-red-700">
                  -{summary.total_keluar.toFixed(2)}
                </p>
                <p className="text-xs text-red-600">{summary.satuan}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 shadow-lg text-white">
                <p className="text-xs text-blue-100 font-medium mb-1">STOCK AKHIR</p>
                <p className="text-2xl font-bold">
                  {summary.stock_akhir.toFixed(2)}
                </p>
                <p className="text-xs text-blue-100">{summary.satuan}</p>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
            {/* Date Filter */}
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filter:</span>
              </div>
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-gray-500">—</span>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {(dateFilter.start || dateFilter.end) && (
                <button
                  onClick={() => setDateFilter({ start: '', end: '' })}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredHistories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <History className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Belum ada history transaksi</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                    Tipe
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Jumlah
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Saldo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    HPP
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                    Harga Jual
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredHistories.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition-colors border-b border-gray-100`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800">
                          {new Date(item.tanggal).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(item.tanggal).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          item.tipe === 'masuk'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.tipe === 'masuk' ? (
                          <>
                            <TrendingUp className="w-3 h-3" />
                            MASUK
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-3 h-3" />
                            KELUAR
                          </>
                        )}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        item.tipe === 'masuk' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {item.tipe === 'masuk' ? '+' : '-'}
                      {item.jumlah.toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-bold ${
                          item.balance < 100 ? 'text-red-600' : 'text-gray-800'
                        }`}
                      >
                        {item.balance.toLocaleString('id-ID', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </td>
                   <td className="px-4 py-3 text-right text-sm text-gray-700">
  Rp {(item.hpp || 0).toLocaleString('id-ID')}
</td>
<td className="px-4 py-3 text-right text-sm text-gray-700">
  Rp {(item.harga_jual || 0).toLocaleString('id-ID')}
</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.keterangan || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Total: <strong>{filteredHistories.length}</strong> transaksi
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}