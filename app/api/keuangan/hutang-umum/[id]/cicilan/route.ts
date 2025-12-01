'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - Fetch history cicilan
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    const { data, error } = await supabase
      .from('cicilan_hutang_umum')
      .select(`
        *,
        kas:kas_id (id, nama_kas)
      `)
      .eq('hutang_id', id)
      .order('tanggal_cicilan', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Error fetching cicilan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add cicilan or pelunasan
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;
    const body = await request.json();

    const { tanggal_cicilan, jumlah_cicilan, kas_id, keterangan, is_pelunasan } = body;

    // Get hutang info
    const { data: hutang } = await supabase
      .from('hutang_umum')
      .select('dibayar, sisa, nominal_total')
      .eq('id', id)
      .single();

    if (!hutang) {
      return NextResponse.json({ error: 'Hutang tidak ditemukan' }, { status: 404 });
    }

    let jumlahBayar = Number(jumlah_cicilan);

    // Jika pelunasan, bayar semua sisa
    if (is_pelunasan) {
      jumlahBayar = Number(hutang.sisa);
    }

    // Validasi jumlah cicilan tidak melebihi sisa
    if (jumlahBayar > Number(hutang.sisa)) {
      return NextResponse.json(
        { error: 'Jumlah cicilan melebihi sisa hutang' },
        { status: 400 }
      );
    }

    // Insert cicilan
    const { error: cicilanError } = await supabase
      .from('cicilan_hutang_umum')
      .insert({
        hutang_id: Number(id),
        tanggal_cicilan,
        jumlah_cicilan: jumlahBayar,
        kas_id: Number(kas_id),
        keterangan: keterangan || (is_pelunasan ? 'Pelunasan' : null),
      });

    if (cicilanError) throw cicilanError;

    // Update hutang
    const dibayarBaru = Number(hutang.dibayar) + jumlahBayar;
    const sisaBaru = Number(hutang.nominal_total) - dibayarBaru;

    const { error: updateError } = await supabase
      .from('hutang_umum')
      .update({
        dibayar: dibayarBaru,
        sisa: sisaBaru,
        status: sisaBaru <= 0 ? 'lunas' : 'belum_lunas',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Insert transaksi kas (kredit = uang masuk/pengembalian)
    const { error: kasError } = await supabase
      .from('transaksi_kas')
      .insert({
        kas_id: Number(kas_id),
        tanggal_transaksi: tanggal_cicilan,
        kredit: jumlahBayar,
        debit: 0,
        keterangan: `Pembayaran cicilan hutang #${id}`,
      });

    if (kasError) throw kasError;

    return NextResponse.json({
      message: is_pelunasan ? 'Hutang berhasil dilunasi' : 'Cicilan berhasil ditambahkan',
    });
  } catch (error: any) {
    console.error('Error adding cicilan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete cicilan
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    const cicilanId = searchParams.get('cicilanId');
    const hutangId = searchParams.get('hutangId');

    if (!cicilanId || !hutangId) {
      return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    // Get cicilan info
    const { data: cicilan } = await supabase
      .from('cicilan_hutang_umum')
      .select('jumlah_cicilan')
      .eq('id', cicilanId)
      .single();

    if (!cicilan) {
      return NextResponse.json({ error: 'Cicilan tidak ditemukan' }, { status: 404 });
    }

    // Delete cicilan
    const { error: deleteError } = await supabase
      .from('cicilan_hutang_umum')
      .delete()
      .eq('id', cicilanId);

    if (deleteError) throw deleteError;

    // Update hutang (kurangi dibayar, tambah sisa)
    const { data: hutang } = await supabase
      .from('hutang_umum')
      .select('dibayar, nominal_total')
      .eq('id', hutangId)
      .single();

    if (hutang) {
      const dibayarBaru = Number(hutang.dibayar) - Number(cicilan.jumlah_cicilan);
      const sisaBaru = Number(hutang.nominal_total) - dibayarBaru;

      await supabase
        .from('hutang_umum')
        .update({
          dibayar: dibayarBaru,
          sisa: sisaBaru,
          status: sisaBaru > 0 ? 'belum_lunas' : 'lunas',
          updated_at: new Date().toISOString(),
        })
        .eq('id', hutangId);
    }

    return NextResponse.json({ message: 'Cicilan berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting cicilan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}