// app/api/gudang/produksi/[id]/post/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await supabaseServer();

    // 1. Get data produksi
    const { data: produksi, error: produksiError } = await supabase
      .from('transaksi_produksi')
      .select('*, detail_produksi(*)')
      .eq('id', parseInt(id))
      .single();

    if (produksiError) throw produksiError;
    if (!produksi) {
      return NextResponse.json({ error: 'Produksi tidak ditemukan' }, { status: 404 });
    }

    // Validasi: Cek apakah sudah posted
    if (produksi.status === 'posted') {
      return NextResponse.json({ 
        error: 'Produksi sudah diposting sebelumnya' 
      }, { status: 400 });
    }

    // 2. Update status to 'posted'
    const { error: updateError } = await supabase
      .from('transaksi_produksi')
      .update({ status: 'posted' })
      .eq('id', parseInt(id));

    if (updateError) throw updateError;

    // 3. Kurangi stock bahan baku (item yang digunakan)
    for (const detail of produksi.detail_produksi || []) {
      // Get current stock item
      const { data: item } = await supabase
        .from('produk')
        .select('stok')
        .eq('id', detail.item_id)
        .single();

      if (item) {
        const newStok = parseFloat(item.stok) - parseFloat(detail.jumlah);
        
        // Validasi stock tidak negatif
        if (newStok < 0) {
          return NextResponse.json({ 
            error: `Stock ${detail.item_id} tidak mencukupi! Tersedia: ${item.stok}, Dibutuhkan: ${detail.jumlah}` 
          }, { status: 400 });
        }
        
        // Update stock produk
        await supabase
          .from('produk')
          .update({ stok: newStok })
          .eq('id', detail.item_id);

        // Insert stock movement (keluar)
        await supabase
          .from('stock_barang')
          .insert({
            produk_id: detail.item_id,
            cabang_id: produksi.cabang_id,
            jumlah: detail.jumlah,
            tanggal: produksi.tanggal,
            tipe: 'keluar',
            keterangan: `Produksi: ${produksi.produk_id} - ${produksi.jumlah} ${produksi.satuan}`,
            hpp: detail.hpp,
          });
      }
    }

    // 4. Tambah stock produk hasil produksi
    const { data: produkHasil } = await supabase
      .from('produk')
      .select('stok')
      .eq('id', produksi.produk_id)
      .single();

    if (produkHasil) {
      const newStokHasil = parseFloat(produkHasil.stok) + parseFloat(produksi.jumlah);
      
      // Update stock produk hasil
      await supabase
        .from('produk')
        .update({ stok: newStokHasil })
        .eq('id', produksi.produk_id);

      // Hitung total HPP dari komposisi
      const totalHPP = produksi.detail_produksi?.reduce(
        (sum: number, d: any) => sum + parseFloat(d.subtotal),
        0
      ) || 0;

      const hppPerUnit = totalHPP / parseFloat(produksi.jumlah);

      // Insert stock movement (masuk) untuk hasil produksi
      await supabase
        .from('stock_barang')
        .insert({
          produk_id: produksi.produk_id,
          cabang_id: produksi.cabang_id,
          jumlah: produksi.jumlah,
          tanggal: produksi.tanggal,
          tipe: 'masuk',
          keterangan: `Hasil Produksi - ID: ${id}`,
          hpp: hppPerUnit,
        });

      // Update HPP produk hasil
      await supabase
        .from('produk')
        .update({ 
          hpp: hppPerUnit,
          harga: hppPerUnit 
        })
        .eq('id', produksi.produk_id);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Produksi berhasil diposting',
      data: produksi 
    });
  } catch (error: any) {
    console.error('Error posting production:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}