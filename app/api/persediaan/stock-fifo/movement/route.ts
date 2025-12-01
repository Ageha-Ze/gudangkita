'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - Movement History per Produk
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    
    const produkId = searchParams.get('produk_id');
    const cabangId = searchParams.get('cabang_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const tipe = searchParams.get('tipe'); // 'masuk' atau 'keluar'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('stock_movement_fifo')
      .select(`
        *,
        produk:produk_id (
          nama_produk,
          kode_produk
        ),
        cabang:cabang_id (
          nama_cabang
        )
      `, { count: 'exact' });

    // Filters
    if (produkId) {
      query = query.eq('produk_id', produkId);
    }

    if (cabangId) {
      query = query.eq('cabang_id', cabangId);
    }

    if (tipe) {
      query = query.eq('tipe', tipe);
    }

    if (startDate) {
      query = query.gte('tanggal', startDate);
    }

    if (endDate) {
      query = query.lte('tanggal', endDate);
    }

    const { data, error, count } = await query
      .order('tanggal', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Calculate running balance (untuk tipe masuk yang masih ada sisa)
    const movements = data || [];
    
    // Summary
    const summary = {
      total_masuk: movements
        .filter(m => m.tipe === 'masuk')
        .reduce((sum, m) => sum + Number(m.jumlah_awal), 0),
      total_keluar: movements
        .filter(m => m.tipe === 'keluar')
        .reduce((sum, m) => sum + Number(m.jumlah_awal), 0),
      stock_tersedia: movements
        .filter(m => m.tipe === 'masuk')
        .reduce((sum, m) => sum + Number(m.jumlah_sisa), 0),
      nilai_stock: movements
        .filter(m => m.tipe === 'masuk' && Number(m.jumlah_sisa) > 0)
        .reduce((sum, m) => sum + (Number(m.jumlah_sisa) * Number(m.hpp_per_unit)), 0),
    };

    return NextResponse.json({
      data: movements,
      summary,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching movement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}