// app/api/transaksi/konsinyasi/penjualan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET - List penjualan konsinyasi
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { searchParams } = new URL(request.url);
    const detailKonsinyasiId = searchParams.get('detail_konsinyasi_id');

    let query = supabase
      .from('penjualan_konsinyasi')
      .select(`
        *,
        detail_konsinyasi:detail_konsinyasi_id (
          id,
          konsinyasi:konsinyasi_id (
            id,
            kode_konsinyasi
          ),
          produk:produk_id (
            id,
            nama_produk
          )
        ),
        kas:kas_id (
          id,
          nama_kas
        )
      `)
      .order('tanggal_jual', { ascending: false });

    if (detailKonsinyasiId) {
      query = query.eq('detail_konsinyasi_id', detailKonsinyasiId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching penjualan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    console.log('💰 Processing penjualan konsinyasi:', body);

    // ✅ Validasi input
    if (!body.detail_konsinyasi_id || !body.jumlah_terjual || !body.harga_jual_toko) {
      return NextResponse.json(
        { error: 'Detail konsinyasi, jumlah terjual, dan harga jual wajib diisi' },
        { status: 400 }
      );
    }

    if (!body.kas_id) {
      return NextResponse.json(
        { error: 'Kas wajib dipilih' },
        { status: 400 }
      );
    }

    const jumlah = parseFloat(body.jumlah_terjual);
    const hargaJual = parseFloat(body.harga_jual_toko);

    if (jumlah <= 0) {
      return NextResponse.json(
        { error: 'Jumlah terjual harus lebih dari 0' },
        { status: 400 }
      );
    }

    // ✅ Get detail konsinyasi dengan data lengkap
    const { data: detail, error: detailError } = await supabase
      .from('detail_konsinyasi')
      .select(`
        *,
        konsinyasi:konsinyasi_id (
          id,
          kode_konsinyasi,
          cabang_id,
          status,
          cabang:cabang_id (
            id,
            nama_cabang
          )
        ),
        produk:produk_id (
          id,
          nama_produk,
          kode_produk,
          satuan,
          stok
        )
      `)
      .eq('id', body.detail_konsinyasi_id)
      .single();

    if (detailError || !detail) {
      console.error('Error fetching detail:', detailError);
      return NextResponse.json(
        { error: 'Detail konsinyasi tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log('📦 Detail konsinyasi:', {
      produk: detail.produk?.nama_produk,
      jumlah_sisa: detail.jumlah_sisa,
      harga_konsinyasi: detail.harga_konsinyasi,
      stock_produk: detail.produk?.stok
    });

    // ✅ Validasi: Cek status konsinyasi
    if (detail.konsinyasi?.status === 'selesai' || detail.konsinyasi?.status === 'dibatalkan') {
      return NextResponse.json(
        { error: `Tidak bisa catat penjualan, konsinyasi sudah ${detail.konsinyasi.status}` },
        { status: 400 }
      );
    }

    // ✅ Validasi: Jumlah tidak melebihi sisa
    if (jumlah > detail.jumlah_sisa) {
      return NextResponse.json(
        { error: `Jumlah terjual (${jumlah}) melebihi sisa barang (${detail.jumlah_sisa})` },
        { status: 400 }
      );
    }

    // ✅ Calculate financials
    const total_penjualan = jumlah * hargaJual;
    const total_nilai_kita = jumlah * parseFloat(detail.harga_konsinyasi?.toString() || '0');
    const keuntungan_toko = total_penjualan - total_nilai_kita;

    console.log('💵 Calculations:', {
      total_penjualan,
      total_nilai_kita,
      keuntungan_toko
    });

    // ✅ Validasi: Cek duplikasi penjualan di hari yang sama
    const { data: existingPenjualan } = await supabase
      .from('penjualan_konsinyasi')
      .select('id')
      .eq('detail_konsinyasi_id', body.detail_konsinyasi_id)
      .eq('tanggal_jual', body.tanggal_jual)
      .eq('jumlah_terjual', jumlah)
      .eq('harga_jual_toko', hargaJual)
      .maybeSingle();

    if (existingPenjualan) {
      console.log('⚠️ Duplicate penjualan detected');
      return NextResponse.json({
        error: 'Penjualan dengan data yang sama sudah pernah dicatat hari ini'
      }, { status: 400 });
    }

    // ✅ Step 1: Insert penjualan konsinyasi
    const { data: penjualan, error: penjualanError } = await supabase
      .from('penjualan_konsinyasi')
      .insert({
        detail_konsinyasi_id: body.detail_konsinyasi_id,
        tanggal_jual: body.tanggal_jual,
        jumlah_terjual: jumlah,
        harga_jual_toko: hargaJual,
        total_penjualan,
        total_nilai_kita,
        keuntungan_toko,
        status_pembayaran: 'Sudah Dibayar',
        kas_id: body.kas_id,
        tanggal_pembayaran: body.tanggal_pembayaran || body.tanggal_jual,
        keterangan: body.keterangan || null,
      })
      .select()
      .single();

    if (penjualanError) {
      console.error('Error inserting penjualan:', penjualanError);
      throw penjualanError;
    }

    console.log('✅ Penjualan inserted:', penjualan.id);

    // ✅ Step 2: Update detail konsinyasi
    const newJumlahTerjual = parseFloat(detail.jumlah_terjual?.toString() || '0') + jumlah;
    const newJumlahSisa = parseFloat(detail.jumlah_sisa?.toString() || '0') - jumlah;
    const newKeuntunganToko = parseFloat(detail.keuntungan_toko?.toString() || '0') + keuntungan_toko;

    console.log('📊 Updating detail:', {
      jumlah_terjual: `${detail.jumlah_terjual} → ${newJumlahTerjual}`,
      jumlah_sisa: `${detail.jumlah_sisa} → ${newJumlahSisa}`,
      keuntungan_toko: `${detail.keuntungan_toko} → ${newKeuntunganToko}`
    });

    const { error: updateDetailError } = await supabase
      .from('detail_konsinyasi')
      .update({
        jumlah_terjual: newJumlahTerjual,
        jumlah_sisa: newJumlahSisa,
        keuntungan_toko: newKeuntunganToko,
      })
      .eq('id', body.detail_konsinyasi_id);

    if (updateDetailError) {
      console.error('Error updating detail:', updateDetailError);
      // Rollback penjualan
      await supabase
        .from('penjualan_konsinyasi')
        .delete()
        .eq('id', penjualan.id);
      throw new Error('Gagal update detail konsinyasi');
    }

    console.log('✅ Detail konsinyasi updated');

    // ✅ Step 3: KURANGI STOCK PRODUK
    const currentStok = parseFloat(detail.produk?.stok?.toString() || '0');
    const newStok = currentStok - jumlah;

    console.log(`📦 Updating stock: ${detail.produk?.nama_produk}: ${currentStok} - ${jumlah} = ${newStok}`);

    if (currentStok < jumlah) {
      // Rollback
      await supabase
        .from('detail_konsinyasi')
        .update({
          jumlah_terjual: detail.jumlah_terjual,
          jumlah_sisa: detail.jumlah_sisa,
          keuntungan_toko: detail.keuntungan_toko,
        })
        .eq('id', body.detail_konsinyasi_id);
      await supabase
        .from('penjualan_konsinyasi')
        .delete()
        .eq('id', penjualan.id);
      
      return NextResponse.json({
        error: `Stock ${detail.produk?.nama_produk} tidak mencukupi! Tersedia: ${currentStok}, Dibutuhkan: ${jumlah}`
      }, { status: 400 });
    }

    const { error: updateStockError } = await supabase
      .from('produk')
      .update({ 
        stok: newStok,
        updated_at: new Date().toISOString()
      })
      .eq('id', detail.produk_id);

    if (updateStockError) {
      console.error('Error updating stock:', updateStockError);
      // Rollback detail & penjualan
      await supabase
        .from('detail_konsinyasi')
        .update({
          jumlah_terjual: detail.jumlah_terjual,
          jumlah_sisa: detail.jumlah_sisa,
          keuntungan_toko: detail.keuntungan_toko,
        })
        .eq('id', body.detail_konsinyasi_id);
      await supabase
        .from('penjualan_konsinyasi')
        .delete()
        .eq('id', penjualan.id);
      throw new Error('Gagal update stock produk');
    }

    console.log('✅ Stock reduced');

    // ✅ Step 4: Insert stock_barang history
    const { data: existingStock } = await supabase
      .from('stock_barang')
      .select('id')
      .eq('produk_id', detail.produk_id)
      .eq('cabang_id', detail.konsinyasi?.cabang_id)
      .eq('tanggal', body.tanggal_jual)
      .eq('tipe', 'keluar')
      .eq('keterangan', `Penjualan Konsinyasi #${penjualan.id}`)
      .maybeSingle();

    if (!existingStock) {
      const { error: stockBarangError } = await supabase
        .from('stock_barang')
        .insert({
          produk_id: detail.produk_id,
          cabang_id: detail.konsinyasi?.cabang_id,
          jumlah: jumlah,
          tanggal: body.tanggal_jual,
          tipe: 'keluar',
          keterangan: `Penjualan Konsinyasi #${penjualan.id}`,
          hpp: parseFloat(detail.harga_konsinyasi?.toString() || '0')
        });

      if (stockBarangError) {
        console.error('⚠️ Warning: Failed to insert stock_barang:', stockBarangError);
        // Don't rollback, stock sudah berubah
      } else {
        console.log('✅ Stock history recorded');
      }
    } else {
      console.log('⏭️ Stock history already exists');
    }

    // ✅ Step 5: Update saldo kas
    const { data: kasData, error: kasError } = await supabase
      .from('kas')
      .select('id, nama_kas, saldo')
      .eq('id', body.kas_id)
      .single();

    if (kasError || !kasData) {
      console.error('Error fetching kas:', kasError);
      // Don't rollback, penjualan sudah tercatat dan stock sudah berkurang
      return NextResponse.json({
        error: 'Penjualan tercatat tapi kas tidak ditemukan. Harap update kas manual.'
      }, { status: 500 });
    }

    const saldoLama = parseFloat(kasData.saldo?.toString() || '0');
    const saldoBaru = saldoLama + total_nilai_kita;
    
    console.log(`💰 Updating kas: ${kasData.nama_kas}: ${saldoLama} + ${total_nilai_kita} = ${saldoBaru}`);

    const { error: updateKasError } = await supabase
      .from('kas')
      .update({ 
        saldo: saldoBaru,
        updated_at: new Date().toISOString()
      })
      .eq('id', kasData.id);

    if (updateKasError) {
      console.error('Error updating kas:', updateKasError);
      // Don't rollback, penjualan & stock sudah tercatat
      return NextResponse.json({
        error: 'Penjualan tercatat dan stock berkurang, tapi gagal update kas. Harap update kas manual.'
      }, { status: 500 });
    }

    console.log('✅ Kas updated');

    // ✅ Step 6: Insert transaksi kas
    const keterangan_transaksi = `Penjualan konsinyasi ${detail.konsinyasi?.kode_konsinyasi} - ${detail.produk?.nama_produk} (${jumlah} ${detail.produk?.satuan})`;
    
    const { error: transaksiKasError } = await supabase
      .from('transaksi_kas')
      .insert({
        kas_id: body.kas_id,
        tanggal_transaksi: body.tanggal_pembayaran || body.tanggal_jual,
        kredit: total_nilai_kita,
        debit: 0,
        keterangan: keterangan_transaksi,
      });

    if (transaksiKasError) {
      console.error('⚠️ Warning: Failed to insert transaksi kas:', transaksiKasError);
      // Don't throw, saldo sudah terupdate
      console.warn('Transaksi kas gagal dicatat, tapi saldo kas sudah terupdate');
    } else {
      console.log('✅ Transaksi kas recorded');
    }

    console.log('✅ Penjualan konsinyasi completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Penjualan berhasil dicatat, stock dikurangi, dan kas diperbarui',
      data: {
        penjualan_id: penjualan.id,
        produk: detail.produk?.nama_produk,
        jumlah_terjual: jumlah,
        total_nilai_kita,
        keuntungan_toko,
        stock_info: {
          stock_before: currentStok,
          stock_after: newStok,
          reduced: jumlah
        },
        kas_info: {
          kas_id: kasData.id,
          nama_kas: kasData.nama_kas,
          jumlah_masuk: total_nilai_kita,
          saldo_sebelum: saldoLama,
          saldo_sesudah: saldoBaru,
        }
      },
    });

  } catch (error: any) {
    console.error('❌ Error creating penjualan:', error);
    return NextResponse.json({ 
      error: error.message || 'Terjadi kesalahan saat memproses penjualan' 
    }, { status: 500 });
  }
}