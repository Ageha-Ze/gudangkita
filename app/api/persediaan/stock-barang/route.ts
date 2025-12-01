// app/api/persediaan/stock-barang/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * GET - Fetch stock overview (aggregated per produk & cabang)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const cabang_id = parseInt(searchParams.get('cabang_id') || '0');

    const offset = (page - 1) * limit;

    // Get all stock movements and calculate current stock per produk-cabang
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
          produk_id: item.produk_id,
          nama_produk: item.produk?.nama_produk || '-',
          kode_produk: item.produk?.kode_produk || '-',
          satuan: item.produk?.satuan || 'Kg',
          cabang_id: item.cabang_id,
          cabang: item.cabang?.nama_cabang || '-',
          stock: 0,
          stock_masuk: 0,
          stock_keluar: 0,
          hpp: item.hpp || 0,
          harga_jual: item.harga_jual || 0,
          margin: item.persentase || 0,
          latest_date: item.tanggal || '',
          has_negative: false, // 🆕 Flag untuk detect minus
        });
      }

      const group = grouped.get(key);
      const jumlah = parseFloat(item.jumlah?.toString() || '0');

      // Calculate running stock
      if (item.tipe === 'masuk') {
        group.stock += jumlah;
        group.stock_masuk += jumlah;
      } else if (item.tipe === 'keluar') {
        group.stock -= jumlah;
        group.stock_keluar += jumlah;
      }

      // 🆕 Check if stock went negative at any point
      if (group.stock < 0) {
        group.has_negative = true;
      }

      // Keep latest price
      if (!group.latest_date || item.tanggal >= group.latest_date) {
        group.hpp = item.hpp || group.hpp;
        group.harga_jual = item.harga_jual || group.harga_jual;
        group.margin = item.persentase || group.margin;
        group.latest_date = item.tanggal;
      }
    });

    let formattedData = Array.from(grouped.values()).map((item: any) => ({
      produk_id: item.produk_id,
      nama_produk: item.nama_produk,
      kode_produk: item.kode_produk,
      satuan: item.satuan,
      cabang_id: item.cabang_id,
      cabang: item.cabang,
      stock: item.stock,
      stock_masuk: item.stock_masuk, // 🆕 Detail masuk
      stock_keluar: item.stock_keluar, // 🆕 Detail keluar
      hpp: item.hpp,
      harga_jual: item.harga_jual,
      margin: item.margin,
      has_negative: item.has_negative, // 🆕 Flag warning
    }));

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      formattedData = formattedData.filter((item: any) =>
        item.nama_produk?.toLowerCase().includes(searchLower) ||
        item.kode_produk?.toLowerCase().includes(searchLower) ||
        item.cabang?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by nama_produk
    formattedData.sort((a: any, b: any) =>
      (a.nama_produk || '').localeCompare(b.nama_produk || '')
    );

    const totalRecords = formattedData.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedData = formattedData.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching stock:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Add/Remove stock (Manual Entry)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    const {
      produk_id,
      cabang_id,
      jumlah,
      tipe, // 'masuk' | 'keluar'
      hpp,
      harga_jual,
      persentase_harga_jual,
      keterangan,
    } = body;

    // Validation
    if (!produk_id || !cabang_id || !jumlah || !tipe) {
      return NextResponse.json(
        { success: false, error: 'produk_id, cabang_id, jumlah, dan tipe wajib diisi' },
        { status: 400 }
      );
    }

    if (!['masuk', 'keluar'].includes(tipe)) {
      return NextResponse.json(
        { success: false, error: 'tipe harus "masuk" atau "keluar"' },
        { status: 400 }
      );
    }

    // Get current stock from produk table
    const { data: produk, error: produkError } = await supabase
      .from('produk')
      .select('stok, nama_produk, satuan, hpp')
      .eq('id', produk_id)
      .single();

    if (produkError) throw produkError;
    if (!produk) {
      return NextResponse.json(
        { success: false, error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    const currentStock = parseFloat(produk.stok?.toString() || '0');
    const jumlahFloat = parseFloat(jumlah);

    // Calculate new stock
    let newStock = currentStock;
    if (tipe === 'masuk') {
      newStock += jumlahFloat;
    } else {
      newStock -= jumlahFloat;
      // Validation: check if stock is sufficient
      if (newStock < 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Stock tidak mencukupi',
            detail: `Stock saat ini: ${currentStock} ${produk.satuan || 'unit'}, permintaan keluar: ${jumlahFloat} ${produk.satuan || 'unit'}`,
          },
          { status: 400 }
        );
      }
    }

    // Insert into stock_barang
    const { data: stockData, error: insertError } = await supabase
      .from('stock_barang')
      .insert({
        produk_id,
        cabang_id,
        jumlah: jumlahFloat,
        tanggal: new Date().toISOString().split('T')[0],
        tipe,
        keterangan: keterangan || `Stock ${tipe} manual`,
        hpp: hpp || produk.hpp || 0,
        harga_jual: harga_jual || 0,
        persentase: persentase_harga_jual || 0,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update produk.stok
    const updateData: any = { stok: newStock };

    // Update HPP if stock masuk
    if (hpp && tipe === 'masuk') {
      updateData.hpp = hpp;
      updateData.harga = hpp;
    }

    const { error: updateError } = await supabase
      .from('produk')
      .update(updateData)
      .eq('id', produk_id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: `Stock ${tipe} berhasil ditambahkan`,
      data: stockData,
      detail: {
        produk: produk.nama_produk,
        jumlah: `${jumlahFloat} ${produk.satuan || 'unit'}`,
        stock_sebelum: `${currentStock} ${produk.satuan || 'unit'}`,
        stock_sesudah: `${newStock} ${produk.satuan || 'unit'}`,
      },
    });
  } catch (error: any) {
    console.error('❌ Error managing stock:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}