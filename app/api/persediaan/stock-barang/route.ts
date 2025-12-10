// app/api/persediaan/stock-barang/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';

/**
 * ✅ FIXED: GET - Fetch stock overview
 * Stock diambil langsung dari produk.stok (single source of truth)
 * 
 * MODES:
 * - overview: For stock management page (paginated, with history)
 * - aggregated: For dropdown/selection (all products with stock > 0, no pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const cabang_id = parseInt(searchParams.get('cabang_id') || '0');
    const mode = searchParams.get('mode') || 'overview';

    const offset = (page - 1) * limit;

    console.log('📊 Fetching stock with params:', { page, limit, search, cabang_id, mode });

    // ========================================
    // ✅ MODE: AGGREGATED (For Dropdown/Selection)
    // ========================================
    if (mode === 'aggregated') {
      let query = supabase
        .from('produk')
        .select('id, nama_produk, kode_produk, satuan, stok, hpp, harga')
        .gt('stok', 0); // Only products with stock > 0

      // Search filter
      if (search) {
        query = query.or(`nama_produk.ilike.%${search}%,kode_produk.ilike.%${search}%`);
      }

      const { data: products, error } = await query
        .order('nama_produk')
        .limit(limit);

      if (error) throw error;

      // Format data for dropdown
      const formattedData = products?.map(p => {
        const stock = parseFloat(p.stok?.toString() || '0');
        const hpp = parseFloat(p.hpp?.toString() || '0');
        const harga_jual = parseFloat(p.harga?.toString() || '0');
        const margin = hpp > 0 ? ((harga_jual - hpp) / hpp) * 100 : 0;
        
        return {
          produk_id: p.id,
          nama_produk: p.nama_produk,
          kode_produk: p.kode_produk,
          satuan: p.satuan || 'Kg',
          gudang: 'All',
          total_stock: stock,
          hpp: hpp,
          harga_jual: harga_jual,
          persentase: margin,
          stock_masuk: 0,
          stock_keluar: 0,
        };
      }) || [];

      console.log(`✅ Returned ${formattedData.length} products (aggregated mode)`);

      return NextResponse.json({
        success: true,
        data: formattedData,
        count: formattedData.length,
      });
    }

    // ========================================
    // ✅ MODE: OVERVIEW (For Stock Management Page)
    // ========================================

    // 🎯 BRANCH FILTERING: When specific branch selected, only show products with activity in that branch
    let query;

    if (cabang_id > 0) {
      // For branch-specific view: First count total products in this branch for pagination
      let countQuery = supabase
        .from('stock_barang')
        .select('produk_id', { count: 'exact' })
        .eq('cabang_id', cabang_id);

      if (search) {
        // When searching, we need to join with produk table to filter by name/code
        const { data: searchedProducts, error: searchError } = await supabase
          .from('produk')
          .select('id')
          .or(`nama_produk.ilike.%${search}%,kode_produk.ilike.%${search}%`);

        if (searchError) throw searchError;

        const searchProductIds = searchedProducts?.map(p => p.id) || [];
        if (searchProductIds.length > 0) {
          countQuery = countQuery.in('produk_id', searchProductIds);
        } else {
          // No products match search, return empty
          return NextResponse.json({
            success: true,
            data: [],
            pagination: {
              page,
              limit,
              totalRecords: 0,
              totalPages: 0,
            },
          });
        }
      }

      const { count: branchCount } = await countQuery;

      if (branchCount === 0) {
        // No products in this branch, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            totalRecords: 0,
            totalPages: 0,
          },
        });
      }

      // Get all product IDs with transactions in this branch
      let allBranchQuery = supabase
        .from('stock_barang')
        .select('produk_id')
        .eq('cabang_id', cabang_id);

      if (search) {
        const { data: searchedProducts } = await supabase
          .from('produk')
          .select('id')
          .or(`nama_produk.ilike.%${search}%,kode_produk.ilike.%${search}%`);

        const searchProductIds = searchedProducts?.map(p => p.id) || [];
        allBranchQuery = allBranchQuery.in('produk_id', searchProductIds);
      }

      const { data: allBranchProducts, error: allBranchError } = await allBranchQuery
        .order('produk_id');

      if (allBranchError) throw allBranchError;

      const allProductIds = [...new Set(allBranchProducts?.map(bp => bp.produk_id) || [])];
      const uniqueProductIds = allProductIds.slice(offset, offset + limit);
      const totalRecords = allProductIds.length;
      const totalPages = Math.ceil(totalRecords / limit);

      if (uniqueProductIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            totalRecords,
            totalPages,
          },
        });
      }

      // Query products that are active in this branch (current page)
      query = supabase
        .from('produk')
        .select('id, nama_produk, kode_produk, satuan, stok, hpp, harga')
        .in('id', uniqueProductIds);

      // Branch-specific pagination (use calculated count of unique products)
    } else {
      // Global view: Show all products
      query = supabase
        .from('produk')
        .select('id, nama_produk, kode_produk, satuan, stok, hpp, harga', { count: 'exact' });

      // Search filter
      if (search) {
        query = query.or(`nama_produk.ilike.%${search}%,kode_produk.ilike.%${search}%`);
      }

      const { data: products, error, count } = await query
        .order('nama_produk')
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // For global view, return the data directly from this query
      const formattedGlobalData = products?.map(p => {
        const stock = parseFloat(p.stok?.toString() || '0');
        const hpp = parseFloat(p.hpp?.toString() || '0');
        const harga_jual = parseFloat(p.harga?.toString() || '0');
        const margin = hpp > 0 ? ((harga_jual - hpp) / hpp) * 100 : 0;

        return {
          produk_id: p.id,
          nama_produk: p.nama_produk,
          kode_produk: p.kode_produk,
          satuan: p.satuan || 'Kg',
          stock: stock,
          stock_masuk: 0,
          stock_keluar: 0,
          hpp: hpp,
          harga_jual: harga_jual,
          margin: margin,
          cabang: 'Semua Cabang',
          cabang_id: 0,
          has_negative: stock < 0,
        };
      }) || [];

      return NextResponse.json({
        success: true,
        data: formattedGlobalData,
        pagination: {
          page,
          limit,
          totalRecords: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    const { data: products, error, count } = await query
      .order('nama_produk')
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Ambil history summary per produk (untuk info tambahan)
    const produkIds = products?.map(p => p.id) || [];
    
    let historyQuery = supabase
      .from('stock_barang')
      .select('produk_id, jumlah, tipe, cabang_id');

    if (produkIds.length > 0) {
      historyQuery = historyQuery.in('produk_id', produkIds);
    }

    if (cabang_id > 0) {
      historyQuery = historyQuery.eq('cabang_id', cabang_id);
    }

    const { data: histories } = await historyQuery;

    // Group history by produk_id
    const historyMap = new Map<number, { masuk: number; keluar: number }>();
    
    histories?.forEach(h => {
      if (!historyMap.has(h.produk_id)) {
        historyMap.set(h.produk_id, { masuk: 0, keluar: 0 });
      }
      const summary = historyMap.get(h.produk_id)!;
      const jumlah = parseFloat(h.jumlah?.toString() || '0');
      
      if (h.tipe === 'masuk') summary.masuk += jumlah;
      if (h.tipe === 'keluar') summary.keluar += jumlah;
    });

    // Get cabang info if filtered
    let cabangName = 'Semua Cabang';
    if (cabang_id > 0) {
      const { data: cabangData } = await supabase
        .from('cabang')
        .select('nama_cabang')
        .eq('id', cabang_id)
        .single();
      
      if (cabangData) {
        cabangName = cabangData.nama_cabang;
      }
    }

    // ✅ CRITICAL FIX: Format data dengan stock PER BRANCH
    const formattedData = products?.map(p => {
      const history = historyMap.get(p.id) || { masuk: 0, keluar: 0 };
      // Stock per branch: masuk - keluar untuk cabang yang difilter
      const stock = cabang_id > 0 ? (history.masuk - history.keluar)
                                  : parseFloat(p.stok?.toString() || '0'); // Global stock for all cabang view
      const hpp = parseFloat(p.hpp?.toString() || '0');
      const harga_jual = parseFloat(p.harga?.toString() || '0');

      // Calculate margin
      const margin = hpp > 0 ? ((harga_jual - hpp) / hpp) * 100 : 0;

      // 🔄 SPECIAL HANDLING FOR Kg PRODUCTS: Ensure proper decimal handling
      // Calculate stock display with proper precision for Kg products
      const isKgProduct = (p.satuan || '').toLowerCase() === 'kg';
      const displayStock = isKgProduct ? parseFloat(stock.toFixed(3)) : parseFloat(stock.toFixed(2));

      return {
        produk_id: p.id,
        nama_produk: p.nama_produk,
        kode_produk: p.kode_produk,
        satuan: p.satuan || 'Kg',
        stock: displayStock, // ✅ Precise decimal handling for Kg products
        stock_masuk: history.masuk,
        stock_keluar: history.keluar,
        hpp: hpp,
        harga_jual: harga_jual,
        margin: margin,
        cabang: cabangName,
        cabang_id: cabang_id || 0,
        has_negative: displayStock < 0,
      };
    }) || [];

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    console.log(`✅ Returned ${formattedData.length} products (overview mode)`);

    return NextResponse.json({
      success: true,
      data: formattedData,
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
 * ✅ FIXED: POST - Add/Remove stock (Manual Entry)
 * Pastikan tidak ada double recording
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
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

    console.log('📝 Manual stock entry:', { produk_id, cabang_id, jumlah, tipe });

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
      console.log(`  📈 Stock masuk: ${currentStock} + ${jumlahFloat} = ${newStock}`);
    } else {
      newStock -= jumlahFloat;
      console.log(`  📉 Stock keluar: ${currentStock} - ${jumlahFloat} = ${newStock}`);
      
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

    // ✅ Step 1: Update produk.stok DULU
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

    if (updateError) {
      console.error('❌ Failed to update produk.stok:', updateError);
      throw updateError;
    }

    console.log('✅ Stock updated in produk table');

    // ✅ Step 2: Insert history SETELAH update berhasil
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

    if (insertError) {
      console.error('⚠️ Warning: Failed to record history, rolling back stock...');
      
      // ✅ Rollback produk.stok jika insert history gagal
      await supabase
        .from('produk')
        .update({ stok: currentStock })
        .eq('id', produk_id);
      
      throw insertError;
    }

    console.log('✅ History recorded successfully');

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
