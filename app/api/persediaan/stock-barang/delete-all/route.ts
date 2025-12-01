// app/api/persediaan/stock-barang/delete-all/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * POST - Delete all stock_barang records for a product
 * This will also reset the product stock to 0
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    const { produk_id, cabang_id } = body;

    if (!produk_id) {
      return NextResponse.json(
        { success: false, error: 'produk_id is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting all stock for produk_id: ${produk_id}, cabang_id: ${cabang_id || 'ALL'}`);

    // Get product info first
    const { data: produk, error: produkError } = await supabase
      .from('produk')
      .select('nama_produk, kode_produk')
      .eq('id', produk_id)
      .single();

    if (produkError) throw produkError;

    // Delete stock_barang records
    let deleteQuery = supabase
      .from('stock_barang')
      .delete()
      .eq('produk_id', produk_id);

    // If cabang_id is provided, only delete for that cabang
    if (cabang_id) {
      deleteQuery = deleteQuery.eq('cabang_id', cabang_id);
    }

    const { error: deleteError, count } = await deleteQuery;

    if (deleteError) throw deleteError;

    console.log(`✅ Deleted ${count} stock_barang records`);

    // Recalculate stock from remaining movements (if cabang_id was specified)
    if (cabang_id) {
      // Get remaining movements for this product (other branches)
      const { data: remainingMovements, error: movementsError } = await supabase
        .from('stock_barang')
        .select('jumlah, tipe')
        .eq('produk_id', produk_id);

      if (movementsError) throw movementsError;

      let totalStock = 0;
      remainingMovements?.forEach((m: any) => {
        const jumlah = parseFloat(m.jumlah.toString());
        if (m.tipe === 'masuk') {
          totalStock += jumlah;
        } else if (m.tipe === 'keluar') {
          totalStock -= jumlah;
        }
      });

      // Update produk stock
      const { error: updateError } = await supabase
        .from('produk')
        .update({ stok: totalStock })
        .eq('id', produk_id);

      if (updateError) throw updateError;

      console.log(`✅ Updated product stock to: ${totalStock}`);

      return NextResponse.json({
        success: true,
        message: `Stock deleted for ${produk?.nama_produk} at selected branch`,
        data: {
          produk_id,
          nama_produk: produk?.nama_produk,
          kode_produk: produk?.kode_produk,
          records_deleted: count,
          new_stock: totalStock,
        },
      });
    } else {
      // If all branches deleted, set stock to 0
      const { error: updateError } = await supabase
        .from('produk')
        .update({ stok: 0 })
        .eq('id', produk_id);

      if (updateError) throw updateError;

      console.log(`✅ Reset product stock to 0`);

      return NextResponse.json({
        success: true,
        message: `All stock deleted for ${produk?.nama_produk}`,
        data: {
          produk_id,
          nama_produk: produk?.nama_produk,
          kode_produk: produk?.kode_produk,
          records_deleted: count,
          new_stock: 0,
        },
      });
    }
  } catch (error: any) {
    console.error('❌ Error deleting stock:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}