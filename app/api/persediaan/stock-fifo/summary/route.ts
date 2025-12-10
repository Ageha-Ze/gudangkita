'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAuthenticated } from '@/lib/supabaseServer';

// GET - Stock Summary dengan FIFO
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseAuthenticated();
    const { searchParams } = new URL(request.url);
    
    const cabangId = searchParams.get('cabang_id');
    const produkId = searchParams.get('produk_id');

    // Query dari view yang sudah dibuat
    let query = supabase
      .from('v_stock_summary')
      .select('*');

    if (cabangId) {
      query = query.eq('cabang_id', cabangId);
    }

    if (produkId) {
      query = query.eq('produk_id', produkId);
    }

    const { data, error } = await query.order('nama_produk', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
    });
  } catch (error: any) {
    console.error('Error fetching stock summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
