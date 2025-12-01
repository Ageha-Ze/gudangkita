// app/api/persediaan/stock-barang/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import * as XLSX from 'xlsx';

/**
 * GET - Export stock data to Excel
 * Query params:
 * - type: 'overview' | 'movements' (default: overview)
 * - cabang_id: number (optional, 0 = all)
 * - produk_id: number (optional, for movements only)
 * - start_date: string (optional, for movements only)
 * - end_date: string (optional, for movements only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') || 'overview';
    const cabang_id = parseInt(searchParams.get('cabang_id') || '0');
    const produk_id = parseInt(searchParams.get('produk_id') || '0');
    const start_date = searchParams.get('start_date') || '';
    const end_date = searchParams.get('end_date') || '';

    let workbook: XLSX.WorkBook;
    let filename: string;

    if (type === 'overview') {
      // Export Stock Overview
      const result = await exportStockOverview(supabase, cabang_id);
      workbook = result.workbook;
      filename = result.filename;
    } else if (type === 'movements') {
      // Export Stock Movements (History)
      const result = await exportStockMovements(supabase, produk_id, cabang_id, start_date, end_date);
      workbook = result.workbook;
      filename = result.filename;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid export type. Use "overview" or "movements"' },
        { status: 400 }
      );
    }

    // Convert workbook to buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('❌ Error exporting Excel:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Export Stock Overview
 */
async function exportStockOverview(supabase: any, cabang_id: number) {
  // Get all stock movements
  let query = supabase
    .from('stock_barang')
    .select(`
      id,
      produk_id,
      cabang_id,
      jumlah,
      tipe,
      hpp,
      harga_jual,
      persentase,
      tanggal,
      produk:produk_id (
        id,
        nama_produk,
        kode_produk,
        satuan,
        stok
      ),
      cabang:cabang_id (
        id,
        nama_cabang
      )
    `);

  if (cabang_id > 0) {
    query = query.eq('cabang_id', cabang_id);
  }

  const { data: movements, error } = await query;

  if (error) throw error;

  // Group by produk_id + cabang_id
  const grouped = new Map<string, any>();

  movements?.forEach((item: any) => {
    const key = `${item.produk_id}-${item.cabang_id}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        kode_produk: item.produk?.kode_produk || '-',
        nama_produk: item.produk?.nama_produk || '-',
        satuan: item.produk?.satuan || 'Kg',
        cabang: item.cabang?.nama_cabang || '-',
        stock: 0,
        hpp: item.hpp || 0,
        harga_jual: item.harga_jual || 0,
        margin: item.persentase || 0,
        latest_date: item.tanggal || '',
      });
    }

    const group = grouped.get(key);
    const jumlah = parseFloat(item.jumlah?.toString() || '0');

    // Calculate running stock
    if (item.tipe === 'masuk') {
      group.stock += jumlah;
    } else if (item.tipe === 'keluar') {
      group.stock -= jumlah;
    }

    // Keep latest price
    if (!group.latest_date || item.tanggal >= group.latest_date) {
      group.hpp = item.hpp || group.hpp;
      group.harga_jual = item.harga_jual || group.harga_jual;
      group.margin = item.persentase || group.margin;
      group.latest_date = item.tanggal;
    }
  });

  // Convert to array and format for Excel
  const dataArray = Array.from(grouped.values()).map((item: any) => ({
    'Kode Produk': item.kode_produk,
    'Nama Produk': item.nama_produk,
    'Gudang/Cabang': item.cabang,
    'Stock': parseFloat(item.stock.toFixed(2)),
    'Satuan': item.satuan,
    'HPP': parseFloat(item.hpp.toFixed(2)),
    'Harga Jual': parseFloat(item.harga_jual.toFixed(2)),
    'Margin (%)': parseFloat(item.margin.toFixed(2)),
    'Nilai Stock (HPP x Stock)': parseFloat((item.hpp * item.stock).toFixed(2)),
  }));

  // Sort by nama_produk
  dataArray.sort((a, b) => a['Nama Produk'].localeCompare(b['Nama Produk']));

  // Calculate summary
  const totalStock = dataArray.reduce((sum, item) => sum + item['Stock'], 0);
  const totalNilai = dataArray.reduce((sum, item) => sum + item['Nilai Stock (HPP x Stock)'], 0);

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataArray);

  // Add summary rows
  const summaryData = [
    {},
    { 'Kode Produk': 'TOTAL', 'Stock': totalStock, 'Nilai Stock (HPP x Stock)': totalNilai },
  ];

  XLSX.utils.sheet_add_json(worksheet, summaryData, { skipHeader: true, origin: -1 });

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Kode Produk
    { wch: 30 }, // Nama Produk
    { wch: 20 }, // Gudang/Cabang
    { wch: 12 }, // Stock
    { wch: 10 }, // Satuan
    { wch: 15 }, // HPP
    { wch: 15 }, // Harga Jual
    { wch: 12 }, // Margin
    { wch: 20 }, // Nilai Stock
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Overview');

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = `Stock_Overview_${dateStr}.xlsx`;

  return { workbook, filename };
}

/**
 * Export Stock Movements (History)
 */
async function exportStockMovements(
  supabase: any,
  produk_id: number,
  cabang_id: number,
  start_date: string,
  end_date: string
) {
  // Get movements
  let query = supabase
    .from('stock_barang')
    .select(`
      id,
      produk_id,
      cabang_id,
      tanggal,
      jumlah,
      tipe,
      keterangan,
      hpp,
      harga_jual,
      persentase,
      produk:produk_id (
        nama_produk,
        kode_produk,
        satuan
      ),
      cabang:cabang_id (
        nama_cabang
      )
    `)
    .order('tanggal', { ascending: true })
    .order('id', { ascending: true });

  if (produk_id > 0) {
    query = query.eq('produk_id', produk_id);
  }

  if (cabang_id > 0) {
    query = query.eq('cabang_id', cabang_id);
  }

  if (start_date) {
    query = query.gte('tanggal', start_date);
  }

  if (end_date) {
    query = query.lte('tanggal', end_date);
  }

  const { data: movements, error } = await query;

  if (error) throw error;

  // Calculate running balance
  let balance = 0;
  const dataArray = (movements || []).map((item: any) => {
    const jumlah = parseFloat(item.jumlah.toString());
    
    if (item.tipe === 'masuk') {
      balance += jumlah;
    } else if (item.tipe === 'keluar') {
      balance -= jumlah;
    }

    return {
      'Tanggal': item.tanggal,
      'Kode Produk': item.produk?.kode_produk || '-',
      'Nama Produk': item.produk?.nama_produk || '-',
      'Gudang/Cabang': item.cabang?.nama_cabang || '-',
      'Tipe': item.tipe.toUpperCase(),
      'Jumlah': parseFloat(jumlah.toFixed(2)),
      'Saldo': parseFloat(balance.toFixed(2)),
      'Satuan': item.produk?.satuan || 'Kg',
      'HPP': parseFloat((item.hpp || 0).toFixed(2)),
      'Harga Jual': parseFloat((item.harga_jual || 0).toFixed(2)),
      'Margin (%)': parseFloat((item.persentase || 0).toFixed(2)),
      'Keterangan': item.keterangan || '-',
    };
  });

  // Calculate summary
  const totalMasuk = dataArray
    .filter((item: any) => item['Tipe'] === 'MASUK')
    .reduce((sum: number, item: any) => sum + item['Jumlah'], 0);

  const totalKeluar = dataArray
    .filter((item: any) => item['Tipe'] === 'KELUAR')
    .reduce((sum: number, item: any) => sum + item['Jumlah'], 0);

  const stockAkhir = balance;

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataArray);

  // Add summary rows
  const summaryData = [
    {},
    { 'Tanggal': 'RINGKASAN' },
    { 'Tanggal': 'Total Masuk', 'Jumlah': totalMasuk },
    { 'Tanggal': 'Total Keluar', 'Jumlah': totalKeluar },
    { 'Tanggal': 'Stock Akhir', 'Jumlah': stockAkhir },
  ];

  XLSX.utils.sheet_add_json(worksheet, summaryData, { skipHeader: true, origin: -1 });

  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 }, // Tanggal
    { wch: 15 }, // Kode Produk
    { wch: 30 }, // Nama Produk
    { wch: 20 }, // Gudang/Cabang
    { wch: 10 }, // Tipe
    { wch: 12 }, // Jumlah
    { wch: 12 }, // Saldo
    { wch: 10 }, // Satuan
    { wch: 15 }, // HPP
    { wch: 15 }, // Harga Jual
    { wch: 12 }, // Margin
    { wch: 40 }, // Keterangan
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Movements');

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = `Stock_Movements_${dateStr}.xlsx`;

  return { workbook, filename };
}