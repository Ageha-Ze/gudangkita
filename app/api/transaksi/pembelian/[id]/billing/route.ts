// app/api/transaksi/pembelian/[id]/billing/route.ts
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { calculatePembelianTotals } from '@/lib/transaksi/calculatePembelianTotals';

// POST - Proses billing pembelian
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await supabaseServer();
    const { id: pembelian_id } = await context.params;
    const body = await request.json();

    // Get pembelian with detail_pembelian so we can derive canonical subtotal
    const { data: pembelian, error: pembelianError } = await supabase
      .from('transaksi_pembelian')
      .select('*, detail_pembelian(id, produk_id, jumlah, harga, subtotal), cabang:cabang_id(id, nama_cabang)')
      .eq('id', pembelian_id)
      .single();

    if (pembelianError) throw pembelianError;

    const uang_muka = Number(body.uang_muka || 0);
    const biaya_kirim = Number(body.biaya_kirim || 0);
    const rekening_bayar = body.rekening_bayar || null;

    // Build preview object and compute canonical totals
    const preview = {
      ...pembelian,
      biaya_kirim,
      uang_muka,
    };

    const { subtotal, finalTotal } = calculatePembelianTotals(preview as any);

    // Update pembelian: set canonical subtotal as `total`, biaya_kirim and uang_muka
    const { error: updateError } = await supabase
      .from('transaksi_pembelian')
      .update({
        total: subtotal,
        biaya_kirim,
        uang_muka,
        rekening_bayar,
        status: 'billed',
        status_pembayaran: uang_muka >= finalTotal ? 'Lunas' : (uang_muka > 0 ? 'Cicil' : 'Belum Lunas')
      })
      .eq('id', pembelian_id);

    if (updateError) throw updateError;

    // ✅ FIFO INTEGRATION: Insert stock masuk untuk setiap item pembelian
    if (pembelian.detail_pembelian && pembelian.detail_pembelian.length > 0) {
      const cabangId = pembelian.cabang_id || pembelian.cabang?.id;
      
      if (!cabangId) {
        console.warn('Warning: cabang_id tidak ditemukan, skip FIFO insert');
      } else {
        for (const item of pembelian.detail_pembelian) {
          // Insert ke stock_movement_fifo (batch baru)
          const { error: fifoError } = await supabase
            .from('stock_movement_fifo')
            .insert({
              produk_id: item.produk_id,
              cabang_id: cabangId,
              tanggal: pembelian.tanggal,
              tipe: 'masuk',
              jumlah_awal: Number(item.jumlah),
              jumlah_sisa: Number(item.jumlah),
              hpp_per_unit: Number(item.harga),
              referensi_type: 'pembelian',
              referensi_id: Number(pembelian_id),
              keterangan: `Pembelian #${pembelian_id} - ${item.jumlah} unit @ Rp ${item.harga}`,
            });

          if (fifoError) {
            console.error('Error inserting FIFO batch:', fifoError);
          }

          // Update stock di tabel produk (untuk kompatibilitas)
          const { data: currentProduk } = await supabase
            .from('produk')
            .select('stok')
            .eq('id', item.produk_id)
            .single();

          if (currentProduk) {
            await supabase
              .from('produk')
              .update({
                stok: Number(currentProduk.stok || 0) + Number(item.jumlah),
                hpp: Number(item.harga), // Update HPP terbaru
              })
              .eq('id', item.produk_id);
          }

          // Insert ke stock_barang untuk backward compatibility
          await supabase.from('stock_barang').insert({
            produk_id: item.produk_id,
            cabang_id: cabangId,
            jumlah: Number(item.jumlah),
            tanggal: pembelian.tanggal,
            tipe: 'masuk',
            hpp: Number(item.harga),
            keterangan: `Pembelian #${pembelian_id}`,
          });
        }
      }
    }

    // 🔥 Insert uang muka ke cicilan_pembelian jika ada
    if (uang_muka > 0) {
      const { error: uangMukaError } = await supabase
        .from('cicilan_pembelian')
        .insert({
          pembelian_id: parseInt(pembelian_id),
          tanggal_cicilan: pembelian.tanggal,
          jumlah_cicilan: uang_muka,
          rekening: rekening_bayar,
          type: 'uang_muka',
          keterangan: 'Uang Muka Awal'
        });

      if (uangMukaError) throw uangMukaError;

      // 🔥 Kurangi saldo kas jika ada rekening
      if (rekening_bayar) {
        const { data: kas } = await supabase
          .from('kas')
          .select('*')
          .eq('nama_kas', rekening_bayar)
          .single();

        if (kas) {
          const kasSaldo = parseFloat(kas.saldo.toString());
          const newSaldo = kasSaldo - uang_muka;

          await supabase
            .from('kas')
            .update({ saldo: newSaldo })
            .eq('id', kas.id);

          // Insert transaksi kas (debit = keluar)
          await supabase
            .from('transaksi_kas')
            .insert({
              kas_id: kas.id,
              tanggal_transaksi: pembelian.tanggal,
              debit: uang_muka,
              kredit: 0,
              keterangan: `Uang Muka Pembelian (Nota: ${pembelian.nota_supplier})`
            });
        }
      }
    }

    // Create or upsert hutang_pembelian to reflect the billed amounts
    const totalHutang = finalTotal;
    const sisa = Math.max(0, totalHutang - uang_muka);

    // Try to upsert: if a hutang_pembelian exists for this pembelian_id, update it; otherwise insert
    const { data: existingHutang } = await supabase
      .from('hutang_pembelian')
      .select('*')
      .eq('pembelian_id', pembelian_id)
      .single();

    if (existingHutang) {
      const { error: hUpdateErr } = await supabase
        .from('hutang_pembelian')
        .update({
          total_hutang: totalHutang,
          dibayar: uang_muka,
          sisa,
          status: sisa <= 0 ? 'lunas' : 'belum_lunas'
        })
        .eq('pembelian_id', pembelian_id);

      if (hUpdateErr) throw hUpdateErr;
    } else {
      const { error: hutangError } = await supabase
        .from('hutang_pembelian')
        .insert({
          pembelian_id: parseInt(pembelian_id),
          suplier_id: body.suplier_id,
          total_hutang: totalHutang,
          dibayar: uang_muka,
          sisa,
          status: sisa <= 0 ? 'lunas' : 'belum_lunas'
        });

      if (hutangError) throw hutangError;
    }

    // Return updated pembelian row to client for immediate UI refresh
    let updatedPembelian = null;
    try {
      const { data: tp } = await supabase
        .from('transaksi_pembelian')
        .select('*, suplier(id, nama), cabang(id, nama_cabang, kode_cabang), detail_pembelian(id, jumlah, harga, subtotal)')
        .eq('id', pembelian_id)
        .single();

      updatedPembelian = tp;
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ 
      message: 'Billing berhasil, stock masuk telah dicatat dengan FIFO',
      pembelian: updatedPembelian,
      subtotal,
      finalTotal,
      uang_muka,
      biaya_kirim,
      tagihan: Math.max(0, finalTotal - uang_muka)
    });
  } catch (error: any) {
    console.error('Error billing pembelian:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}