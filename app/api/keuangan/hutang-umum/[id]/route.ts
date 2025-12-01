'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - Fetch detail hutang
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    const { data, error } = await supabase
      .from('hutang_umum')
      .select(`
        *,
        kas:kas_id (id, nama_kas)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching hutang detail:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update hutang
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;
    const body = await request.json();

    const {
      jenis_hutang,
      tanggal_transaksi,
      pihak,
      keterangan,
      nominal_total,
      kas_id,
    } = body;

    // Get existing hutang untuk cek perubahan nominal
    const { data: existingHutang } = await supabase
      .from('hutang_umum')
      .select('nominal_total, dibayar')
      .eq('id', id)
      .single();

    const nominalBaru = Number(nominal_total);
    const dibayar = Number(existingHutang?.dibayar || 0);
    const sisaBaru = nominalBaru - dibayar;

    // Update hutang
    const { data, error } = await supabase
      .from('hutang_umum')
      .update({
        jenis_hutang,
        tanggal_transaksi,
        pihak,
        keterangan: keterangan || null,
        nominal_total: nominalBaru,
        sisa: sisaBaru,
        status: sisaBaru <= 0 ? 'lunas' : 'belum_lunas',
        kas_id: Number(kas_id),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      message: 'Hutang berhasil diupdate',
      data,
    });
  } catch (error: any) {
    console.error('Error updating hutang:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete hutang
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    // Delete hutang (cicilan akan terhapus otomatis karena ON DELETE CASCADE)
    const { error } = await supabase
      .from('hutang_umum')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Hutang berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting hutang:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}