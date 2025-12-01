'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Minus, Edit, History, Download, Search, X } from 'lucide-react';
import ModalManageStock from './ModalManageStock';
import ModalEditPrice from './ModalEditPrice';
import ModalHistory from './ModalHistory';


interface StockItem {
  produk_id: number;
  nama_produk: string;
  kode_produk: string;
  satuan: string;
  stock: number;
  stock_masuk: number;
  stock_keluar: number;
  hpp: number;
  harga_jual: number;
  margin: number;
  cabang: string;
  cabang_id: number;
  has_negative: boolean;
}

export default function StockBarangPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCabang, setSelectedCabang] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showModalManage, setShowModalManage] = useState(false);
  const [showModalEditPrice, setShowModalEditPrice] = useState(false);
  const [showModalHistory, setShowModalHistory] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'add' | 'remove' | 'adjust'>('add');

  useEffect(() => {
    fetchStocks();
  }, [page, search, selectedCabang]);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        search: search,
        cabang_id: selectedCabang.toString(),
      });

      const res = await fetch(`/api/persediaan/stock-barang?${params}`);
      const json = await res.json();

      if (json.success) {
        setStocks(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenManageStock = (stock: StockItem | null, mode: 'add' | 'remove' | 'adjust') => {
    setSelectedStock(stock ? {
      produk_id: stock.produk_id,
      nama_produk: stock.nama_produk,
      kode_produk: stock.kode_produk,
      satuan: stock.satuan,
      stock: stock.stock,
      hpp: stock.hpp,
      cabang_id: stock.cabang_id,
      cabang: stock.cabang,
    } : null);
    setModalMode(mode);
    setShowModalManage(true);
  };

  const handleOpenEditPrice = (stock: StockItem) => {
    setSelectedStock({
      produk_id: stock.produk_id,
      nama_produk: stock.nama_produk,
      kode_produk: stock.kode_produk,
      cabang_id: stock.cabang_id,
      cabang: stock.cabang,
      hpp: stock.hpp,
      harga_jual: stock.harga_jual,
      margin: stock.margin,
    });
    setShowModalEditPrice(true);
  };

  const handleOpenHistory = (stock: StockItem) => {
    setSelectedStock(stock);
    setShowModalHistory(true);
  };

  const handleModalSuccess = () => {
    fetchStocks();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        type: 'overview',
        cabang_id: selectedCabang.toString(),
      });

      const response = await fetch(`/api/persediaan/stock-barang/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export gagal');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'Stock_Overview.xlsx';

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

   // ✅ TAMBAHKAN INI - Reset & Rebuild
  const handleResetRebuild = async () => {
    if (!confirm('🔄 RESET & REBUILD STOCK?\n\nIni akan:\n1. DELETE semua data stock_barang\n2. REBUILD dari semua transaksi\n3. RECALCULATE stock\n\n⚠️ PROSES INI TIDAK BISA DIBATALKAN!\n\nCek dulu data?')) {
      return;
    }

    try {
      setLoading(true);

      const checkRes = await fetch('/api/persediaan/stock-barang/reset-rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'check' }),
      });

      const checkJson = await checkRes.json();

      if (checkJson.success) {
        let message = `📊 RESET & REBUILD CHECK\n\n`;
        message += `Current Records: ${checkJson.summary.current_stock_records}\n\n`;
        message += `Will Create:\n`;
        message += `- Pembelian: ${checkJson.summary.will_be_created.pembelian}\n`;
        message += `- Produksi: ${checkJson.summary.will_be_created.produksi}\n`;
        message += `- Konsinyasi: ${checkJson.summary.will_be_created.konsinyasi}\n`;
        message += `- Penjualan: ${checkJson.summary.will_be_created.penjualan}\n`;
        message += `- Stock Opname: ${checkJson.summary.will_be_created.stock_opname}\n`;
        message += `- Bahan Produksi: ${checkJson.summary.will_be_created.bahan_produksi}\n\n`;
        message += `Total: ${Object.values(checkJson.summary.will_be_created).reduce((a: any, b: any) => a + b, 0)} records\n\n`;
        message += `⚠️ Lanjutkan RESET & REBUILD?`;

        if (confirm(message)) {
          const resetRes = await fetch('/api/persediaan/stock-barang/reset-rebuild', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'reset' }),
          });

          const resetJson = await resetRes.json();

          if (resetJson.success) {
            let resultMessage = `✅ RESET & REBUILD COMPLETED!\n\n`;
            resultMessage += `Created:\n`;
            resultMessage += `- Pembelian: ${resetJson.insert_results.pembelian}\n`;
            resultMessage += `- Produksi: ${resetJson.insert_results.produksi}\n`;
            resultMessage += `- Konsinyasi: ${resetJson.insert_results.konsinyasi}\n`;
            resultMessage += `- Penjualan: ${resetJson.insert_results.penjualan}\n`;
            resultMessage += `- Stock Opname: ${resetJson.insert_results.opname}\n`;
            resultMessage += `- Bahan Produksi: ${resetJson.insert_results.bahan}\n`;
            resultMessage += `- Errors: ${resetJson.insert_results.errors.length}\n\n`;
            
            if (resetJson.summary.final_products.length > 0) {
              resultMessage += `Final Stock (first 10):\n`;
              resetJson.summary.final_products.slice(0, 10).forEach((p: any) => {
                resultMessage += `- ${p.nama_produk}: ${p.stok}\n`;
              });
            }

            alert(resultMessage);
            fetchStocks();
          } else {
            alert('❌ Gagal reset: ' + resetJson.error);
          }
        }
      } else {
        alert('❌ Gagal check: ' + checkJson.error);
      }
    } catch (error: any) {
      console.error('Error reset rebuild:', error);
      alert('❌ Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ TAMBAHKAN INI - Delete Stock
  const handleDeleteStock = async (stock: StockItem) => {
    if (!confirm(`⚠️ HAPUS STOCK PRODUK?\n\n${stock.nama_produk}\n\nIni akan:\n1. Hapus SEMUA record stock_barang untuk produk ini\n2. Set stock produk = 0\n\nLanjutkan?`)) {
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/persediaan/stock-barang/delete-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produk_id: stock.produk_id,
          cabang_id: stock.cabang_id,
        }),
      });

      const json = await res.json();

      if (json.success) {
        alert('✅ Stock berhasil dihapus!');
        fetchStocks();
      } else {
        alert('❌ Gagal hapus stock: ' + json.error);
      }
    } catch (error: any) {
      console.error('Error deleting stock:', error);
      alert('❌ Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFixNegativeStock = async () => {
    // First, run check mode
    if (!confirm('🔍 Check stock discrepancies?\n\nIni akan mengecek:\n1. Pembelian yang belum tercatat di stock_barang\n2. Produksi yang belum tercatat di stock_barang\n3. Stock minus/discrepancy\n\nLanjutkan?')) {
      return;
    }

    try {
      setLoading(true);
      
      // Check first
      const checkRes = await fetch('/api/persediaan/stock-barang/fix-comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'check' }),
      });

      const checkJson = await checkRes.json();

      if (checkJson.success) {
        let message = `📊 STOCK CHECK RESULTS\n\n`;
        message += `Missing Stock Entries:\n`;
        message += `- Pembelian: ${checkJson.summary.pembelian_missing}\n`;
        message += `- Produksi: ${checkJson.summary.produksi_missing}\n`;
        message += `- Konsinyasi: ${checkJson.summary.penjualan_konsinyasi_missing}\n`;
        message += `- Stock Opname: ${checkJson.summary.stock_opname_missing}\n`;
        message += `- Bahan Produksi: ${checkJson.summary.detail_produksi_missing}\n\n`;

        if (checkJson.details.pembelian_missing.length > 0) {
          message += `📦 Missing Pembelian (first 5):\n`;
          checkJson.details.pembelian_missing.slice(0, 5).forEach((p: any) => {
            message += `- ${p.nama_produk}: ${p.jumlah} (${p.tanggal})\n`;
          });
          if (checkJson.details.pembelian_missing.length > 5) {
            message += `... and ${checkJson.details.pembelian_missing.length - 5} more\n`;
          }
          message += `\n`;
        }

        if (checkJson.details.produksi_missing.length > 0) {
          message += `🏭 Missing Produksi (first 5):\n`;
          checkJson.details.produksi_missing.slice(0, 5).forEach((p: any) => {
            message += `- ${p.nama_produk}: ${p.jumlah} (${p.tanggal})\n`;
          });
          if (checkJson.details.produksi_missing.length > 5) {
            message += `... and ${checkJson.details.produksi_missing.length - 5} more\n`;
          }
          message += `\n`;
        }

        if (checkJson.details.penjualan_konsinyasi_missing.length > 0) {
          message += `🏪 Missing Konsinyasi (first 5):\n`;
          checkJson.details.penjualan_konsinyasi_missing.slice(0, 5).forEach((p: any) => {
            message += `- ${p.nama_produk}: ${p.jumlah} (${p.tanggal})\n`;
          });
          if (checkJson.details.penjualan_konsinyasi_missing.length > 5) {
            message += `... and ${checkJson.details.penjualan_konsinyasi_missing.length - 5} more\n`;
          }
          message += `\n`;
        }

        if (checkJson.details.stock_opname_missing.length > 0) {
          message += `📋 Missing Stock Opname (first 5):\n`;
          checkJson.details.stock_opname_missing.slice(0, 5).forEach((p: any) => {
            message += `- ${p.nama_produk}: ${p.selisih > 0 ? '+' : ''}${p.selisih} (${p.tanggal})\n`;
          });
          if (checkJson.details.stock_opname_missing.length > 5) {
            message += `... and ${checkJson.details.stock_opname_missing.length - 5} more\n`;
          }
          message += `\n`;
        }

        if (checkJson.details.detail_produksi_missing.length > 0) {
          message += `🧪 Missing Bahan Produksi (first 5):\n`;
          checkJson.details.detail_produksi_missing.slice(0, 5).forEach((p: any) => {
            message += `- ${p.nama_item}: ${p.jumlah} (${p.tanggal})\n`;
          });
          if (checkJson.details.detail_produksi_missing.length > 5) {
            message += `... and ${checkJson.details.detail_produksi_missing.length - 5} more\n`;
          }
          message += `\n`;
        }

        message += `\nLanjutkan perbaikan?`;

        if (confirm(message)) {
          // Run fix
          const fixRes = await fetch('/api/persediaan/stock-barang/fix-comprehensive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'fix' }),
          });

          const fixJson = await fixRes.json();

          if (fixJson.success) {
            let fixMessage = `✅ FIX COMPLETED!\n\n`;
            fixMessage += `📊 Summary:\n`;
            fixMessage += `- Pembelian Fixed: ${fixJson.summary.pembelian_missing}\n`;
            fixMessage += `- Produksi Fixed: ${fixJson.summary.produksi_missing}\n`;
            fixMessage += `- Konsinyasi Fixed: ${fixJson.summary.penjualan_konsinyasi_missing}\n`;
            fixMessage += `- Stock Opname Fixed: ${fixJson.summary.stock_opname_missing}\n`;
            fixMessage += `- Bahan Produksi Fixed: ${fixJson.summary.detail_produksi_missing}\n`;
            fixMessage += `- Stock Updated: ${fixJson.summary.stock_fixed}\n`;
            fixMessage += `- Errors: ${fixJson.summary.errors}\n\n`;

            if (fixJson.details.stock_fixed.length > 0) {
              fixMessage += `📈 Stock Changes (first 5):\n`;
              fixJson.details.stock_fixed.slice(0, 5).forEach((s: any) => {
                fixMessage += `- ${s.nama_produk}: ${s.old_stock} → ${s.new_stock}\n`;
              });
              if (fixJson.details.stock_fixed.length > 5) {
                fixMessage += `... and ${fixJson.details.stock_fixed.length - 5} more\n`;
              }
            }

            if (fixJson.details.errors.length > 0) {
              fixMessage += `\n⚠️ Errors:\n`;
              fixJson.details.errors.forEach((e: any) => {
                fixMessage += `- ${e.type}: ${e.error}\n`;
              });
            }

            alert(fixMessage);
            fetchStocks();
          } else {
            alert('❌ Gagal fix stock: ' + fixJson.error);
          }
        }
      } else {
        alert('❌ Gagal check stock: ' + checkJson.error);
      }
    } catch (error: any) {
      console.error('Error fixing stock:', error);
      alert('❌ Terjadi kesalahan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStocks = stocks;
  const totalItems = filteredStocks.length;
  
  // Group stock by satuan - JANGAN dijumlahkan semua!
  const stockBySatuan = filteredStocks.reduce((acc, item) => {
    const satuan = item.satuan || 'Unknown';
    if (!acc[satuan]) {
      acc[satuan] = 0;
    }
    acc[satuan] += item.stock;
    return acc;
  }, {} as Record<string, number>);

  const lowStockCount = filteredStocks.filter(item => item.stock > 0 && item.stock < 100).length;
  const negativeStockCount = filteredStocks.filter(item => item.stock < 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-blue-500 rounded-lg sm:rounded-xl">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
            </div>
            Stock Barang
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Kelola persediaan barang gudang dengan mudah</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Item</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{totalItems}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Stock</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              {Object.entries(stockBySatuan).map(([satuan, total]) => (
                <div key={satuan} className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600">{satuan}:</span>
                  <span className="text-lg font-bold text-gray-800">{total.toFixed(2)}</span>
                </div>
              ))}
              {Object.keys(stockBySatuan).length === 0 && (
                <p className="text-gray-400 text-sm">Tidak ada stock</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Stock Rendah / Minus</p>
                <p className="text-3xl font-bold mt-1">
                  {lowStockCount} / <span className="text-yellow-300">{negativeStockCount}</span>
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari nama atau kode produk..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

        {/* Mobile Responsive Button Layout */}
<div className="flex gap-2 sm:gap-3 justify-end sm:justify-start">
  <button 
    onClick={() => handleOpenManageStock(null, 'add')}
    className="sm:flex-none px-3 py-2.5 sm:px-4 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
  >
    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
    <span className="hidden sm:inline whitespace-nowrap">Tambah Stock</span>
  </button>
  
  <button 
    onClick={handleFixNegativeStock}
    className={`sm:flex-none px-3 py-2.5 sm:px-4 sm:py-3 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium text-sm relative ${
      negativeStockCount > 0 
        ? 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 animate-pulse' 
        : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
    }`}
    title="Fix stock discrepancies from pembelian & produksi"
  >
    <span className="text-lg">🔧</span>
    {negativeStockCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center sm:hidden">
        {negativeStockCount}
      </span>
    )}
    <span className="hidden sm:inline whitespace-nowrap">
      Fix Stock {negativeStockCount > 0 ? `(${negativeStockCount})` : ''}
    </span>
  </button>
  
  <button 
    onClick={handleResetRebuild}
    className="sm:flex-none px-3 py-2.5 sm:px-4 sm:py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 active:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
    title="Reset & rebuild all stock from scratch"
  >
    <span className="text-lg">🔄</span>
    <span className="hidden sm:inline whitespace-nowrap">Reset & Rebuild</span>
  </button>
  
  <button 
    onClick={handleExport}
    className="sm:flex-none px-3 py-2.5 sm:px-4 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
  >
    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
    <span className="hidden sm:inline whitespace-nowrap">Export</span>
  </button>
</div>

            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Tidak ada data stock</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStocks.map((item) => {
                  const isLowStock = item.stock > 0 && item.stock < 100;
                  const isNegative = item.stock < 0;
                  return (
                    <div 
                      key={`${item.produk_id}-${item.cabang_id}`}
                      className={`bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 border-2 ${
                        isNegative ? 'border-red-500 bg-red-50' :
                        isLowStock ? 'border-orange-300' : 'border-gray-200'
                      } hover:shadow-lg transition-all duration-200`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 text-lg">{item.nama_produk}</h3>
                          <p className="text-xs text-gray-500">{item.kode_produk}</p>
                        </div>
                        {isNegative ? (
                          <span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-full animate-pulse">
                            MINUS!
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">
                            LOW
                          </span>
                        ) : null}
                      </div>

                      <div className="mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-3xl font-bold ${
                            isNegative ? 'text-red-600' : 
                            isLowStock ? 'text-orange-600' : 'text-gray-800'
                          }`}>
                            {item.stock.toLocaleString('id-ID')}
                          </span>
                          <span className="text-gray-500 text-sm">{item.satuan}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">📍 {item.cabang}</p>
                        {(item.stock_masuk > 0 || item.stock_keluar > 0) && (
                          <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                            <p>↗️ Masuk: <span className="font-semibold text-green-600">{item.stock_masuk?.toFixed(2) || 0}</span></p>
                            <p>↘️ Keluar: <span className="font-semibold text-red-600">{item.stock_keluar?.toFixed(2) || 0}</span></p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-white rounded-lg border border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">HPP</p>
                          <p className="text-sm font-semibold text-gray-700">
                            Rp {item.hpp.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Harga Jual</p>
                          <p className="text-sm font-semibold text-gray-700">
                            Rp {item.harga_jual.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          item.margin >= 20 ? 'bg-green-100 text-green-700' :
                          item.margin >= 10 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          Margin: {item.margin.toFixed(2)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <button 
                          onClick={() => handleOpenManageStock(item, 'add')}
                          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center" 
                          title="Add Stock"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenManageStock(item, 'remove')}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center" 
                          title="Remove Stock"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEditPrice(item)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center" 
                          title="Edit Price"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenHistory(item)}
                          className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center" 
                          title="History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Delete Button - Full Width Below */}
                      <button 
                        onClick={() => handleDeleteStock(item)}
                        className="w-full mt-2 p-2 bg-gray-700 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-sm" 
                        title="Delete Stock"
                      >
                        <X className="w-4 h-4" />
                        Hapus Stock
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalManageStock
        isOpen={showModalManage}
        onClose={() => setShowModalManage(false)}
        onSuccess={handleModalSuccess}
        initialData={selectedStock}
        mode={modalMode}
      />

      <ModalEditPrice
        isOpen={showModalEditPrice}
        onClose={() => setShowModalEditPrice(false)}
        onSuccess={handleModalSuccess}
        data={selectedStock}
      />

      <ModalHistory
        isOpen={showModalHistory}
        onClose={() => setShowModalHistory(false)}
        produkId={selectedStock?.produk_id}
        namaProduk={selectedStock?.nama_produk}
      />
      
    </div>
  );
}
