// app/api/transaksi/konsinyasi/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - Detail konsinyasi by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await params;

    const { data, error } = await supabase
      .from('transaksi_konsinyasi')
      .select(`
        *,
        toko:toko_id (
          id,
          kode_toko,
          nama_toko
        ),
        cabang:cabang_id (
          id,
          nama_cabang
        ),
        pegawai:pegawai_id (
          id,
          nama
        ),
        detail_konsinyasi (
          *,
          produk:produk_id (
            id,
            nama_produk,
            kode_produk,
            satuan
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching detail:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update status konsinyasi
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('transaksi_konsinyasi')
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Status berhasil diupdate',
      data,
    });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}