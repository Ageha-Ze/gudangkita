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

    console.log('Adding item to penjualan:', penjualan_id, body);

    // Insert detail penjualan
    const detailData = {
      penjualan_id: parseInt(penjualan_id),
      produk_id: body.produk_id,
      jumlah: body.jumlah,
      harga: body.harga,
      subtotal: body.jumlah * body.harga
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

    // Update total penjualan
    const { data: allDetails } = await supabase
      .from('detail_penjualan')
      .select('subtotal')
      .eq('penjualan_id', penjualan_id);

    const total = allDetails?.reduce((sum, item) => sum + parseFloat(item.subtotal.toString()), 0) || 0;

    await supabase
      .from('transaksi_penjualan')
      .update({ total })
      .eq('id', penjualan_id);

    // Kurangi stock barang
    const { data: produk } = await supabase
      .from('produk')
      .select('stok')
      .eq('id', body.produk_id)
      .single();

    if (produk) {
      const newStok = parseFloat(produk.stok) - parseFloat(body.jumlah);
      await supabase
        .from('produk')
        .update({ stok: newStok })
        .eq('id', body.produk_id);

      // Insert history ke stock_barang
      await supabase
        .from('stock_barang')
        .insert({
          produk_id: body.produk_id,
          cabang_id: body.cabang_id,
          jumlah: body.jumlah,
          tanggal: new Date().toISOString().split('T')[0],
          tipe: 'keluar',
          keterangan: `Penjualan #${penjualan_id}`
        });
    }

    return NextResponse.json({ 
      data: detail, 
      message: 'Item berhasil ditambahkan' 
    });
  } catch (error: any) {
    console.error('Error:', error);
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

    // Get item data before delete (untuk return stock)
    const { data: item } = await supabase
      .from('detail_penjualan')
      .select('produk_id, jumlah')
      .eq('id', itemId)
      .single();

    if (item) {
      // Return stock ke produk
      const { data: produk } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', item.produk_id)
        .single();

      if (produk) {
        const newStok = parseFloat(produk.stok) + parseFloat(item.jumlah);
        await supabase
          .from('produk')
          .update({ stok: newStok })
          .eq('id', item.produk_id);
      }
    }

    // Delete detail
    const { error } = await supabase
      .from('detail_penjualan')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    // Update total penjualan
    const { data: allDetails } = await supabase
      .from('detail_penjualan')
      .select('subtotal')
      .eq('penjualan_id', penjualanId);

    const total = allDetails?.reduce((sum, item) => sum + parseFloat(item.subtotal.toString()), 0) || 0;

    await supabase
      .from('transaksi_penjualan')
      .update({ total })
      .eq('id', penjualanId);

    return NextResponse.json({ message: 'Item berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}