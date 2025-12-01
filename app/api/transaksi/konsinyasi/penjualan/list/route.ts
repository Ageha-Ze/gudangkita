// app/api/transaksi/konsinyasi/penjualan/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    const konsinyasiId = searchParams.get('konsinyasi_id');

    if (!konsinyasiId) {
      return NextResponse.json({ error: 'konsinyasi_id required' }, { status: 400 });
    }

    // Get all detail_konsinyasi IDs untuk konsinyasi ini
    const { data: details, error: detailError } = await supabase
      .from('detail_konsinyasi')
      .select('id')
      .eq('konsinyasi_id', konsinyasiId);

    if (detailError) throw detailError;

    const detailIds = details?.map(d => d.id) || [];

    if (detailIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get all penjualan untuk detail-detail tersebut
    const { data, error } = await supabase
      .from('penjualan_konsinyasi')
      .select(`
        *,
        detail_konsinyasi:detail_konsinyasi_id (
          id,
          produk:produk_id (
            id,
            nama_produk,
            kode_produk,
            satuan
          )
        ),
        kas:kas_id (
          id,
          nama_kas,
          tipe_kas
        )
      `)
      .in('detail_konsinyasi_id', detailIds)
      .order('tanggal_jual', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Error fetching penjualan list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}