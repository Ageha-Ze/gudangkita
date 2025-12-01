// app/api/transaksi/penjualan/[id]/cicilan/[cicilanId]/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// PUT - Update cicilan
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; cicilanId: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id, cicilanId } = await context.params;
    const body = await request.json();

    console.log('📝 Updating cicilan:', cicilanId, body);

    // 1. Get old cicilan data
    const { data: oldCicilan, error: getCicilanError } = await supabase
      .from('cicilan_penjualan')
      .select('jumlah_cicilan, kas_id, tanggal_cicilan')
      .eq('id', cicilanId)
      .single();

    if (getCicilanError) throw getCicilanError;

    const oldJumlah = parseFloat(oldCicilan.jumlah_cicilan);
    const newJumlah = parseFloat(body.jumlah_cicilan);
    const selisih = newJumlah - oldJumlah;
    const gantiKas = oldCicilan.kas_id !== body.kas_id;

    console.log('📊 Update info:', { oldJumlah, newJumlah, selisih, gantiKas });

    // 2. Get penjualan data
    const { data: penjualan } = await supabase
      .from('transaksi_penjualan')
      .select('total, dibayar')
      .eq('id', id)
      .single();

    if (!penjualan) throw new Error('Penjualan not found');

    const total = parseFloat(penjualan.total || '0');
    const dibayarSebelumnya = parseFloat(penjualan.dibayar || '0');
    const sisaSetelahKembalikan = total - (dibayarSebelumnya - oldJumlah);

    // Validasi
    if (newJumlah > sisaSetelahKembalikan) {
      return NextResponse.json(
        { error: `Jumlah cicilan melebihi sisa tagihan. Maksimal: Rp. ${sisaSetelahKembalikan.toLocaleString('id-ID')}` },
        { status: 400 }
      );
    }

    // 3. Update cicilan
    await supabase
      .from('cicilan_penjualan')
      .update({
        tanggal_cicilan: body.tanggal_cicilan,
        jumlah_cicilan: newJumlah,
        kas_id: body.kas_id
      })
      .eq('id', cicilanId);

    // 4. Update transaksi_penjualan
    const dibayarBaru = dibayarSebelumnya + selisih;
    const sisaBaru = total - dibayarBaru;
    const statusBaru = sisaBaru <= 0 ? 'Lunas' : 'Cicil';

    await supabase
      .from('transaksi_penjualan')
      .update({
        dibayar: dibayarBaru,
        status_pembayaran: statusBaru
      })
      .eq('id', id);

    console.log('✅ Penjualan updated:', { dibayarBaru, sisaBaru, statusBaru });

    // 5. Update piutang (jika ada)
    const { data: piutang } = await supabase
      .from('piutang_penjualan')
      .select('*')
      .eq('penjualan_id', id)
      .single();

    if (piutang) {
      await supabase
        .from('piutang_penjualan')
        .update({
          dibayar: dibayarBaru,
          sisa: sisaBaru,
          status: statusBaru === 'Lunas' ? 'lunas' : 'cicil'
        })
        .eq('penjualan_id', id);

      console.log('✅ Piutang updated');
    }

    // 6. Update kas
    if (gantiKas) {
      // GANTI REKENING KAS
      console.log('💳 Ganti rekening kas...');

      // Kurangi dari kas lama
      const { data: kasLama } = await supabase
        .from('kas')
        .select('saldo, nama_kas')
        .eq('id', oldCicilan.kas_id)
        .single();

      if (kasLama) {
        const saldoKasLamaBaru = parseFloat(kasLama.saldo) - oldJumlah;
        await supabase
          .from('kas')
          .update({ saldo: saldoKasLamaBaru })
          .eq('id', oldCicilan.kas_id);

        console.log(`🏦 Kas lama ${kasLama.nama_kas}: ${kasLama.saldo} - ${oldJumlah} = ${saldoKasLamaBaru}`);
      }

      // Tambah ke kas baru
      const { data: kasBaru } = await supabase
        .from('kas')
        .select('saldo, nama_kas')
        .eq('id', body.kas_id)
        .single();

      if (kasBaru) {
        const saldoKasBaruBaru = parseFloat(kasBaru.saldo) + newJumlah;
        await supabase
          .from('kas')
          .update({ saldo: saldoKasBaruBaru })
          .eq('id', body.kas_id);

        console.log(`🏦 Kas baru ${kasBaru.nama_kas}: ${kasBaru.saldo} + ${newJumlah} = ${saldoKasBaruBaru}`);
      }

      // Delete transaksi kas lama
      await supabase
        .from('transaksi_kas')
        .delete()
        .eq('kas_id', oldCicilan.kas_id)
        .eq('tanggal_transaksi', oldCicilan.tanggal_cicilan)
        .ilike('keterangan', `%Cicilan penjualan #${id}%`);

      // Insert transaksi kas baru
      await supabase
        .from('transaksi_kas')
        .insert({
          kas_id: body.kas_id,
          tanggal_transaksi: body.tanggal_cicilan,
          kredit: newJumlah,
          debit: 0,
          keterangan: `Cicilan penjualan #${id} (Edit)`
        });
    } else if (selisih !== 0) {
      // JUMLAH BERUBAH (kas tetap)
      console.log('💰 Update jumlah cicilan...');

      const { data: kas } = await supabase
        .from('kas')
        .select('saldo, nama_kas')
        .eq('id', body.kas_id)
        .single();

      if (kas) {
        const saldoKasBaru = parseFloat(kas.saldo) + selisih;
        await supabase
          .from('kas')
          .update({ saldo: saldoKasBaru })
          .eq('id', body.kas_id);

        console.log(`🏦 Kas ${kas.nama_kas}: ${kas.saldo} + ${selisih} = ${saldoKasBaru}`);
      }

      // Update transaksi kas
      await supabase
        .from('transaksi_kas')
        .delete()
        .eq('kas_id', body.kas_id)
        .eq('tanggal_transaksi', oldCicilan.tanggal_cicilan)
        .ilike('keterangan', `%Cicilan penjualan #${id}%`);

      await supabase
        .from('transaksi_kas')
        .insert({
          kas_id: body.kas_id,
          tanggal_transaksi: body.tanggal_cicilan,
          kredit: newJumlah,
          debit: 0,
          keterangan: `Cicilan penjualan #${id} (Edit)`
        });
    } else {
      // Hanya tanggal berubah
      await supabase
        .from('transaksi_kas')
        .update({ tanggal_transaksi: body.tanggal_cicilan })
        .eq('kas_id', body.kas_id)
        .eq('tanggal_transaksi', oldCicilan.tanggal_cicilan)
        .ilike('keterangan', `%Cicilan penjualan #${id}%`);
    }

    console.log('✅ Cicilan berhasil diupdate!');

    return NextResponse.json({
      success: true,
      message: 'Cicilan berhasil diupdate',
      data: { dibayar: dibayarBaru, sisa: sisaBaru, status: statusBaru }
    });
  } catch (error: any) {
    console.error('❌ Error updating cicilan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Hapus cicilan
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; cicilanId: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id, cicilanId } = await context.params;

    console.log('🗑️ Deleting cicilan:', cicilanId);

    // 1. Get cicilan data
    const { data: cicilan, error: getCicilanError } = await supabase
      .from('cicilan_penjualan')
      .select('jumlah_cicilan, kas_id, tanggal_cicilan')
      .eq('id', cicilanId)
      .single();

    if (getCicilanError) throw getCicilanError;

    const jumlah = parseFloat(cicilan.jumlah_cicilan);

    // 2. Get penjualan data
    const { data: penjualan } = await supabase
      .from('transaksi_penjualan')
      .select('total, dibayar')
      .eq('id', id)
      .single();

    if (!penjualan) throw new Error('Penjualan not found');

    const total = parseFloat(penjualan.total || '0');
    const dibayarSebelumnya = parseFloat(penjualan.dibayar || '0');
    const dibayarBaru = dibayarSebelumnya - jumlah;
    const sisaBaru = total - dibayarBaru;
    const statusBaru = sisaBaru <= 0 ? 'Lunas' : (dibayarBaru > 0 ? 'Cicil' : 'Belum Lunas');

    console.log('📊 Perhitungan:', { total, dibayarSebelumnya, jumlah, dibayarBaru, sisaBaru });

    // 3. Delete cicilan
    await supabase
      .from('cicilan_penjualan')
      .delete()
      .eq('id', cicilanId);

    // 4. Update transaksi_penjualan
    await supabase
      .from('transaksi_penjualan')
      .update({
        dibayar: dibayarBaru,
        status_pembayaran: statusBaru
      })
      .eq('id', id);

    console.log('✅ Penjualan updated');

    // 5. Update piutang (jika ada)
    const { data: piutang } = await supabase
      .from('piutang_penjualan')
      .select('*')
      .eq('penjualan_id', id)
      .single();

    if (piutang) {
      await supabase
        .from('piutang_penjualan')
        .update({
          dibayar: dibayarBaru,
          sisa: sisaBaru,
          status: statusBaru === 'Lunas' ? 'lunas' : (dibayarBaru > 0 ? 'cicil' : 'belum_lunas')
        })
        .eq('penjualan_id', id);

      console.log('✅ Piutang updated');
    }

    // 6. ✅ KAS BERKURANG (pembayaran dibatalkan)
    const { data: kas } = await supabase
      .from('kas')
      .select('saldo, nama_kas')
      .eq('id', cicilan.kas_id)
      .single();

    if (!kas) throw new Error('Kas not found');

    const saldoKasBaru = parseFloat(kas.saldo) - jumlah;
    
    console.log(`🏦 Kas ${kas.nama_kas}: ${kas.saldo} - ${jumlah} = ${saldoKasBaru}`);

    await supabase
      .from('kas')
      .update({ saldo: saldoKasBaru })
      .eq('id', cicilan.kas_id);

    // 7. Delete transaksi kas
    await supabase
      .from('transaksi_kas')
      .delete()
      .eq('kas_id', cicilan.kas_id)
      .eq('tanggal_transaksi', cicilan.tanggal_cicilan)
      .eq('kredit', jumlah)
      .ilike('keterangan', `%Cicilan penjualan #${id}%`);

    console.log('✅ Cicilan berhasil dihapus dan kas dikurangi!');

    return NextResponse.json({
      success: true,
      message: 'Cicilan berhasil dihapus',
      data: {
        kasDikurangi: jumlah,
        saldoKasBaru,
        dibayar: dibayarBaru,
        sisa: sisaBaru,
        status: statusBaru
      }
    });
  } catch (error: any) {
    console.error('❌ Error deleting cicilan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}