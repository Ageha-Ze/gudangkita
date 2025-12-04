// app/api/transaksi/penjualan/[id]/items/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// POST - Tambah item ke penjualan
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id: penjualan_id } = await context.params;
    const body = await request.json();

    console.log('➕ Adding item to penjualan:', penjualan_id, body);

    // ✅ Validasi: Cek apakah penjualan sudah dikonfirmasi
    const { data: penjualan, error: penjualanError } = await supabase
      .from('transaksi_penjualan')
      .select('status, status_diterima')
      .eq('id', penjualan_id)
      .single();

    if (penjualanError) throw penjualanError;

    // Tidak bisa tambah item jika sudah dikonfirmasi
    if (penjualan.status_diterima === 'Diterima') {
      return NextResponse.json({
        error: 'Tidak bisa menambah item pada penjualan yang sudah dikonfirmasi'
      }, { status: 400 });
    }

    // ✅ Validasi: Cek stock availability (info saja, tidak dikurangi)
    const { data: produk, error: produkError } = await supabase
      .from('produk')
      .select('stok, nama_produk')
      .eq('id', body.produk_id)
      .single();

    if (produkError) throw produkError;

    const stokTersedia = parseFloat(produk.stok?.toString() || '0');
    const jumlahDiminta = parseFloat(body.jumlah?.toString() || '0');

    if (stokTersedia < jumlahDiminta) {
      return NextResponse.json({
        error: `Stock ${produk.nama_produk} tidak mencukupi! Tersedia: ${stokTersedia}, Diminta: ${jumlahDiminta}`
      }, { status: 400 });
    }

    console.log(`  ℹ️ Stock check: ${produk.nama_produk} = ${stokTersedia} (cukup untuk ${jumlahDiminta})`);

    // ✅ Insert detail penjualan (TANPA mengurangi stock)
    const detailData = {
      penjualan_id: parseInt(penjualan_id),
      produk_id: body.produk_id,
      jumlah: jumlahDiminta,
      harga: parseFloat(body.harga?.toString() || '0'),
      subtotal: jumlahDiminta * parseFloat(body.harga?.toString() || '0')
    };

    const { data: detail, error: detailError } = await supabase
      .from('detail_penjualan')
      .insert(detailData)
      .select(`
        *,
        produk:produk_id (id, nama_produk, kode_produk, satuan)
      `)
      .single();

    if (detailError) throw detailError;

    console.log('  ✅ Item added (stock NOT reduced yet)');

    // ✅ Update total penjualan
    const { data: allDetails } = await supabase
      .from('detail_penjualan')
      .select('subtotal')
      .eq('penjualan_id', penjualan_id);

    const total = allDetails?.reduce(
      (sum, item) => sum + parseFloat(item.subtotal?.toString() || '0'), 
      0
    ) || 0;

    const { error: updateTotalError } = await supabase
      .from('transaksi_penjualan')
      .update({ total })
      .eq('id', penjualan_id);

    if (updateTotalError) throw updateTotalError;

    console.log(`  💰 Total updated: ${total}`);

    // ❌ TIDAK ADA PENGURANGAN STOCK DI SINI!
    // Stock akan dikurangi saat konfirmasi "Diterima" di route konfirmasi/route.ts

    return NextResponse.json({ 
      success: true,
      data: detail, 
      message: 'Item berhasil ditambahkan. Stock akan dikurangi saat konfirmasi penerimaan.',
      stock_info: {
        product: produk.nama_produk,
        available: stokTersedia,
        reserved: jumlahDiminta,
        remaining: stokTersedia - jumlahDiminta
      }
    });
  } catch (error: any) {
    console.error('❌ Error adding item:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Hapus item dari penjualan
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('itemId');
    const penjualanId = searchParams.get('penjualanId');

    if (!itemId || !penjualanId) {
      return NextResponse.json(
        { error: 'Missing itemId or penjualanId' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting item:', itemId, 'from penjualan:', penjualanId);

    // ✅ Validasi: Cek apakah penjualan sudah dikonfirmasi
    const { data: penjualan, error: penjualanError } = await supabase
      .from('transaksi_penjualan')
      .select('status, status_diterima')
      .eq('id', penjualanId)
      .single();

    if (penjualanError) throw penjualanError;

    // Tidak bisa hapus item jika sudah dikonfirmasi
    if (penjualan.status_diterima === 'Diterima') {
      return NextResponse.json({
        error: 'Tidak bisa menghapus item pada penjualan yang sudah dikonfirmasi'
      }, { status: 400 });
    }

    // Get item data before delete (untuk info saja)
    const { data: item, error: getItemError } = await supabase
      .from('detail_penjualan')
      .select(`
        produk_id, 
        jumlah
      `)
      .eq('id', itemId)
      .single();

    if (getItemError) throw getItemError;

    // Get product name for logging
    const { data: produkInfo } = await supabase
      .from('produk')
      .select('nama_produk')
      .eq('id', item.produk_id)
      .single();

    console.log(`  📦 Item: ${produkInfo?.nama_produk || 'Unknown'}, Qty: ${item.jumlah}`);

    // ❌ TIDAK ADA PENGEMBALIAN STOCK DI SINI!
    // Karena stock belum dikurangi saat item ditambahkan
    console.log('  ℹ️ Stock NOT returned (was never reduced)');

    // ✅ Delete detail penjualan
    const { error: deleteError } = await supabase
      .from('detail_penjualan')
      .delete()
      .eq('id', itemId);

    if (deleteError) throw deleteError;

    console.log('  ✅ Item deleted');

    // ✅ Update total penjualan
    const { data: allDetails } = await supabase
      .from('detail_penjualan')
      .select('subtotal')
      .eq('penjualan_id', penjualanId);

    const total = allDetails?.reduce(
      (sum, item) => sum + parseFloat(item.subtotal?.toString() || '0'), 
      0
    ) || 0;

    const { error: updateTotalError } = await supabase
      .from('transaksi_penjualan')
      .update({ total })
      .eq('id', penjualanId);

    if (updateTotalError) throw updateTotalError;

    console.log(`  💰 Total updated: ${total}`);

    return NextResponse.json({ 
      success: true,
      message: 'Item berhasil dihapus',
      new_total: total
    });
  } catch (error: any) {
    console.error('❌ Error deleting item:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}