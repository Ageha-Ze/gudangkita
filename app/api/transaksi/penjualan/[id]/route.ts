// app/api/transaksi/penjualan/[id]/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - Detail penjualan
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;

    const { data, error } = await supabase
      .from('transaksi_penjualan')
      .select(`
        *,
        customer:customer_id (id, nama, kode_customer),
        pegawai:pegawai_id (
          id, 
          nama, 
          jabatan,
          cabang_id,
          cabang:cabang_id (
            id,
            nama_cabang,
            kode_cabang,
            alamat,
            no_telp,
            email
          )
        ),
        detail_penjualan (
          id,
          jumlah,
          harga,
          subtotal,
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

    // Fetch total cicilan for this penjualan
    const { data: cicilans } = await supabase
      .from('cicilan_penjualan')
      .select('jumlah_cicilan')
      .eq('penjualan_id', id);

    const totalCicilan = cicilans?.reduce((sum, c) => sum + parseFloat(c.jumlah_cicilan.toString()), 0) || 0;

    // Calculate totals
    const subtotal = data.detail_penjualan?.reduce((sum: number, d: any) => sum + parseFloat(d.subtotal.toString()), 0) || 0;
    const biayaOngkir = parseFloat(data.biaya_ongkir?.toString() || '0');
    const biayaPotong = parseFloat(data.biaya_potong?.toString() || '0');
    const nilaiDiskon = parseFloat(data.nilai_diskon?.toString() || '0');
    const uangMuka = parseFloat(data.uang_muka?.toString() || '0');
    const finalTotal = subtotal + biayaOngkir + biayaPotong - nilaiDiskon;
    const tagihan = finalTotal - uangMuka - totalCicilan;

    // Set status_pembayaran berdasarkan status billing dan jenis pembayaran
    let statusPembayaran = data.status_pembayaran || 'Belum Dibayar';

    if (data.status === 'pending') {
      statusPembayaran = 'Belum Dibayar';
    } else if (data.status === 'billed') {
      if (data.jenis_pembayaran === 'tunai') {
        statusPembayaran = 'Lunas';
      } else if (data.jenis_pembayaran === 'hutang') {
        if (tagihan <= 0) {
          statusPembayaran = 'Lunas';
        } else {
          statusPembayaran = 'Hutang';
        }
      }
    }

    return NextResponse.json({ 
      data: {
        ...data,
        status_pembayaran: statusPembayaran,
        calculated_totals: {
          subtotal,
          biaya_ongkir: biayaOngkir,
          biaya_potong: biayaPotong,
          nilai_diskon: nilaiDiskon,
          uang_muka: uangMuka,
          final_total: finalTotal,
          total_cicilan: totalCicilan,
          tagihan
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ✅ FIXED: DELETE - Hapus penjualan DAN kembalikan stock
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params; // ✅ FIX: Use context.params, not searchParams

    if (!id) {
      return NextResponse.json(
        { error: 'ID penjualan tidak valid' },
        { status: 400 }
      );
    }

    console.log('🗑️ DELETE PENJUALAN ID:', id);

    // ✅ Step 1: Get penjualan data lengkap
    const { data: penjualan, error: fetchError } = await supabase
      .from('transaksi_penjualan')
      .select(`
        id,
        nota_penjualan,
        tanggal,
        total,
        dibayar,
        status,
        status_pembayaran,
        status_diterima,
        jenis_pembayaran,
        kas_id,
        cabang_id,
        customer_id,
        detail_penjualan (
          id,
          produk_id,
          jumlah,
          harga,
          subtotal
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetch penjualan:', fetchError);
      return NextResponse.json(
        { error: 'Data penjualan tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log('📦 Penjualan:', penjualan.nota_penjualan);
    console.log('📊 Status:', penjualan.status);
    console.log('📊 Status Diterima:', penjualan.status_diterima);
    console.log('💰 Jenis Pembayaran:', penjualan.jenis_pembayaran);
    console.log('💵 Total:', penjualan.total);
    console.log('💵 Dibayar:', penjualan.dibayar);

    // ✅ Step 2: Validasi - Cek apakah sudah ada cicilan/pembayaran
    const { data: cicilan } = await supabase
      .from('cicilan_penjualan')
      .select('id')
      .eq('penjualan_id', id);

    if (cicilan && cicilan.length > 0) {
      return NextResponse.json(
        { error: 'Tidak bisa hapus penjualan yang sudah ada pembayaran/cicilan' },
        { status: 400 }
      );
    }

    // ✅ Step 3: KEMBALIKAN STOCK - HANYA JIKA SUDAH DITERIMA
    if (penjualan.status_diterima === 'Diterima') {
      console.log('✅ Status sudah diterima, akan kembalikan stock...');
      
      if (penjualan.detail_penjualan && penjualan.detail_penjualan.length > 0) {
        for (const detail of penjualan.detail_penjualan) {
          console.log(`  📦 Kembalikan stock produk ID ${detail.produk_id}: +${detail.jumlah}`);

          // Get current stock
          const { data: produk, error: produkError } = await supabase
            .from('produk')
            .select('stok, nama_produk, satuan')
            .eq('id', detail.produk_id)
            .single();

          if (produkError) {
            console.error(`  ❌ Error get produk ${detail.produk_id}:`, produkError);
            continue;
          }

          const stokLama = parseFloat(produk.stok?.toString() || '0');
          const jumlahKembali = parseFloat(detail.jumlah?.toString() || '0');
          const stokBaru = stokLama + jumlahKembali;

          console.log(`    ${produk.nama_produk}: ${stokLama} + ${jumlahKembali} = ${stokBaru}`);

          // Update stock produk
          const { error: updateStockError } = await supabase
            .from('produk')
            .update({ 
              stok: stokBaru,
              updated_at: new Date().toISOString()
            })
            .eq('id', detail.produk_id);

          if (updateStockError) {
            console.error(`  ❌ Error update stock:`, updateStockError);
            throw new Error(`Gagal mengembalikan stock ${produk.nama_produk}`);
          }

          // ✅ Insert stock_barang history untuk pengembalian (bukan delete!)
          await supabase
            .from('stock_barang')
            .insert({
              produk_id: detail.produk_id,
              cabang_id: penjualan.cabang_id,
              jumlah: jumlahKembali,
              tanggal: new Date().toISOString().split('T')[0],
              tipe: 'masuk',
              keterangan: `Pembatalan Penjualan - ${penjualan.nota_penjualan}`,
              hpp: 0,
              harga_jual: 0,
              persentase: 0,
            });

          console.log(`  ✅ Stock ${produk.nama_produk} dikembalikan`);
        }
      }
    } else {
      console.log('⏭️ Status belum diterima, skip pengembalian stock');
    }

    // ✅ Step 4: KEMBALIKAN UANG KE KAS - JIKA TUNAI DAN SUDAH DIBAYAR
    if (penjualan.jenis_pembayaran === 'tunai' && penjualan.status === 'billed') {
      const kasId = penjualan.kas_id;
      const jumlahDibayar = parseFloat(penjualan.dibayar?.toString() || '0');

      if (kasId && jumlahDibayar > 0) {
        console.log('💰 Kembalikan uang ke kas...');

        // Get current saldo kas
        const { data: kas, error: kasError } = await supabase
          .from('kas')
          .select('saldo, nama_kas')
          .eq('id', kasId)
          .single();

        if (kasError) {
          console.error('❌ Error get kas:', kasError);
        } else {
          const saldoLama = parseFloat(kas.saldo?.toString() || '0');
          const saldoBaru = saldoLama - jumlahDibayar;

          console.log(`  ${kas.nama_kas}: ${saldoLama} - ${jumlahDibayar} = ${saldoBaru}`);

          // Update saldo kas
          const { error: updateKasError } = await supabase
            .from('kas')
            .update({ saldo: saldoBaru })
            .eq('id', kasId);

          if (updateKasError) {
            console.error('❌ Error update kas:', updateKasError);
            throw new Error('Gagal mengembalikan uang ke kas');
          }

          // ✅ Insert transaksi_kas untuk pembatalan (bukan delete!)
          await supabase
            .from('transaksi_kas')
            .insert({
              kas_id: kasId,
              tanggal_transaksi: new Date().toISOString().split('T')[0],
              debit: jumlahDibayar,
              kredit: 0,
              keterangan: `Pembatalan Penjualan Tunai - ${penjualan.nota_penjualan}`,
            });

          console.log('  ✅ Uang dikembalikan ke kas');
        }
      }
    }

    // ✅ Step 5: HAPUS PIUTANG - JIKA HUTANG
    if (penjualan.jenis_pembayaran === 'hutang') {
      console.log('💳 Hapus piutang...');

      const { error: deletePiutangError } = await supabase
        .from('piutang_penjualan')
        .delete()
        .eq('penjualan_id', parseInt(id));

      if (deletePiutangError) {
        console.error('⚠️ Warning: Failed to delete piutang:', deletePiutangError);
      } else {
        console.log('  ✅ Piutang dihapus');
      }
    }

    // ✅ Step 6: Delete detail_penjualan
    const { error: deleteDetailError } = await supabase
      .from('detail_penjualan')
      .delete()
      .eq('penjualan_id', id);

    if (deleteDetailError) {
      console.error('❌ Error delete detail:', deleteDetailError);
      throw new Error('Gagal menghapus detail penjualan');
    }

    console.log('✅ Detail penjualan deleted');

    // ✅ Step 7: Delete transaksi_penjualan
    const { error: deletePenjualanError } = await supabase
      .from('transaksi_penjualan')
      .delete()
      .eq('id', id);

    if (deletePenjualanError) {
      console.error('❌ Error delete penjualan:', deletePenjualanError);
      throw deletePenjualanError;
    }

    console.log('✅ Penjualan deleted');

    // Build success message
    let message = 'Penjualan berhasil dibatalkan';
    if (penjualan.status_diterima === 'Diterima') {
      message += ' dan stock dikembalikan';
    }
    if (penjualan.jenis_pembayaran === 'tunai' && parseFloat(penjualan.dibayar?.toString() || '0') > 0) {
      message += ', uang dikembalikan ke kas';
    }
    if (penjualan.jenis_pembayaran === 'hutang') {
      message += ', piutang dihapus';
    }

    console.log('✅ DELETE SUKSES!');

    return NextResponse.json({
      success: true,
      message: message,
      rollback_info: {
        stock_returned: penjualan.status_diterima === 'Diterima',
        cash_returned: penjualan.jenis_pembayaran === 'tunai' && parseFloat(penjualan.dibayar?.toString() || '0') > 0,
        piutang_deleted: penjualan.jenis_pembayaran === 'hutang'
      }
    });

  } catch (error: any) {
    console.error('❌ ERROR DELETE PENJUALAN:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus penjualan' },
      { status: 500 }
    );
  }
}

// PATCH - Update penjualan
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id } = await context.params;
    const body = await request.json();

    // Cek apakah customer berubah dan perlu reset cicilan
    if (body.reset_cicilan === true && body.customer_id) {
      console.log('Reset cicilan untuk penjualan', id, '- Ganti customer');

      const { data: currentPenjualan } = await supabase
        .from('transaksi_penjualan')
        .select('customer_id, uang_muka')
        .eq('id', id)
        .single();

      if (currentPenjualan && currentPenjualan.customer_id !== body.customer_id) {
        
        const { data: cicilans } = await supabase
          .from('cicilan_penjualan')
          .select('id, jumlah_cicilan, kas_id, tanggal_cicilan')
          .eq('penjualan_id', id);

        console.log('Found', cicilans?.length || 0, 'cicilans to reset');

        if (cicilans && cicilans.length > 0) {
          for (const cicilan of cicilans) {
            if (cicilan.kas_id) {
              const { data: kas } = await supabase
                .from('kas')
                .select('*')
                .eq('id', cicilan.kas_id)
                .single();

              if (kas) {
                const kasSaldo = parseFloat(kas.saldo.toString());
                const jumlahCicilan = parseFloat(cicilan.jumlah_cicilan.toString());
                const newSaldo = kasSaldo - jumlahCicilan;

                await supabase
                  .from('kas')
                  .update({ saldo: newSaldo })
                  .eq('id', kas.id);

                console.log('Kas', kas.nama_kas, ':', kasSaldo, '-', jumlahCicilan, '=', newSaldo);

                await supabase
                  .from('transaksi_kas')
                  .insert({
                    kas_id: kas.id,
                    tanggal_transaksi: new Date().toISOString().split('T')[0],
                    debit: jumlahCicilan,
                    kredit: 0,
                    keterangan: 'Reset cicilan - Ganti customer (Penjualan ID: ' + id + ')'
                  });
              }
            }
          }

          const { error: deleteCicilanError } = await supabase
            .from('cicilan_penjualan')
            .delete()
            .eq('penjualan_id', id);

          if (deleteCicilanError) {
            console.error('Error deleting cicilans:', deleteCicilanError);
            throw deleteCicilanError;
          }

          console.log('Deleted', cicilans.length, 'cicilans');
        }

        if (currentPenjualan.uang_muka && currentPenjualan.uang_muka > 0) {
          const { data: penjualanDetail } = await supabase
            .from('transaksi_penjualan')
            .select('kas_id')
            .eq('id', id)
            .single();

          if (penjualanDetail?.kas_id) {
            const { data: kas } = await supabase
              .from('kas')
              .select('*')
              .eq('id', penjualanDetail.kas_id)
              .single();

            if (kas) {
              const kasSaldo = parseFloat(kas.saldo.toString());
              const uangMuka = parseFloat(currentPenjualan.uang_muka.toString());
              const newSaldo = kasSaldo - uangMuka;

              await supabase
                .from('kas')
                .update({ saldo: newSaldo })
                .eq('id', kas.id);

              console.log('Kas uang muka', kas.nama_kas, ':', kasSaldo, '-', uangMuka, '=', newSaldo);

              await supabase
                .from('transaksi_kas')
                .insert({
                  kas_id: kas.id,
                  tanggal_transaksi: new Date().toISOString().split('T')[0],
                  debit: uangMuka,
                  kredit: 0,
                  keterangan: 'Reset uang muka - Ganti customer (Penjualan ID: ' + id + ')'
                });
            }
          }
        }

        const { data: piutang } = await supabase
          .from('piutang_penjualan')
          .select('*')
          .eq('penjualan_id', id)
          .single();

        if (piutang) {
          await supabase
            .from('piutang_penjualan')
            .update({
              dibayar: 0,
              sisa: piutang.total_piutang,
              status: 'belum_lunas'
            })
            .eq('penjualan_id', id);

          console.log('Piutang direset: sisa =', piutang.total_piutang);
        }

        await supabase
          .from('transaksi_penjualan')
          .update({ 
            uang_muka: 0,
            status_pembayaran: 'Belum Lunas'
          })
          .eq('id', id);

        console.log('Reset cicilan selesai!');
      }
    }

    const updateData: any = {};
    
    if (body.tanggal) updateData.tanggal = body.tanggal;
    if (body.customer_id) updateData.customer_id = body.customer_id;
    if (body.pegawai_id) updateData.pegawai_id = body.pegawai_id;
    if (body.jenis_pembayaran) updateData.jenis_pembayaran = body.jenis_pembayaran;

    const { error } = await supabase
      .from('transaksi_penjualan')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    const { data: updatedPenjualan } = await supabase
      .from('transaksi_penjualan')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({ 
      message: 'Data berhasil diupdate',
      data: updatedPenjualan,
      reset_performed: body.reset_cicilan === true
    });
  } catch (error: any) {
    console.error('Error updating penjualan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}