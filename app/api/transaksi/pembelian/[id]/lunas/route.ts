// app/api/transaksi/pembelian/[id]/lunas/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id: pembelian_id } = await context.params;
    const body = await request.json();

    console.log('Processing pelunasan:', body);

    // Get hutang data
    const { data: hutang, error: hutangError } = await supabase
      .from('hutang_pembelian')
      .select('*')
      .eq('pembelian_id', pembelian_id)
      .single();

    if (hutangError) throw hutangError;

    const sisaHutang = parseFloat(hutang.sisa.toString());

    // Get kas data untuk validasi saldo
    if (body.rekening) {
      console.log('Getting kas data for rekening:', body.rekening);

      const { data: kas, error: kasError } = await supabase
        .from('kas')
        .select('*')
        .eq('nama_kas', body.rekening)
        .single();

      if (kasError) {
        console.error('Error getting kas:', kasError);
        throw kasError;
      }

      if (!kas) {
        return NextResponse.json(
          { error: 'Data kas tidak ditemukan' },
          { status: 404 }
        );
      }

      console.log('Kas data found:', kas);

      const kasSaldo = parseFloat(kas.saldo.toString());

      console.log('Saldo validation:', {
        kas_nama: kas.nama_kas,
        saldo_sekarang: kasSaldo,
        sisa_hutang: sisaHutang,
        cukup: kasSaldo >= sisaHutang
      });

      // Validasi: saldo harus cukup untuk pembayaran
      if (kasSaldo < sisaHutang) {
        return NextResponse.json(
          { error: `Saldo kas tidak cukup. Saldo tersedia: Rp. ${kasSaldo.toLocaleString('id-ID')}` },
          { status: 400 }
        );
      }

      // PENTING: Kurangi saldo kas (KELUAR untuk pembelian)
      const newSaldo = kasSaldo - sisaHutang;

      console.log('Updating kas saldo:', {
        old_saldo: kasSaldo,
        sisa_hutang: sisaHutang,
        new_saldo: newSaldo
      });

      const { error: updateKasError } = await supabase
        .from('kas')
        .update({ saldo: newSaldo })
        .eq('id', kas.id);

      if (updateKasError) {
        console.error('Error updating kas:', updateKasError);
        throw updateKasError;
      }

      console.log(`✅ Kas ${kas.nama_kas} updated: ${kasSaldo} - ${sisaHutang} = ${newSaldo}`);

      // Insert transaksi kas (debit = keluar)
      const { error: transaksiKasError } = await supabase
        .from('transaksi_kas')
        .insert({
          kas_id: kas.id,
          tanggal_transaksi: new Date().toISOString().split('T')[0],
          debit: sisaHutang, // Debit = uang keluar
          kredit: 0,
          keterangan: `Pelunasan pembelian (ID: ${pembelian_id})`
        });

      if (transaksiKasError) {
        console.error('Error insert transaksi_kas:', transaksiKasError);
        // Don't throw, just log
      } else {
        console.log('✅ Transaksi kas recorded');
      }
    } else {
      console.warn('⚠️ No rekening provided, skipping kas update');
    }

    // Insert cicilan untuk pelunasan
    const { data: cicilan, error: cicilanError } = await supabase
      .from('cicilan_pembelian')
      .insert({
        pembelian_id: parseInt(pembelian_id),
        tanggal_cicilan: new Date().toISOString().split('T')[0],
        jumlah_cicilan: sisaHutang,
        rekening: body.rekening,
        type: 'Pelunasan',
        keterangan: body.keterangan
      })
      .select()
      .single();

    if (cicilanError) throw cicilanError;

    // Update hutang_pembelian
    const { data: updatedHutang, error: updateHutangError } = await supabase
      .from('hutang_pembelian')
      .update({
        dibayar: hutang.total_hutang,
        sisa: 0,
        status: 'lunas'
      })
      .eq('pembelian_id', pembelian_id)
      .select()
      .single();

    if (updateHutangError) throw updateHutangError;

    // Update status pembayaran di transaksi_pembelian
    const { error: updateTransaksiError } = await supabase
      .from('transaksi_pembelian')
      .update({
        status_pembayaran: 'Lunas',
        rekening_bayar: body.rekening
      })
      .eq('id', pembelian_id);

    if (updateTransaksiError) throw updateTransaksiError;

    return NextResponse.json({
      data: cicilan,
      hutang: updatedHutang,
      message: 'Pelunasan berhasil diproses'
    });
  } catch (error: any) {
    console.error('Error processing pelunasan:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
