'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';

/**
 * GET - Get stock data for specific product + branch combination
 * Alternative to nested dynamic routes to avoid Next.js conflicts
 * URL: /api/persediaan/stock-barang/get-stock?produk_id=XXX&cabang_id=XXX
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const { searchParams } = new URL(request.url);

    const produkId = searchParams.get('produk_id');
    const cabangId = searchParams.get('cabang_id');

    if (!produkId || !cabangId) {
      return NextResponse.json(
        { success: false, error: 'produk_id and cabang_id are required query parameters' },
        { status: 400 }
      );
    }

    const produkIdNum = parseInt(produkId);
    const cabangIdNum = parseInt(cabangId);

    if (isNaN(produkIdNum) || isNaN(cabangIdNum)) {
      return NextResponse.json(
        { success: false, error: 'produk_id and cabang_id must be valid numbers' },
        { status: 400 }
      );
    }

    // Get produkt data
    const { data: produk, error: produkError } = await supabase
      .from('produk')
      .select('*')
      .eq('id', produkIdNum)
      .single();

    if (produkError || !produk) {
      return NextResponse.json(
        { success: false, error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Calculate margin
    const hpp = parseFloat(produk.hpp?.toString() || '0');
    const harga_jual = parseFloat(produk.harga?.toString() || '0');
    const margin = hpp > 0 ? ((harga_jual - hpp) / hpp) * 100 : 0;

    // Get stock history summary for this branch
    const { data: histories } = await supabase
      .from('stock_barang')
      .select('jumlah, tipe')
      .eq('produk_id', produkIdNum)
      .eq('cabang_id', cabangIdNum);

    let masuk = 0;
    let keluar = 0;
    histories?.forEach(h => {
      const jumlah = parseFloat(h.jumlah?.toString() || '0');
      if (h.tipe === 'masuk') {
        masuk += jumlah;
      } else if (h.tipe === 'keluar') {
        keluar += jumlah;
      }
    });

    // Get cabang name
    const { data: cabang } = await supabase
      .from('cabang')
      .select('nama_cabang')
      .eq('id', cabangIdNum)
      .single();

    // ✅ CRITICAL FIX: Calculate stock PER BRANCH by summing movements
    const stock = masuk - keluar; // Branch-specific stock calculation

    const data = {
      produk_id: produkIdNum,
      nama_produk: produk.nama_produk,
      kode_produk: produk.kode_produk,
      satuan: produk.satuan || 'Kg',
      cabang_id: cabangIdNum,
      cabang: cabang?.nama_cabang || 'Unknown',
      // Stock data PER BRANCH
      stock: stock, // Branch-specific stock
      stock_masuk: masuk,
      stock_keluar: keluar,
      // Price data (global, not per branch)
      hpp: hpp,
      harga_jual: harga_jual,
      margin: margin,
      // Product info
      unit: produk.satuan || 'Kg',
    };

    return NextResponse.json({
      success: true,
      data: data,
    });

  } catch (error: any) {
    console.error('❌ Error getting stock data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
