'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - List cicilan by pembelian_id
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    const { data, error } = await supabase
      .from('cicilan_pembelian')
      .select('*')
      .eq('pembelian_id', id)
      .order('tanggal_cicilan', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Add cicilan
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id: pembelian_id } = await context.params;
    const body = await request.json();

    // Validate and update kas saldo
    if (body.rekening) {
      const { data: kas, error: kasError } = await supabase
        .from('kas')
        .select('*')
        .eq('nama_kas', body.rekening)
        .single();

      if (kasError) throw kasError;
      if (!kas) {
        return NextResponse.json({ error: 'Data kas tidak ditemukan' }, { status: 404 });
      }

      const kasSaldo = parseFloat(kas.saldo.toString());
      const jumlahBayar = parseFloat(body.jumlah_cicilan.toString());

      if (kasSaldo < jumlahBayar) {
        return NextResponse.json(
          { error: `Saldo kas tidak cukup. Saldo tersedia: Rp. ${kasSaldo.toLocaleString('id-ID')}` },
          { status: 400 }
        );
      }

      const newSaldo = kasSaldo - jumlahBayar;

      const { error: updateKasError } = await supabase
        .from('kas')
        .update({ saldo: newSaldo })
        .eq('id', kas.id);

      if (updateKasError) throw updateKasError;

      await supabase
        .from('transaksi_kas')
        .insert({
          kas_id: kas.id,
          tanggal_transaksi: body.tanggal_cicilan,
          debit: jumlahBayar,
          kredit: 0,
          keterangan: `Pembayaran pembelian - ${body.type} (ID: ${pembelian_id})`
        });
    }

    // Insert cicilan
    const { data: cicilan, error: cicilanError } = await supabase
      .from('cicilan_pembelian')
      .insert({
        pembelian_id: parseInt(pembelian_id),
        tanggal_cicilan: body.tanggal_cicilan,
        jumlah_cicilan: body.jumlah_cicilan,
        rekening: body.rekening,
        type: body.type,
        keterangan: body.keterangan
      })
      .select()
      .single();

    if (cicilanError) throw cicilanError;

    if (body.rekening) {
  const { error: updateRekeningError } = await supabase
    .from('transaksi_pembelian')
    .update({ rekening_bayar: body.rekening })
    .eq('id', pembelian_id);
  
  if (updateRekeningError) {
    console.warn('Warning: Could not update rekening_bayar', updateRekeningError);
  }
}

    // Update hutang_pembelian
    const { data: hutang, error: hutangError } = await supabase
      .from('hutang_pembelian')
      .select('*')
      .eq('pembelian_id', pembelian_id)
      .single();

    let hutangData = null;

    if (hutang) {
      const newDibayar = parseFloat(hutang.dibayar.toString()) + parseFloat(body.jumlah_cicilan.toString());
      const newSisa = parseFloat(hutang.total_hutang.toString()) - newDibayar;
      const newStatus = newSisa <= 0 ? 'lunas' : 'belum_lunas';

      const { data: updatedHutang, error: updateHutangError } = await supabase
        .from('hutang_pembelian')
        .update({
          dibayar: newDibayar,
          sisa: newSisa,
          status: newStatus
        })
        .eq('pembelian_id', pembelian_id)
        .select()
        .single();

      if (updateHutangError) throw updateHutangError;

      hutangData = updatedHutang;

      await supabase
        .from('transaksi_pembelian')
        .update({
          status_pembayaran: newSisa <= 0 ? 'Lunas' : 'Cicil'
        })
        .eq('id', pembelian_id);

    }

    let updatedPembelian = null;
    try {
      const result = await supabase
        .from('transaksi_pembelian')
        .select('*, suplier(id, nama), cabang(id, nama_cabang, kode_cabang), detail_pembelian(id, jumlah, harga, subtotal)')
        .eq('id', pembelian_id)
        .single();

      if ('data' in result) {
        updatedPembelian = result.data;
      }
    } catch (e) {}

    return NextResponse.json({
      data: cicilan,
      hutang: hutangData,
      pembelian: updatedPembelian,
      message: 'Cicilan berhasil ditambahkan'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete cicilan
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const searchParams = request.nextUrl.searchParams;
    const cicilanId = searchParams.get('cicilanId');
    const pembelianId = searchParams.get('pembelianId');

    if (!cicilanId || !pembelianId) {
      return NextResponse.json({ error: 'Missing cicilanId or pembelianId' }, { status: 400 });
    }

    const { data: cicilan } = await supabase
      .from('cicilan_pembelian')
      .select('jumlah_cicilan, rekening')
      .eq('id', cicilanId)
      .single();

    if (cicilan) {
      const { data: kas } = await supabase
        .from('kas')
        .select('*')
        .eq('nama_kas', cicilan.rekening)
        .single();

      if (kas) {
        const kasSaldo = parseFloat(kas.saldo.toString());
        const jumlahKembali = parseFloat(cicilan.jumlah_cicilan.toString());
        const newSaldo = kasSaldo + jumlahKembali;

        await supabase
          .from('kas')
          .update({ saldo: newSaldo })
          .eq('id', kas.id);

        await supabase
          .from('transaksi_kas')
          .insert({
            kas_id: kas.id,
            tanggal_transaksi: new Date().toISOString().split('T')[0],
            debit: 0,
            kredit: jumlahKembali,
            keterangan: `Pembatalan cicilan pembelian (ID: ${pembelianId})`
          });
      }

      await supabase
        .from('cicilan_pembelian')
        .delete()
        .eq('id', cicilanId);

      const { data: hutang } = await supabase
        .from('hutang_pembelian')
        .select('*')
        .eq('pembelian_id', pembelianId)
        .single();

      if (hutang) {
        const newDibayar = parseFloat(hutang.dibayar.toString()) - parseFloat(cicilan.jumlah_cicilan.toString());
        const newSisa = parseFloat(hutang.total_hutang.toString()) - newDibayar;
        const newStatus = newSisa <= 0 ? 'lunas' : 'belum_lunas';

        await supabase
          .from('hutang_pembelian')
          .update({
            dibayar: newDibayar,
            sisa: newSisa,
            status: newStatus
          })
          .eq('pembelian_id', pembelianId);

        await supabase
          .from('transaksi_pembelian')
          .update({
            status_pembayaran: newSisa <= 0 ? 'Lunas' : newDibayar > 0 ? 'Cicil' : 'Belum Lunas'
          })
          .eq('id', pembelianId);

        try {
          const decJumlah = parseFloat(cicilan.jumlah_cicilan.toString());
          const { data: existingDec, error: existingDecError } = await supabase
            .from('transaksi_pembelian')
            .select('uang_muka')
            .eq('id', pembelianId)
            .single();

          if (existingDecError) throw existingDecError;

          const currentDec = existingDec?.uang_muka ? parseFloat(existingDec.uang_muka.toString()) : 0;
          const newUangMukaDec = Math.max(0, currentDec - decJumlah);

          const { error: updateDecError } = await supabase
            .from('transaksi_pembelian')
            .update({ uang_muka: newUangMukaDec })
            .eq('id', pembelianId);

          if (updateDecError) throw updateDecError;
        } catch (e) {
          console.warn('Could not decrement uang_muka automatically', e);
        }
      }
    }

    let updatedPembelian = null;
    try {
      const result = await supabase
        .from('transaksi_pembelian')
        .select('*, suplier(id, nama), cabang(id, nama_cabang, kode_cabang), detail_pembelian(id, jumlah, harga, subtotal)')
        .eq('id', pembelianId)
        .single();

      if ('data' in result) {
        updatedPembelian = result.data;
      }
    } catch (e) {}

    return NextResponse.json({ message: 'Cicilan berhasil dihapus', pembelian: updatedPembelian });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
